import { useEffect, useRef, useState } from 'react';
import { RASCUNHO_VAZIO, exportarRascunho, lerRascunho } from './alinhoModelo';
import AlinhoDuvidas from './AlinhoDuvidas';
import './alinho.css';

const IMAGEM = `${import.meta.env.BASE_URL}mascote/alinho-v2.png`;
const ETAPAS = ['Sua ideia', 'Seu jeito', 'Sua história', 'Revisão'];

export default function Alinho({ usuarioId }) {
  const chave = `allies_alinho_rascunho_v1_${usuarioId}`;
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState('inicio');
  const [etapa, setEtapa] = useState(0);
  const [rascunho, setRascunho] = useState(() => {
    try { return lerRascunho(localStorage, chave); }
    catch { return { ...RASCUNHO_VAZIO }; }
  });
  const [erroStorage, setErroStorage] = useState(false);
  const [reiniciar, setReiniciar] = useState(false);
  const dialog = useRef(null);
  const launcher = useRef(null);
  const titulo = useRef(null);
  const corpo = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(chave, JSON.stringify(rascunho)); setErroStorage(false); }
    catch { setErroStorage(true); }
  }, [chave, rascunho]);

  useEffect(() => {
    if (aberto) { dialog.current.showModal(); titulo.current?.focus(); }
    else if (dialog.current?.open) { dialog.current.close(); launcher.current?.focus(); }
  }, [aberto]);

  useEffect(() => { if (aberto) { titulo.current?.focus(); corpo.current?.scrollTo({ top: 0 }); } }, [modo, etapa]);
  const campo = (nome, valor) => setRascunho((anterior) => ({ ...anterior, [nome]: valor }));
  const voltarInicio = () => { setModo('inicio'); setReiniciar(false); };
  const baixar = () => {
    const url = URL.createObjectURL(new Blob([exportarRascunho(rascunho)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'allies-rascunho-alinho.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <button className="alinho-launcher" ref={launcher} onClick={() => setAberto(true)} aria-haspopup="dialog" aria-expanded={aberto} aria-controls="alinho-dialog">
        <img src={IMAGEM} alt="" /><span><strong>Alinho</strong><small>Precisa de uma mão?</small></span><span aria-hidden="true">✦</span>
      </button>
      <dialog id="alinho-dialog" className="alinho-dialog" ref={dialog} aria-labelledby="alinho-titulo" onCancel={() => setAberto(false)} onClose={() => setAberto(false)}>
        <header className="alinho-header"><img className="alinho-avatar" src={IMAGEM} alt="" /><div><span className="alinho-eyebrow">SEU COMPANHEIRO DE AVENTURA</span><h2 id="alinho-titulo" ref={titulo} tabIndex={-1}>Alinho <span>✦</span></h2></div><button className="alinho-icon" onClick={() => setAberto(false)} aria-label="Fechar Alinho">×</button></header>
        <div className="alinho-body" ref={corpo}>
          {modo === 'inicio' ? <>
            <div className="alinho-hero"><img src={IMAGEM} alt="Alinho, um pequeno dragão de lenço vermelho segurando um dado" /><span className="alinho-tag">Toda aventura começa com uma ideia.</span></div>
            <h3>Oi! Vamos dar o primeiro passo?</h3><p>Eu te ajudo a organizar seu personagem e a encontrar seu caminho no Allies. Um passo de cada vez.</p>
            <button className="alinho-card" onClick={() => setModo('guia')}><span aria-hidden="true">✎</span><span><strong>{rascunho.nome ? 'Continuar meu rascunho' : 'Criar minha ficha'}</strong><small>Da primeira ideia ao rascunho do personagem</small></span><span aria-hidden="true">→</span></button>
            <button className="alinho-card" onClick={() => setModo('duvidas')}><span aria-hidden="true">?</span><span><strong>Tenho uma dúvida</strong><small>Magias, regras de D&D e primeiros passos</small></span><span aria-hidden="true">→</span></button>
          </> : <>
            <button className="alinho-back" onClick={voltarInicio}>← Início</button>
            {modo === 'guia' ? <>
              <div className="alinho-progress" aria-label={`Etapa ${etapa + 1} de 4: ${ETAPAS[etapa]}`}>{ETAPAS.map((nome, i) => <span key={nome} className={i <= etapa ? 'is-active' : ''} />)}</div>
              <span className="alinho-eyebrow">PASSO {etapa + 1} DE 4 · {ETAPAS[etapa]}</span>
              <form onSubmit={(e) => { e.preventDefault(); if (etapa < 3) setEtapa(etapa + 1); }}>
                {etapa === 0 && <><h3>Quem vai viver essa aventura?</h3><p>Pode ser só uma ideia. As regras e os números vêm depois, junto com o mestre.</p><label>Nome do personagem<input required maxLength={80} value={rascunho.nome} onChange={(e) => campo('nome', e.target.value)} placeholder="Como seu herói se chama?" pattern=".*\S.*" /></label><label>Sua ideia em poucas palavras<textarea required maxLength={1200} value={rascunho.conceito} onChange={(e) => campo('conceito', e.target.value)} placeholder="Uma exploradora que procura a irmã desaparecida…" /></label></>}
                {etapa === 1 && <><h3>Como você quer se aventurar?</h3><p>Escolha o que mais te anima. Isso é uma preferência para conversar com o mestre, não uma classe definida.</p><div className="alinho-options">{['Proteger meus aliados', 'Descobrir mistérios e magia', 'Explorar e agir com astúcia', 'Conversar e inspirar o grupo', 'Ainda quero descobrir'].map((estilo) => <label key={estilo}><input type="radio" name="estilo" value={estilo} checked={rascunho.estilo === estilo} onChange={() => campo('estilo', estilo)} />{estilo}</label>)}</div></>}
                {etapa === 2 && <><h3>O que move seu personagem?</h3><p>De onde ele veio? O que procura? Por que aceitaria se unir ao grupo? Duas ou três frases já ajudam.</p><label>Um pedacinho da história <small>(opcional)</small><textarea rows={6} maxLength={1200} value={rascunho.historia} onChange={(e) => campo('historia', e.target.value)} placeholder="Ele deixou sua vila para…" /></label></>}
                {etapa === 3 && <><h3>Sua aventura já tem um começo.</h3><p>Revise suas ideias. Você pode voltar e mudar qualquer escolha.</p><dl className="alinho-review">{[['Nome', rascunho.nome], ['Conceito', rascunho.conceito], ['Estilo', rascunho.estilo || 'A combinar'], ['História', rascunho.historia || 'A construir']].map(([rotulo, valor]) => <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>)}</dl><div className="alinho-note"><strong>Próxima missão</strong><p>Combine sistema, edição, nível e opções com o mestre. Depois, use este rascunho para preencher a ficha em Meus Personagens.</p></div><button type="button" className="alinho-primary" onClick={baixar}>↓ Baixar meu rascunho</button></>}
                <div className="alinho-actions">{etapa > 0 && <button type="button" className="alinho-secondary" onClick={() => setEtapa(etapa - 1)}>Voltar</button>}{etapa < 3 && <button className="alinho-primary" type="submit" disabled={etapa === 0 && (!rascunho.nome.trim() || !rascunho.conceito.trim())}>{etapa === 2 ? 'Revisar rascunho' : 'Continuar'} →</button>}</div>
              </form>
              <p className="alinho-storage" role="status">{erroStorage ? 'Não consegui guardar neste navegador. Baixe o rascunho ao concluir para não perdê-lo.' : 'Rascunho salvo neste navegador. Ainda não é uma ficha na campanha.'}</p>
              {reiniciar ? <div className="alinho-note"><p>Apagar este rascunho e começar outro?</p><div className="alinho-actions"><button className="alinho-secondary" onClick={() => setReiniciar(false)}>Manter rascunho</button><button className="alinho-secondary" onClick={() => { setRascunho({ ...RASCUNHO_VAZIO }); setEtapa(0); setReiniciar(false); }}>Apagar e recomeçar</button></div></div> : <button className="alinho-back" onClick={() => setReiniciar(true)}>Começar outro rascunho</button>}
            </> : <AlinhoDuvidas />}
          </>}
        </div>
        <footer className="alinho-footer">Um aliado para começar. Uma história para construir.</footer>
      </dialog>
    </>
  );
}
