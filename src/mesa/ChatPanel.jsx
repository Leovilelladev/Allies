import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '../shared/supabaseClient';
import { rolarFormula, rolarD20, enviarRolagem, enviarTexto, fmtMod, MODOS } from './rolagem';
import { anunciarRolagem3D } from './diceEvents';
import { mesclarMensagens } from './chatHistorico';

const DADOS_RAPIDOS = [4, 6, 8, 10, 12, 20, 100];
async function publicarRolagem(args) {
  const { error } = await enviarRolagem(args);
  if (error) throw error;
}

// Um card de rolagem no chat
function CardRolagem({ r, alvo, onAplicarDano }) {
  if (!r) return null;
  const d20 = r.d20;
  const estado = d20?.critico ? 'critico' : d20?.falha ? 'falha' : '';

  return (
    <div className={`rolagem ${estado ? `is-${estado}` : ''}`}>
      <div className="rolagem-cabecalho">
        <span className="rolagem-titulo">{r.titulo}</span>
        {r.subtitulo && <span className="rolagem-subtitulo">{r.subtitulo}</span>}
      </div>

      {d20 && (
        <div className="rolagem-linha">
          <span className="rolagem-total">{d20.total}</span>
          <span className="rolagem-conta">
            {d20.valores.map((v, i) => (
              <em key={i} className={v === d20.escolhido && d20.valores.length > 1 ? 'is-escolhido' : v === d20.escolhido ? '' : 'is-descartado'}>
                {v}
              </em>
            ))}
            {d20.bonus !== 0 && <span className="rolagem-bonus">{fmtMod(d20.bonus)}</span>}
            {d20.modo && d20.modo !== MODOS.NORMAL && (
              <span className="rolagem-etiqueta">{d20.modo === MODOS.VANTAGEM ? 'vantagem' : 'desvantagem'}</span>
            )}
          </span>
        </div>
      )}

      {r.dados && (
        <div className="rolagem-linha">
          <span className="rolagem-total">{r.dados.total}</span>
          <span className="rolagem-conta">
            <span className="rolagem-formula">{r.dados.formula}</span>
            <span className="rolagem-detalhe">{r.dados.detalhe}</span>
          </span>
        </div>
      )}

      {r.magia && (r.magia.concentracao || r.magia.duracao || r.magia.descricao) && (
        <div className="rolagem-magia">
          <span className="rolagem-magia-topo">
            {r.magia.concentracao && <b>concentração</b>}
            {r.magia.duracao && <span>{r.magia.duracao}</span>}
          </span>
          {r.magia.descricao && <p className="rolagem-item-desc">{r.magia.descricao}</p>}
        </div>
      )}

      {r.item && (
        <div className="rolagem-item">
          <span className="rolagem-item-topo">
            <em>{r.item.qtd}×</em>
            <span>{r.item.tipo}</span>
            {r.item.equipado && <b>equipado</b>}
            {r.item.peso > 0 && <span>{Number(r.item.peso).toFixed(2)} kg</span>}
          </span>
          {r.item.descricao && <p className="rolagem-item-desc">{r.item.descricao}</p>}
        </div>
      )}

      {r.dano && (
        <div className="rolagem-dano">
          <span className="rolagem-dano-valor">{r.dano.total}</span>
          <span className="rolagem-dano-info">
            dano {r.dano.tipo ? `· ${r.dano.tipo}` : ''} <em>{r.dano.detalhe}</em>
          </span>
          {alvo && onAplicarDano && alvo.pvTotal > 0 && (
            <span className="rolagem-aplicar">
              <button onClick={() => onAplicarDano(alvo.id, r.dano.total)} title={`Tira ${r.dano.total} PV de ${alvo.label}`}>
                aplicar
              </button>
              <button
                onClick={() => onAplicarDano(alvo.id, Math.floor(r.dano.total / 2))}
                title="Metade do dano (resistência ou salvaguarda passada)"
              >
                metade
              </button>
            </span>
          )}
        </div>
      )}

      {r.cd && (
        <div className="rolagem-cd">
          CD {r.cd.valor} · salvaguarda de {r.cd.atributo}
        </div>
      )}

      {d20?.critico && <div className="rolagem-selo">Acerto crítico</div>}
      {d20?.falha && <div className="rolagem-selo is-falha">Falha crítica</div>}
    </div>
  );
}

