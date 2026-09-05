import { useEffect, useRef, useState } from 'react';
import { DUVIDAS } from './alinhoModelo';
import { perguntarAlinho } from './alinhoApi';

export default function AlinhoDuvidas() {
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [origem, setOrigem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [incompleta, setIncompleta] = useState(false);
  const requisicao = useRef(null);
  useEffect(() => () => { requisicao.current?.abort(); requisicao.current = null; }, []);

  const enviar = async (event) => {
    event.preventDefault();
    if (!pergunta.trim() || requisicao.current) return;
    const controller = new AbortController();
    requisicao.current = controller;
    setCarregando(true); setErro(''); setResposta(''); setIncompleta(false);
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const data = await perguntarAlinho(pergunta.trim(), { signal: controller.signal });
      if (requisicao.current !== controller) return;
      setResposta(data.resposta); setOrigem('IA · D&D 2024'); setIncompleta(data.incompleta === true);
    } catch (error) {
      if (requisicao.current !== controller) return;
      setErro(error.name === 'AbortError' ? 'A resposta demorou demais. Tente novamente ou escolha um tópico de ajuda.' : error.message);
    } finally {
      clearTimeout(timeout);
      if (requisicao.current === controller) { requisicao.current = null; setCarregando(false); }
    }
  };

  const topico = (item) => {
    requisicao.current?.abort(); requisicao.current = null;
    setCarregando(false); setErro(''); setIncompleta(false);
    setPergunta(item.titulo); setResposta(item.resposta); setOrigem('Guia do Allies');
  };

  return <>
    <h3>O que você quer descobrir?</h3>
    <p>Pergunte ao Alinho sobre seu personagem ou D&D 2024. Os tópicos rápidos continuam disponíveis sem usar a IA.</p>
    <div className="alinho-topics">{DUVIDAS.map((item) => <button key={item.titulo} onClick={() => topico(item)}>{item.titulo}<span aria-hidden="true">↗</span></button>)}</div>
    <form onSubmit={enviar}>
      <label>Sua dúvida<textarea value={pergunta} maxLength={1200} onChange={(e) => setPergunta(e.target.value)} placeholder="Como funciona a concentração em D&D 2024?" disabled={carregando} /></label>
      <p className="alinho-storage">Ao perguntar, seu texto é enviado à Groq. Cada pergunta é independente; inclua o contexto necessário.</p>
      <button className="alinho-primary" disabled={!pergunta.trim() || carregando}>{carregando ? 'Alinho está pensando…' : 'Perguntar ao Alinho →'}</button>
    </form>
    {carregando && <p role="status" className="alinho-storage">Preparando sua resposta…</p>}
    {erro && <div role="alert" className="alinho-note">{erro}</div>}
    {resposta && <div className="alinho-answer" role="status"><strong>Alinho · {origem}</strong><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{resposta}</p>{incompleta && <p>A resposta atingiu o limite de tamanho. Tente uma pergunta mais específica.</p>}</div>}
    <p className="alinho-storage">A biblioteca de regras ainda não foi conectada. Respostas da IA são orientações gerais e podem errar; confira a descrição oficial de 2024 com o mestre.</p>
  </>;
}
