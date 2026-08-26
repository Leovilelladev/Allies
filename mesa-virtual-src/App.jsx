import { useCallback, useEffect, useState } from 'react';
import MesaCanvas from './MesaCanvas';
import { sb } from './supabaseClient';

function paramUrl(nome) {
  return new URLSearchParams(window.location.search).get(nome);
}

// Mantém a URL em dia sem recarregar, pra F5 cair na mesma sessão/mapa.
function sincronizarUrl(campanhaId, sessaoId, cenaId) {
  const p = new URLSearchParams();
  if (campanhaId) p.set('campanha', campanhaId);
  if (sessaoId) p.set('sessao', sessaoId);
  if (cenaId) p.set('cena', cenaId);
  window.history.replaceState(null, '', `?${p.toString()}`);
}

const rotuloSessao = (s) => `S${String(s.numero).padStart(2, '0')}${s.nome ? ` · ${s.nome}` : ''}`;

export default function App() {
  // carregando | sem-campanha | sem-sessao-auth | sem-sessoes | sem-mapas | erro | pronto
  const [status, setStatus] = useState('carregando');
  const [erro, setErro] = useState('');
  const [campanhaId] = useState(() => paramUrl('campanha'));

  const [ehMestre, setEhMestre] = useState(false);
  const [sessoes, setSessoes] = useState([]);
  const [cenas, setCenas] = useState([]);
  const [sessaoId, setSessaoId] = useState(null);
  const [cenaId, setCenaId] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  // ---- carga inicial: quem sou eu, quais sessões existem ----
  const carregar = useCallback(async () => {
    if (!campanhaId) { setStatus('sem-campanha'); return; }

    const { data: auth } = await sb.auth.getSession();
    if (!auth?.session) { setStatus('sem-sessao-auth'); return; }
    const meuId = auth.session.user.id;

    const { data: campanha, error: erroCampanha } = await sb
      .from('campanhas').select('mestre_id').eq('id', campanhaId).maybeSingle();
    if (erroCampanha) { setErro(erroCampanha.message); setStatus('erro'); return; }
    if (!campanha) {
      setErro('Campanha não encontrada, ou você não participa dela.');
      setStatus('erro');
      return;
    }
    const souMestre = campanha.mestre_id === meuId;
    setEhMestre(souMestre);

    const { data: lista, error: erroSessoes } = await sb
      .from('sessoes').select('*').eq('campanha_id', campanhaId).order('numero', { ascending: true });
    if (erroSessoes) { setErro(erroSessoes.message); setStatus('erro'); return; }

    let sessoesAtuais = lista || [];

    // Campanha nova: o mestre cai direto numa S01 utilizável em vez de numa tela vazia.
    if (!sessoesAtuais.length) {
      if (!souMestre) { setStatus('sem-sessoes'); return; }
      const criada = await criarSessaoNoBanco(campanhaId, 1, 'Primeira sessão');
      if (!criada) { setStatus('sem-sessoes'); return; }
      sessoesAtuais = [criada];
    }

    setSessoes(sessoesAtuais);

    const daUrl = paramUrl('sessao');
    const escolhida = sessoesAtuais.find(s => s.id === daUrl) || sessoesAtuais[sessoesAtuais.length - 1];
    setSessaoId(escolhida.id);
  }, [campanhaId]);

  useEffect(() => { carregar(); }, [carregar]);

  // ---- mapas da sessão escolhida ----
  const carregarCenas = useCallback(async (idSessao, souMestre) => {
    const { data, error } = await sb
      .from('cenas').select('*').eq('sessao_id', idSessao).order('criado_em', { ascending: true });
    if (error) { setErro(error.message); setStatus('erro'); return; }

    let lista = data || [];
    if (!lista.length) {
      if (!souMestre) { setCenas([]); setCenaId(null); setStatus('sem-mapas'); return; }
      const nova = await criarCenaNoBanco(campanhaId, idSessao, 'Mapa 1');
      if (!nova) { setStatus('sem-mapas'); return; }
      lista = [nova];
    }

    setCenas(lista);
    const daUrl = paramUrl('cena');
    const escolhida = lista.find(c => c.id === daUrl) || lista[0];
    setCenaId(escolhida.id);
    setStatus('pronto');
  }, [campanhaId]);

  useEffect(() => {
    if (!sessaoId) return;
    carregarCenas(sessaoId, ehMestre);
  }, [sessaoId, ehMestre, carregarCenas]);

  useEffect(() => {
    if (status === 'pronto') sincronizarUrl(campanhaId, sessaoId, cenaId);
  }, [status, campanhaId, sessaoId, cenaId]);

  // ---- tempo real: jogador vê a sessão/mapa que o mestre acabou de abrir ----
  useEffect(() => {
    if (!campanhaId) return;
    const canal = sb
      .channel(`mesa-sessoes-${campanhaId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sessoes', filter: `campanha_id=eq.${campanhaId}` },
        (payload) => {
          setSessoes((prev) => {
            if (payload.eventType === 'DELETE') return prev.filter(s => s.id !== payload.old.id);
            const sem = prev.filter(s => s.id !== payload.new.id);
            return [...sem, payload.new].sort((a, b) => a.numero - b.numero);
          });
        })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [campanhaId]);

  useEffect(() => {
    if (!sessaoId) return;
    const canal = sb
      .channel(`mesa-cenas-${sessaoId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'cenas', filter: `sessao_id=eq.${sessaoId}` },
        (payload) => {
          setCenas((prev) => {
            if (payload.eventType === 'DELETE') return prev.filter(c => c.id !== payload.old.id);
            const sem = prev.filter(c => c.id !== payload.new.id);
            return [...sem, payload.new].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
          });
        })
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [sessaoId]);

  // ---- ações do mestre ----
  // Nada de window.prompt: diálogo nativo não aparece no navegador embutido do VS Code.
  const [pedindoNome, setPedindoNome] = useState(null); // null | 'sessao' | 'mapa'

  async function confirmarNome(nome) {
    const alvo = pedindoNome;
    setPedindoNome(null);
    setOcupado(true);
    if (alvo === 'sessao') {
      const numero = sessoes.length ? Math.max(...sessoes.map(s => s.numero)) + 1 : 1;
      const criada = await criarSessaoNoBanco(campanhaId, numero, nome.trim());
      if (criada) {
        setSessoes((prev) => [...prev.filter(s => s.id !== criada.id), criada].sort((a, b) => a.numero - b.numero));
        setCenaId(null);
        setSessaoId(criada.id);
      }
    } else {
      const rotulo = nome.trim() || `Mapa ${cenas.length + 1}`;
      const nova = await criarCenaNoBanco(campanhaId, sessaoId, rotulo);
      if (nova) {
        setCenas((prev) => [...prev.filter(c => c.id !== nova.id), nova]);
        setCenaId(nova.id);
      }
    }
    setOcupado(false);
  }

  if (status === 'carregando') return <MensagemCentral texto="Carregando a mesa…" />;
  if (status === 'sem-campanha') {
    return <MensagemCentral texto="Abra a Mesa Virtual a partir de uma campanha (falta o parâmetro ?campanha=... na URL)." />;
  }
  if (status === 'sem-sessao-auth') return <TelaLogin onEntrar={carregar} />;
  if (status === 'erro') return <MensagemCentral texto={erro} />;
  if (status === 'sem-sessoes') {
    return <MensagemCentral texto="O mestre ainda não abriu nenhuma sessão nessa campanha." />;
  }
  if (status === 'sem-mapas') {
    return <MensagemCentral texto="Essa sessão ainda não tem mapa. Peça pro mestre criar o primeiro." />;
  }

  const seletor = (
    <>
      <select
        className="mesa-select"
        value={sessaoId || ''}
        onChange={(e) => { setCenaId(null); setSessaoId(e.target.value); }}
        title="Sessão"
      >
        {sessoes.map(s => <option key={s.id} value={s.id}>{rotuloSessao(s)}</option>)}
      </select>
      <select
        className="mesa-select"
        value={cenaId || ''}
        onChange={(e) => setCenaId(e.target.value)}
        title="Mapa"
      >
        {cenas.map(c => <option key={c.id} value={c.id}>{c.nome || 'Mapa'}</option>)}
      </select>
      {ehMestre && (
        <>
          <button className="mesa-btn" onClick={() => setPedindoNome('sessao')} disabled={ocupado} title="Abrir uma sessão nova">
            + Sessão
          </button>
          <button className="mesa-btn" onClick={() => setPedindoNome('mapa')} disabled={ocupado} title="Novo mapa nesta sessão">
            + Mapa
          </button>
        </>
      )}
    </>
  );

  const proximoNumero = sessoes.length ? Math.max(...sessoes.map(s => s.numero)) + 1 : 1;

  // key força remontar ao trocar de mapa: cada cena tem tokens, chat, iniciativa e
  // névoa próprios, e remontar evita herdar estado da cena anterior.
  return (
    <>
      <MesaCanvas
        key={cenaId}
        cenaId={cenaId}
        campanhaId={campanhaId}
        seletor={seletor}
      />
      {pedindoNome && (
        <ModalNome
          titulo={pedindoNome === 'sessao'
            ? `Nova sessão · S${String(proximoNumero).padStart(2, '0')}`
            : 'Novo mapa'}
          rotulo={pedindoNome === 'sessao' ? 'Nome do episódio' : 'Nome do mapa'}
          valorInicial={pedindoNome === 'sessao' ? '' : `Mapa ${cenas.length + 1}`}
          onConfirmar={confirmarNome}
          onCancelar={() => setPedindoNome(null)}
        />
      )}
    </>
  );
}

function ModalNome({ titulo, rotulo, valorInicial, onConfirmar, onCancelar }) {
  const [valor, setValor] = useState(valorInicial);
  return (
    <div className="mesa-modal-fundo" onClick={(e) => { if (e.target === e.currentTarget) onCancelar(); }}>
      <form
        className="mesa-modal"
        onSubmit={(e) => { e.preventDefault(); onConfirmar(valor); }}
      >
        <h2>{titulo}</h2>
        <label>
          {rotulo}
          <input value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
        </label>
        <div className="mesa-modal-acoes">
          <button className="mesa-btn mesa-btn--ativo" type="submit">Criar</button>
          <button className="mesa-btn" type="button" onClick={onCancelar}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}

// Insere tratando 23505 (corrida entre abas / StrictMode) relendo o registro que ganhou.
async function criarSessaoNoBanco(campanhaId, numero, nome) {
  const { data, error } = await sb
    .from('sessoes').insert({ campanha_id: campanhaId, numero, nome }).select().single();
  if (!error) return data;
  if (error.code === '23505') {
    const { data: existente } = await sb
      .from('sessoes').select('*').eq('campanha_id', campanhaId).eq('numero', numero).maybeSingle();
    if (existente) return existente;
  }
  return null;
}

async function criarCenaNoBanco(campanhaId, sessaoId, nome) {
  const { data, error } = await sb
    .from('cenas').insert({ campanha_id: campanhaId, sessao_id: sessaoId, nome }).select().single();
  return error ? null : data;
}

function MensagemCentral({ texto }) {
  return (
    <div className="mesa-msg-central">
      <p>{texto}</p>
    </div>
  );
}

// Login próprio, só pra quando a Mesa Virtual for aberta separada do site principal
// (dev local em outra porta, por exemplo) — em produção, no mesmo domínio, a sessão
// do site principal já chega compartilhada e essa tela nem aparece.
function TelaLogin({ onEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    const usuarioLimpo = usuario.trim().toLowerCase();
    if (!usuarioLimpo || !senha) {
      setErro('Preenche usuário e senha.');
      return;
    }
    setCarregando(true);
    const { error } = await sb.auth.signInWithPassword({
      email: `${usuarioLimpo}@allies.local`,
      password: senha,
    });
    setCarregando(false);
    if (error) {
      setErro('Usuário ou senha inválidos.');
      return;
    }
    onEntrar();
  }

  return (
    <div className="mesa-msg-central">
      <form className="mesa-login" onSubmit={handleSubmit}>
        <h1>Allies <small>Mesa Virtual</small></h1>
        <label>
          Usuário
          <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
        </label>
        <label>
          Senha
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <p className="mesa-login-erro">{erro}</p>}
        <button className="mesa-btn" type="submit" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