export default function ChatPanel({ cenaId, userId, autorNome, ehMestre, modoRolagem, onModoRolagem, alvo, onAplicarDano }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const envioRef = useRef(false);
  const listaRef = useRef(null);
  const [maisAntigas, setMaisAntigas] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const geracaoRef = useRef(0);
  const rolarFimRef = useRef(true);
  const paginaRef = useRef(false);

  useEffect(() => {
    let ativo = true;
    geracaoRef.current += 1;
    setMensagens([]);
    setCarregando(false);
    setMaisAntigas(false);
    setErro('');
    rolarFimRef.current = true;
    if (!cenaId) return;

    async function carregar() {
      const { data, error } = await sb
        .from('mesa_chat')
        .select('*')
        .eq('cena_id', cenaId)
        .order('criado_em', { ascending: false })
        .order('id', { ascending: false })
        .limit(200);
      if (!ativo) return;
      if (error) {
        setErro('Falha ao carregar o histórico. Reabra a aba para tentar novamente.');
        return;
      }
      setMensagens(prev => mesclarMensagens(prev, data ?? []));
      setMaisAntigas(data?.length === 200);
    }
    carregar();

    const canal = sb
      .channel(`mesa-chat-${cenaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mesa_chat', filter: `cena_id=eq.${cenaId}` },
        (payload) => {
          if (ativo) setMensagens(prev => mesclarMensagens(prev, [payload.new]));
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      geracaoRef.current += 1;
      sb.removeChannel(canal);
    };
  }, [cenaId]);

  useEffect(() => {
    if (listaRef.current && rolarFimRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }, [mensagens]);

  const carregarAnteriores = async () => {
    const primeira = mensagens[0];
    if (!primeira || paginaRef.current) return;
    const geracao = geracaoRef.current;
    paginaRef.current = true; setCarregando(true);
    const el = listaRef.current;
    const altura = el?.scrollHeight || 0;
    const topo = el?.scrollTop || 0;
    rolarFimRef.current = false;
    try {
      const { data, error } = await sb.from('mesa_chat').select('*').eq('cena_id', cenaId)
        .or(`criado_em.lt.${primeira.criado_em},and(criado_em.eq.${primeira.criado_em},id.lt.${primeira.id})`)
        .order('criado_em', { ascending: false }).order('id', { ascending: false }).limit(200);
      if (geracao !== geracaoRef.current) return;
      if (error) { setErro('Não foi possível carregar mensagens anteriores.'); return; }
      setMensagens(prev => mesclarMensagens(prev, data || []));
      setMaisAntigas(data?.length === 200);
      requestAnimationFrame(() => {
        if (geracao === geracaoRef.current && el) el.scrollTop = topo + el.scrollHeight - altura;
      });
    } catch { if (geracao === geracaoRef.current) setErro('Falha de conexão ao carregar histórico.'); }
    finally { paginaRef.current = false; if (geracao === geracaoRef.current) setCarregando(false); }
  };

  const rolarDadoRapido = useCallback(
    async (faces) => {
      if (faces === 20) {
        const r = rolarD20({ modo: modoRolagem });
        await publicarRolagem({
          cenaId,
          userId,
          autorNome,
          payload: { categoria: 'dado', titulo: 'd20', d20: r },
        });
        return;
      }

      const r = rolarFormula(`1d${faces}`);
      await publicarRolagem({
        cenaId,
        userId,
        autorNome,
        payload: { categoria: 'dado', titulo: `d${faces}`, dados: r },
      });
    },
    [cenaId, userId, autorNome, modoRolagem]
  );

  const enviar = useCallback(
    async (linhaCrua) => {
      const linha = linhaCrua.trim();
      if (!linha) return;

      const comandoSecreto = linha.match(/^\/gmroll\s+(.+)$/i);
      if (comandoSecreto) {
        if (!ehMestre) {
          setErro('Apenas o Mestre pode fazer uma rolagem secreta.');
          return false;
        }
        const expressao = comandoSecreto[1].trim();
        const r = rolarFormula(expressao);
        if (!r) {
          setErro(`Não entendi "${expressao}". Tente /gmroll 1d20.`);
          return false;
        }
        anunciarRolagem3D({ categoria: 'dado', titulo: `Secreto · ${expressao}`, dados: r, secreta: true });
        setErro('');
        return;
      }

      const comando = linha.match(/^\/(r|roll|rolar)\s+(.+)$/i);
      if (comando) {
        const expressao = comando[2].trim();
        // /r d20 usa o modo de vantagem/desvantagem ativo
        if (/^d20$/i.test(expressao) || /^1d20$/i.test(expressao)) {
          const r = rolarD20({ modo: modoRolagem });
          await publicarRolagem({ cenaId, userId, autorNome, payload: { categoria: 'dado', titulo: 'd20', d20: r } });
          setErro('');
          return;
        }
        const r = rolarFormula(expressao);
        if (!r) {
          setErro(`Não entendi "${expressao}". Tente 1d20, 2d6+3, d100.`);
          return false;
        }
        await publicarRolagem({
          cenaId,
          userId,
          autorNome,
          payload: { categoria: 'dado', titulo: expressao, dados: r },
        });
        setErro('');
        return;
      }

      setErro('');
      const { error } = await enviarTexto({ cenaId, userId, autorNome, texto: linha });
      if (error) {
        throw error;
      }
    },
    [cenaId, userId, autorNome, ehMestre, modoRolagem]
  );

  const submeter = async (e) => {
    e.preventDefault();
    if (!texto.trim() || envioRef.current) return;
    const enviado = texto;
    envioRef.current = true; setEnviando(true);
    const geracao = geracaoRef.current;
    try {
      const resultado = await enviar(enviado);
      if (resultado !== false && geracao === geracaoRef.current) setTexto(atual => atual === enviado ? '' : atual);
    } catch {
      if (geracao === geracaoRef.current) setErro('Não foi possível confirmar o envio. O texto foi mantido; confira o chat antes de tentar novamente.');
    } finally { envioRef.current = false; setEnviando(false); }
  };

  return (
    <div className="chat">
      <div className="chat-lista" ref={listaRef} onScroll={e => {
        const el = e.currentTarget;
        rolarFimRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}>
        {maisAntigas && <button className="mesa-btn" disabled={carregando} onClick={carregarAnteriores}>
          {carregando ? 'Carregando…' : 'Carregar mensagens anteriores'}
        </button>}
        {mensagens.length === 0 && (
          <div className="dock-vazio">Nada por aqui ainda. Role um dado ou mande uma mensagem.</div>
        )}
        {mensagens.map((m) => (
          <div key={m.id} className={`chat-msg ${m.tipo === 'rolagem' ? 'chat-msg--rolagem' : ''}`}>
            <span className="chat-autor">{m.autor_nome}</span>
            {m.tipo === 'rolagem' && m.rolagem ? (
              <CardRolagem r={m.rolagem} alvo={alvo} onAplicarDano={onAplicarDano} />
            ) : (
              <span className="chat-texto">{m.texto}</span>
            )}
          </div>
        ))}
      </div>

      {alvo && alvo.pvTotal > 0 && (
        <div className="chat-alvo">
          Alvo: <b>{alvo.label}</b> · {alvo.pvAtual}/{alvo.pvTotal} PV
        </div>
      )}

      <div className="dados-bandeja">
        <div className="dados-modos">
          {[
            { id: MODOS.DESVANTAGEM, rotulo: 'Desv.' },
            { id: MODOS.NORMAL, rotulo: 'Normal' },
            { id: MODOS.VANTAGEM, rotulo: 'Vant.' },
          ].map((m) => (
            <button
              key={m.id}
              className={`ficha-modo-btn ${modoRolagem === m.id ? 'is-ativo' : ''}`}
              onClick={() => onModoRolagem(m.id)}
              title="Aplica em d20 rolados na ficha e em /r d20"
            >
              {m.rotulo}
            </button>
          ))}
        </div>
        <div className="dados-botoes">
          {DADOS_RAPIDOS.map((f) => (
            <button key={f} className="dado-btn" onClick={() => rolarDadoRapido(f).catch(() => setErro('Não foi possível confirmar a rolagem. Confira o chat antes de tentar novamente.'))}>
              d{f}
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="chat-erro">{erro}</div>}

      <form className="chat-form" onSubmit={submeter}>
        <input
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            if (erro) setErro('');
          }}
          placeholder="Mensagem ou /r 2d6+3"
        />
        <button className="mesa-btn mesa-btn--primario" type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
