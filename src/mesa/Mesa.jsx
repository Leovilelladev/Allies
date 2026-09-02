import { useCallback, useEffect, useState } from 'react';
import MesaCanvas from './MesaCanvas';
import ModalNome from './ModalNome';
import { sb } from '../shared/supabaseClient';

function sincronizarUrl(campanhaId, sessaoId, cenaId) {
  const p = new URLSearchParams();
  if (campanhaId) p.set('campanha', campanhaId);
  if (sessaoId) p.set('sessao', sessaoId);
  if (cenaId) p.set('cena', cenaId);
  window.history.replaceState(null, '', `?${p.toString()}`);
}

const rotuloSessao = (s) => `S${String(s.numero).padStart(2, '0')}${s.nome ? ` · ${s.nome}` : ''}`;

export default function Mesa({ campanhaId, sessaoInicialId, onVoltarCampanha }) {
  const [status, setStatus] = useState('carregando');
  const [erro, setErro] = useState('');
  const [ehMestre, setEhMestre] = useState(false);
  const [sessoes, setSessoes] = useState([]);
  const [cenas, setCenas] = useState([]);
  const [sessaoId, setSessaoId] = useState(sessaoInicialId || null);
  const [cenaId, setCenaId] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [pedindoNome, setPedindoNome] = useState(null); // null | 'sessao' | 'mapa'

  // Carga inicial
  const carregar = useCallback(async () => {
    if (!campanhaId) {
      setStatus('sem-campanha');
      return;
    }

    let meuId = null;
    const localUser = localStorage.getItem('allies_usuario');
    if (localUser) {
      try {
        meuId = JSON.parse(localUser).id;
      } catch (e) {}
    }

    if (!meuId) {
      const { data: auth } = await sb.auth.getSession();
      if (!auth?.session) {
        setStatus('sem-sessao-auth');
        return;
      }
      meuId = auth.session.user.id;
    }

    const { data: campanha, error: erroCampanha } = await sb
      .from('campanhas')
      .select('mestre_id')
      .eq('id', campanhaId)
      .maybeSingle();

    if (erroCampanha) {
      setErro(erroCampanha.message);
      setStatus('erro');
      return;
    }
    if (!campanha) {
      setErro('Campanha não encontrada, ou você não participa dela.');
      setStatus('erro');
      return;
    }

    const souMestre = Number(campanha.mestre_id) === Number(meuId) || campanha.mestre_id === meuId;
    setEhMestre(souMestre);

    const { data: lista, error: erroSessoes } = await sb
      .from('sessoes')
      .select('*')
      .eq('campanha_id', campanhaId)
      .order('numero', { ascending: true });

    if (erroSessoes) {
      setErro(erroSessoes.message);
      setStatus('erro');
      return;
    }

    let sessoesAtuais = lista || [];

    if (!sessoesAtuais.length) {
      if (!souMestre) {
        setStatus('sem-sessoes');
        return;
      }
      const criada = await criarSessaoNoBanco(campanhaId, 1, 'Primeira sessão');
      if (!criada) {
        setStatus('sem-sessoes');
        return;
      }
      sessoesAtuais = [criada];
    }

    setSessoes(sessoesAtuais);

    const urlParams = new URLSearchParams(window.location.search);
    const sessaoDaUrl = sessaoInicialId || urlParams.get('sessao');
    const escolhida =
      sessoesAtuais.find((s) => s.id === sessaoDaUrl) || sessoesAtuais[sessoesAtuais.length - 1];
    setSessaoId(escolhida.id);
  }, [campanhaId, sessaoInicialId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Carregar cenas da sessão
  const carregarCenas = useCallback(
    async (idSessao, souMestre) => {
      const { data, error } = await sb
        .from('cenas')
        .select('*')
        .eq('sessao_id', idSessao)
        .order('criado_em', { ascending: true });

      if (error) {
        setErro(error.message);
        setStatus('erro');
        return;
      }

      let lista = data || [];
      if (!lista.length) {
        if (!souMestre) {
          setCenas([]);
          setCenaId(null);
          setStatus('sem-mapas');
          return;
        }
        const nova = await criarCenaNoBanco(campanhaId, idSessao, 'Mapa 1');
        if (!nova) {
          setStatus('sem-mapas');
          return;
        }
        lista = [nova];
      }

      setCenas(lista);
      const urlParams = new URLSearchParams(window.location.search);
      const cenaDaUrl = urlParams.get('cena');
      const escolhida = lista.find((c) => c.id === cenaDaUrl) || lista[0];
      setCenaId(escolhida.id);
      setStatus('pronto');
    },
    [campanhaId]
  );

  useEffect(() => {
    if (!sessaoId) return;
    carregarCenas(sessaoId, ehMestre);
  }, [sessaoId, ehMestre, carregarCenas]);

  // Sincroniza a URL
  useEffect(() => {
    if (status === 'pronto') {
      sincronizarUrl(campanhaId, sessaoId, cenaId);
    }
  }, [status, campanhaId, sessaoId, cenaId]);

  // Assinaturas Realtime
  useEffect(() => {
    if (!campanhaId) return;
    const canal = sb
      .channel(`mesa-sessoes-${campanhaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessoes', filter: `campanha_id=eq.${campanhaId}` },
        (payload) => {
          setSessoes((prev) => {
            if (payload.eventType === 'DELETE') return prev.filter((s) => s.id !== payload.old.id);
            const sem = prev.filter((s) => s.id !== payload.new.id);
            return [...sem, payload.new].sort((a, b) => a.numero - b.numero);
          });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(canal);
    };
  }, [campanhaId]);

  useEffect(() => {
    if (!sessaoId) return;
    const canal = sb
      .channel(`mesa-cenas-${sessaoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cenas', filter: `sessao_id=eq.${sessaoId}` },
        (payload) => {
          setCenas((prev) => {
            if (payload.eventType === 'DELETE') return prev.filter((c) => c.id !== payload.old.id);
            const sem = prev.filter((c) => c.id !== payload.new.id);
            return [...sem, payload.new].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
          });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(canal);
    };
  }, [sessaoId]);

  // Ações do mestre: criar sessão / mapa
  const confirmarNome = async (nome) => {
    const alvo = pedindoNome;
    setPedindoNome(null);
    setOcupado(true);

    if (alvo === 'sessao') {
      const numero = sessoes.length ? Math.max(...sessoes.map((s) => s.numero)) + 1 : 1;
      const criada = await criarSessaoNoBanco(campanhaId, numero, nome.trim());
      if (criada) {
        setSessoes((prev) =>
          [...prev.filter((s) => s.id !== criada.id), criada].sort((a, b) => a.numero - b.numero)
        );
        setCenaId(null);
        setSessaoId(criada.id);
      }
    } else {
      const rotulo = nome.trim() || `Mapa ${cenas.length + 1}`;
      const nova = await criarCenaNoBanco(campanhaId, sessaoId, rotulo);
      if (nova) {
        setCenas((prev) => [...prev.filter((c) => c.id !== nova.id), nova]);
        setCenaId(nova.id);
      }
    }
    setOcupado(false);
  };

  if (status === 'carregando') {
    return (
      <div className="mesa-root">
        <div className="mesa-msg-central">
          <p>Carregando a mesa…</p>
        </div>
      </div>
    );
  }

  if (status === 'sem-campanha') {
    return (
      <div className="mesa-root">
        <div className="mesa-msg-central">
          <p>Abra a Mesa Virtual a partir de uma campanha.</p>
          <button className="mesa-btn" onClick={onVoltarCampanha} style={{ marginTop: '16px' }}>
            Ir para o Hub
          </button>
        </div>
      </div>
    );
  }

  if (status === 'erro') {
    return (
      <div className="mesa-root">
        <div className="mesa-msg-central">
          <p>{erro}</p>
          <button className="mesa-btn" onClick={onVoltarCampanha} style={{ marginTop: '16px' }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (status === 'sem-sessoes') {
    return (
      <div className="mesa-root">
        <div className="mesa-msg-central">
          <p>O mestre ainda não abriu nenhuma sessão nessa campanha.</p>
          <button className="mesa-btn" onClick={onVoltarCampanha} style={{ marginTop: '16px' }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (status === 'sem-mapas') {
    return (
      <div className="mesa-root">
        <div className="mesa-msg-central">
          <p>Essa sessão ainda não tem mapa. Peça pro mestre criar o primeiro.</p>
          <button className="mesa-btn" onClick={onVoltarCampanha} style={{ marginTop: '16px' }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const seletor = (
    <>
      <select
        className="mesa-select"
        value={sessaoId || ''}
        onChange={(e) => {
          setCenaId(null);
          setSessaoId(e.target.value);
        }}
        title="Sessão"
      >
        {sessoes.map((s) => (
          <option key={s.id} value={s.id}>
            {rotuloSessao(s)}
          </option>
        ))}
      </select>
      <select
        className="mesa-select"
        value={cenaId || ''}
        onChange={(e) => setCenaId(e.target.value)}
        title="Mapa"
      >
        {cenas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome || 'Mapa'}
          </option>
        ))}
      </select>
      {ehMestre && (
        <>
          <button
            className="mesa-btn"
            onClick={() => setPedindoNome('sessao')}
            disabled={ocupado}
            title="Abrir uma sessão nova"
          >
            + Sessão
          </button>
          <button
            className="mesa-btn"
            onClick={() => setPedindoNome('mapa')}
            disabled={ocupado}
            title="Novo mapa nesta sessão"
          >
            + Mapa
          </button>
        </>
      )}
    </>
  );

  const proximoNumero = sessoes.length ? Math.max(...sessoes.map((s) => s.numero)) + 1 : 1;

  return (
    <div className="mesa-root">
      <MesaCanvas
        key={cenaId}
        cenaId={cenaId}
        campanhaId={campanhaId}
        seletor={seletor}
        onVoltarCampanha={onVoltarCampanha}
      />
      {pedindoNome && (
        <ModalNome
          titulo={
            pedindoNome === 'sessao'
              ? `Nova sessão · S${String(proximoNumero).padStart(2, '0')}`
              : 'Novo mapa'
          }
          rotulo={pedindoNome === 'sessao' ? 'Nome do episódio' : 'Nome do mapa'}
          valorInicial={pedindoNome === 'sessao' ? '' : `Mapa ${cenas.length + 1}`}
          onConfirmar={confirmarNome}
          onCancelar={() => setPedindoNome(null)}
        />
      )}
    </div>
  );
}

async function criarSessaoNoBanco(campanhaId, numero, nome) {
  const { data, error } = await sb
    .from('sessoes')
    .insert({ campanha_id: campanhaId, numero, nome })
    .select()
    .single();
  if (!error) return data;
  if (error.code === '23505') {
    const { data: existente } = await sb
      .from('sessoes')
      .select('*')
      .eq('campanha_id', campanhaId)
      .eq('numero', numero)
      .maybeSingle();
    if (existente) return existente;
  }
  return null;
}

async function criarCenaNoBanco(campanhaId, sessaoId, nome) {
  const { data, error } = await sb
    .from('cenas')
    .insert({ campanha_id: campanhaId, sessao_id: sessaoId, nome })
    .select()
    .single();
  return error ? null : data;
}
