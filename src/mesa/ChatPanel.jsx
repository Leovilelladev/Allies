import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from '../shared/supabaseClient';
import { rolarFormula, rolarD20, enviarRolagem, enviarTexto, fmtMod, MODOS } from './rolagem';

const DADOS_RAPIDOS = [4, 6, 8, 10, 12, 20, 100];

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

export default function ChatPanel({ cenaId, userId, autorNome, modoRolagem, onModoRolagem, alvo, onAplicarDano }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const listaRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    if (!cenaId) return;

    async function carregar() {
      const { data, error } = await sb
        .from('mesa_chat')
        .select('*')
        .eq('cena_id', cenaId)
        .order('criado_em', { ascending: true })
        .limit(200);
      if (!ativo) return;
      if (error) {
        console.error('Falha ao carregar chat:', error.message);
        return;
      }
      setMensagens(data ?? []);
    }
    carregar();

    const canal = sb
      .channel(`mesa-chat-${cenaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mesa_chat', filter: `cena_id=eq.${cenaId}` },
        (payload) => {
          setMensagens((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]));
        }
      )
      .subscribe();

    return () => {
      ativo = false;
      sb.removeChannel(canal);
    };
  }, [cenaId]);

  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }, [mensagens]);

  const rolarDadoRapido = useCallback(
    (faces) => {
      if (faces === 20) {
        const r = rolarD20({ modo: modoRolagem });
        enviarRolagem({
          cenaId,
          userId,
          autorNome,
          payload: { categoria: 'dado', titulo: 'd20', d20: r },
        });
        return;
      }

      const r = rolarFormula(`1d${faces}`);
      enviarRolagem({
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

      const comando = linha.match(/^\/(r|roll|rolar)\s+(.+)$/i);
      if (comando) {
        const expressao = comando[2].trim();
        // /r d20 usa o modo de vantagem/desvantagem ativo
        if (/^d20$/i.test(expressao) || /^1d20$/i.test(expressao)) {
          const r = rolarD20({ modo: modoRolagem });
          await enviarRolagem({ cenaId, userId, autorNome, payload: { categoria: 'dado', titulo: 'd20', d20: r } });
          setErro('');
          return;
        }
        const r = rolarFormula(expressao);
        if (!r) {
          setErro(`Não entendi "${expressao}". Tente 1d20, 2d6+3, d100.`);
          return;
        }
        await enviarRolagem({
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
        console.error('Falha ao enviar mensagem:', error.message);
        setErro('Falha ao enviar. Tente de novo.');
      }
    },
    [cenaId, userId, autorNome, modoRolagem]
  );

  const submeter = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    const enviado = texto;
    setTexto('');
    enviar(enviado);
  };

  return (
    <div className="chat">
      <div className="chat-lista" ref={listaRef}>
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
            <button key={f} className="dado-btn" onClick={() => rolarDadoRapido(f)}>
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
        <button className="mesa-btn mesa-btn--primario" type="submit">
          Enviar
        </button>
      </form>
    </div>
  );
}
