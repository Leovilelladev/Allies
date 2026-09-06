import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DUVIDAS } from './alinhoModelo';
import { perguntarAlinho } from './alinhoApi';

export default function AlinhoDuvidas() {
  const [pergunta, setPergunta] = useState('');
  const [resposta, setResposta] = useState('');
  const [origem, setOrigem] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [incompleta, setIncompleta] = useState(false);
  const [fontes, setFontes] = useState([]);
  const requisicao = useRef(null);
  useEffect(() => () => { requisicao.current?.abort(); requisicao.current = null; }, []);

  const enviar = async (event) => {
    event.preventDefault();
    if (!pergunta.trim() || requisicao.current) return;
    const controller = new AbortController();
    requisicao.current = controller;
    setCarregando(true); setErro(''); setResposta(''); setIncompleta(false); setFontes([]);
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const data = await perguntarAlinho(pergunta.trim(), { signal: controller.signal });
      if (requisicao.current !== controller) return;
      setResposta(data.resposta); setOrigem(data.fonte === 'srd-5.2.1' ? 'Consulta ao SRD 5.2.1' : 'Orientação'); setIncompleta(data.incompleta === true); setFontes(data.fontes || []);
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
    setCarregando(false); setErro(''); setIncompleta(false); setFontes([]);
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
    {resposta && <div className="alinho-answer" role="status"><div className="alinho-answer-heading"><strong>Alinho</strong><span>{origem}</span></div><div className="alinho-markdown"><Markdown remarkPlugins={[remarkGfm]} skipHtml components={{ a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>, img: () => null, table: ({ children }) => <div className="alinho-table" tabIndex={0} role="region" aria-label="Tabela da resposta"><table>{children}</table></div> }}>{resposta}</Markdown></div>{incompleta && <p>A resposta atingiu o limite de tamanho. Tente uma pergunta mais específica.</p>}</div>}
    {fontes.length > 0 && <div className="alinho-fontes"><strong>Confira na fonte</strong>{fontes.map((f) => <a key={f.numero} href={f.url} target="_blank" rel="noreferrer">[{f.numero}] {f.titulo} · página {f.pagina} ↗</a>)}</div>}
    <p className="alinho-storage">Biblioteca: SRD 5.2.1, compatível com a revisão de 2024. A fonte está em inglês; a explicação em português é gerada por IA e pode errar. O SRD não inclui todos os livros comerciais.</p>
    <details className="alinho-licenca"><summary>Fonte e licença da biblioteca</summary><p>This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noreferrer">https://www.dndbeyond.com/srd</a>. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noreferrer">https://creativecommons.org/licenses/by/4.0/legalcode</a>.</p><p>Texto extraído e dividido em trechos para busca pelo Allies. Explicações em português não são traduções oficiais.</p></details>
  </>;
}
