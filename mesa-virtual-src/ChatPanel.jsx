import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from './supabaseClient';
import { parseDado, rolarDado, formatarRolagem } from './dados';

export default function ChatPanel({ cenaId, userId, autorNome }) {
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

  // Rola sempre pra última mensagem
  useEffect(() => {
    if (listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [mensagens]);

  const enviarMensagem = useCallback(
    async (linhaCrua) => {
      const linha = linhaCrua.trim();
      if (!linha || !cenaId || !userId) return;

      const comandoRolagem = linha.match(/^\/r(?:oll)?\s+(.+)$/i);
      let novaMensagem;

      if (comandoRolagem) {
        const expressao = comandoRolagem[1].trim();
        const dado = parseDado(expressao);
        if (!dado) {
          setErro(`Não entendi "${expressao}". Use algo como 1d20, 2d6+3, d100.`);
          return;
        }
        const rolagem = rolarDado(dado);
        novaMensagem = {
          cena_id: cenaId,
          usuario_id: userId,
          autor_nome: autorNome,
          tipo: 'rolagem',
          texto: formatarRolagem(expressao, rolagem),
          rolagem: { expressao, ...rolagem },
        };
      } else {
        novaMensagem = {
          cena_id: cenaId,
          usuario_id: userId,
          autor_nome: autorNome,
          tipo: 'chat',
          texto: linha,
        };
      }

      setErro('');
      setTexto('');
      const { error } = await sb.from('mesa_chat').insert(novaMensagem);
      if (error) {
        console.error('Falha ao enviar mensagem:', error.message);
        setErro('Não consegui enviar. Tenta de novo.');
      }
    },
    [cenaId, userId, autorNome]
  );

  function handleSubmit(e) {
    e.preventDefault();
    enviarMensagem(texto);
  }

  return (
    <div className="mesa-chat">
      <div className="mesa-chat-lista" ref={listaRef}>
        {mensagens.length === 0 && <p className="mesa-chat-vazio">Nenhuma mensagem ainda. Manda um "/r 1d20" pra testar.</p>}
        {mensagens.map((m) => (
          <div key={m.id} className={`mesa-chat-msg ${m.tipo === 'rolagem' ? 'mesa-chat-msg--rolagem' : ''}`}>
            <span className="mesa-chat-autor">{m.autor_nome}</span>
            <span className="mesa-chat-texto">{m.texto}</span>
          </div>
        ))}
      </div>
      <form className="mesa-chat-form" onSubmit={handleSubmit}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Mensagem ou /r 1d20+5…"
        />
        <button className="mesa-btn" type="submit">Enviar</button>
      </form>
      {erro && <p className="mesa-chat-erro">{erro}</p>}
    </div>
  );
}
