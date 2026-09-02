import { useState, useMemo, useEffect } from 'react';
import {
  CLASSES_DND,
  ESPECIES_DND,
  ANTECEDENTES_DND,
  PERICIAS_INFO,
  calcularModificador,
  formatarMod,
} from './wizardData';
import { obterRetratoPorClasse } from '../../shared';
import StepClasse from './StepClasse';
import StepEspecie from './StepEspecie';
import StepAntecedente from './StepAntecedente';
import StepAtributos from './StepAtributos';
import StepEquipamentoSumario from './StepEquipamentoSumario';
import LivePreviewSheet from './LivePreviewSheet';
import './wizard.css';

const PASSOS_NOMES = [
  'Classe & Arquétipo',
  'Espécie & Linhagem',
  'Antecedente & Origem',
  'Atributos & Perícias',
  'Equipamento & Identidade',
];

export default function CharacterWizard({
  campanhas = [],
  campanhaPadraoId,
  onCriar,
  onCancelar,
}) {
  const [passo, setPasso] = useState(1);

  // 1. Classe
  const [classe, setClasse] = useState(() => CLASSES_DND.find((c) => c.id === 'guerreiro') || CLASSES_DND[0]);
  const [subclasse, setSubclasse] = useState('Campeão (Champion)');
  const [periciasClasse, setPericiasClasse] = useState(['atletismo', 'percepcao']);
  const [classesCustom, setClassesCustom] = useState([]);

  // 2. Espécie / Raça
  const [especie, setEspecie] = useState(() => ESPECIES_DND[0]);
  const [atributosFlexiveis, setAtributosFlexiveis] = useState(false);
  const [bonusFlexivel2, setBonusFlexivel2] = useState('for');
  const [bonusFlexivel1, setBonusFlexivel1] = useState('con');
  const [especiesCustom, setEspeciesCustom] = useState([]);

  // 3. Antecedente
  const [antecedente, setAntecedente] = useState(() => ANTECEDENTES_DND.find((a) => a.id === 'heroi_povo') || ANTECEDENTES_DND[0]);
  const [antecedentesCustom, setAntecedentesCustom] = useState([]);

  // 4. Atributos & Perícias
  const [metodoAtributos, setMetodoAtributos] = useState('pointbuy'); // 'pointbuy' | 'standard' | 'roll'
  const [atributosBase, setAtributosBase] = useState({
    for: 15,
    des: 14,
    con: 14,
    int: 10,
    sab: 12,
    car: 8,
  });
  const [periciasProficientes, setPericiasProficientes] = useState({
    atletismo: true,
    percepcao: true,
    adestramento: true,
    sobrevivencia: true,
  });
  const [periciasExpertise, setPericiasExpertise] = useState({});

  // 5. Equipamento & Identidade
  const [opcaoEquipamento, setOpcaoEquipamento] = useState('A');
  const [ouroManual, setOuroManual] = useState(100);
  const [nome, setNome] = useState('');
  const [alinhamento, setAlinhamento] = useState('Neutro e Bom (Neutral Good)');
  const [campanhaId, setCampanhaId] = useState(campanhaPadraoId || (campanhas[0]?.id || ''));
  const [avatarUrl, setAvatarUrl] = useState(() => obterRetratoPorClasse('Guerreiro'));
  const [customAvatar, setCustomAvatar] = useState(false);

  // Atualiza avatar ao mudar de classe se não for imagem personalizada
  const handleSelecionarClasse = (novaClasse) => {
    setClasse(novaClasse);
    if (!customAvatar) {
      setAvatarUrl(obterRetratoPorClasse(novaClasse.nome));
    }
    // Ajusta perícias padrão da classe
    if (novaClasse.opcoesPericias) {
      const validas = periciasClasse.filter((p) => novaClasse.opcoesPericias.includes(p));
      if (validas.length > 0) {
        setPericiasClasse(validas.slice(0, novaClasse.qtdPericiasClasse || 2));
      } else {
        setPericiasClasse(novaClasse.opcoesPericias.slice(0, novaClasse.qtdPericiasClasse || 2));
      }
    }
  };

  const handleTogglePericiaClasse = (pId) => {
    const qtdMax = classe?.qtdPericiasClasse || 2;
    setPericiasClasse((prev) => {
      if (prev.includes(pId)) {
        return prev.filter((x) => x !== pId);
      }
      if (prev.length >= qtdMax) {
        return [...prev.slice(1), pId];
      }
      return [...prev, pId];
    });
  };

  // Atualiza perícias automáticas de antecedente e raça
  useEffect(() => {
    const novasProfs = { ...periciasProficientes };
    // Perícias da classe
    periciasClasse.forEach((p) => { novasProfs[p] = true; });
    // Perícias do antecedente
    if (antecedente?.pericias) {
      antecedente.pericias.forEach((p) => { novasProfs[p] = true; });
    }
    // Perícias da raça
    if (especie?.periciasConcedidas) {
      especie.periciasConcedidas.forEach((p) => { novasProfs[p] = true; });
    }
    setPericiasProficientes(novasProfs);
  }, [periciasClasse, antecedente, especie]);

  // Cálculo dos Atributos Finais
  const atributosFinais = useMemo(() => {
    const res = {};
    ['for', 'des', 'con', 'int', 'sab', 'car'].forEach((attr) => {
      const base = atributosBase[attr] || 10;
      let bonusRaca = 0;
      if (atributosFlexiveis) {
        if (bonusFlexivel2 === attr) bonusRaca += 2;
        if (bonusFlexivel1 === attr) bonusRaca += 1;
      } else if (especie?.bonusAtributoFixo) {
        bonusRaca = especie.bonusAtributoFixo[attr] || 0;
      }
      res[attr] = base + bonusRaca;
    });
    return res;
  }, [atributosBase, atributosFlexiveis, bonusFlexivel2, bonusFlexivel1, especie]);

  // Validações dos Passos
  const statusPassos = useMemo(() => {
    const p1Valido = Boolean(classe) && periciasClasse.length === (classe?.qtdPericiasClasse || 2);
    const p2Valido = Boolean(especie) && (!atributosFlexiveis || bonusFlexivel2 !== bonusFlexivel1);
    const p3Valido = Boolean(antecedente);
    const p4Valido = Boolean(atributosBase.for && atributosBase.des && atributosBase.con);
    const p5Valido = Boolean(nome.trim());

    return [
      { step: 1, nome: 'Classe', valido: p1Valido },
      { step: 2, nome: 'Espécie', valido: p2Valido },
      { step: 3, nome: 'Antecedente', valido: p3Valido },
      { step: 4, nome: 'Atributos', valido: p4Valido },
      { step: 5, nome: 'Equipamento', valido: p5Valido },
    ];
  }, [classe, periciasClasse, especie, atributosFlexiveis, bonusFlexivel2, bonusFlexivel1, antecedente, atributosBase, nome]);

  const podeFinalizar = Boolean(nome.trim());

  // Concluir Criação e Formatar para o Supabase
  const handleFinalizar = () => {
    if (!nome.trim()) {
      setPasso(5);
      return;
    }

    const conMod = calcularModificador(atributosFinais.con);
    const desMod = calcularModificador(atributosFinais.des);
    const dVida = classe?.dadoVidaMax || 8;
    const pvInicial = dVida + conMod;

    // Equipamento e Armas
    let equipTexto = '';
    let ataquesLista = [];
    let moedasObj = { pc: 0, pp: 0, pe: 0, po: 10, pl: 0 };

    if (opcaoEquipamento === 'ouro') {
      moedasObj.po = ouroManual || 100;
      equipTexto = 'Início de aventura com reserva de ouro.';
    } else {
      const pck = opcaoEquipamento === 'A' ? classe?.equipamentoInicial?.opcaoA : classe?.equipamentoInicial?.opcaoB;
      if (pck) {
        equipTexto = pck.itens.join(', ') + (antecedente?.equipamento ? ` | ${antecedente.equipamento}` : '');
        if (pck.ataque) {
          const attrAcerto = pck.ataque.acertoAttr || 'for';
          const modAtk = calcularModificador(atributosFinais[attrAcerto]);
          const bonusAcerto = 2 + modAtk;
          ataquesLista.push({
            id: 1,
            nome: pck.ataque.nome,
            tipo: 'Ataque',
            acerto: formatarMod(bonusAcerto),
            dano: `${pck.ataque.dano}${formatarMod(modAtk)}`,
            tipoDano: pck.ataque.tipoDano || 'Físico',
            desc: `Arma inicial de ${classe?.nome}.`,
          });
        }
      }
    }

    // Traços combinados
    const tracosTexto = [
      ...(classe?.habilidadesNivel1?.map((h) => `[${h.nome}]: ${h.desc}`) || []),
      ...(especie?.traços?.map((t) => `[${t.nome}]: ${t.desc}`) || []),
      antecedente?.caracteristica ? `[${antecedente.caracteristica.nome}]: ${antecedente.caracteristica.desc}` : '',
    ].filter(Boolean).join('\n\n');

    onCriar({
      nome: nome.trim(),
      raca: especie?.nome || 'Humano',
      classe: classe?.nome || 'Guerreiro',
      subclasse: subclasse.trim() || null,
      nivel: 1,
      antecedente: antecedente?.nome || 'Aventureiro',
      alinhamento,
      campanhaId: campanhaId || null,
      avatar_url: avatarUrl,
      token_url: avatarUrl,
      background_url: avatarUrl,
      dadosIniciais: {
        avatar_url: avatarUrl,
        token_url: avatarUrl,
        pv_total: pvInicial,
        pv_atual: pvInicial,
        pvTemp: 0,
        ca: 10 + desMod,
        deslocamento: especie?.deslocamento || '30ft',
        iniciativa: desMod,
        profBonus: 2,
        dadosVida: classe?.dadoVida || '1d8',
        for: atributosFinais.for,
        des: atributosFinais.des,
        con: atributosFinais.con,
        int: atributosFinais.int,
        sab: atributosFinais.sab,
        car: atributosFinais.car,
        pericias: periciasProficientes,
        periciasExpertise,
        ataques: ataquesLista,
        magias: [],
        spellSlots: { 1: { total: 2, gastos: 0 } },
        moedas: moedasObj,
        equipamento: equipTexto,
        tracos: tracosTexto,
        historia: antecedente?.descricao || '',
        idiomas: especie?.idiomas || ['Comum'],
      },
    });
  };

  return (
    <div className="wizard-fullscreen-overlay">
      {/* 1. Header Superior */}
      <div className="wizard-top-bar">
        <div className="wizard-top-title-group">
          <div className="wizard-top-icon">
            <span className="material-symbols-outlined text-2xl">swords</span>
          </div>
          <div>
            <h1>Criador de Personagens · D&D 5e</h1>
            <p>Assistente guiado de criação de aventureiros e heróis lendários</p>
          </div>
        </div>

        <button type="button" className="wizard-btn-close" onClick={onCancelar}>
          <span className="material-symbols-outlined text-sm">close</span>
          <span>Fechar</span>
        </button>
      </div>

      {/* 2. Layout Principal de 3 Colunas */}
      <div className="wizard-main-layout">
        {passo === 1 && (
          <StepClasse
            classeSelecionada={classe}
            onSelecionarClasse={handleSelecionarClasse}
            subclasseSelecionada={subclasse}
            onSelecionarSubclasse={setSubclasse}
            periciasClasse={periciasClasse}
            onTogglePericiaClasse={handleTogglePericiaClasse}
            classesCustom={classesCustom}
            onAdicionarClasseCustom={(nova) => setClassesCustom((prev) => [...prev, nova])}
          />
        )}

        {passo === 2 && (
          <StepEspecie
            especieSelecionada={especie}
            onSelecionarEspecie={setEspecie}
            atributosFlexiveis={atributosFlexiveis}
            onToggleAtributosFlexiveis={setAtributosFlexiveis}
            especiesCustom={especiesCustom}
            onAdicionarEspecieCustom={(nova) => setEspeciesCustom((prev) => [...prev, nova])}
          />
        )}

        {passo === 3 && (
          <StepAntecedente
            antecedenteSelecionado={antecedente}
            onSelecionarAntecedente={setAntecedente}
            antecedentesCustom={antecedentesCustom}
            onAdicionarAntecedenteCustom={(novo) => setAntecedentesCustom((prev) => [...prev, novo])}
          />
        )}

        {passo === 4 && (
          <StepAtributos
            metodo={metodoAtributos}
            onMudarMetodo={setMetodoAtributos}
            atributosBase={atributosBase}
            onMudarAtributosBase={setAtributosBase}
            atributosFlexiveis={atributosFlexiveis}
            bonusFlexivel2={bonusFlexivel2}
            onChangeFlexivel2={setBonusFlexivel2}
            bonusFlexivel1={bonusFlexivel1}
            onChangeFlexivel1={setBonusFlexivel1}
            especie={especie}
            classe={classe}
            antecedente={antecedente}
            periciasProficientes={periciasProficientes}
            onToggleProficiencia={(pId) => setPericiasProficientes((prev) => ({ ...prev, [pId]: !prev[pId] }))}
            periciasExpertise={periciasExpertise}
            onToggleExpertise={(pId) => setPericiasExpertise((prev) => ({ ...prev, [pId]: !prev[pId] }))}
          />
        )}

        {passo === 5 && (
          <StepEquipamentoSumario
            opcaoEquipamento={opcaoEquipamento}
            onMudarOpcaoEquipamento={setOpcaoEquipamento}
            ouroManual={ouroManual}
            onMudarOuroManual={setOuroManual}
            nome={nome}
            onMudarNome={setNome}
            avatarUrl={avatarUrl}
            onMudarAvatarUrl={(url) => { setAvatarUrl(url); setCustomAvatar(true); }}
            alinhamento={alinhamento}
            onMudarAlinhamento={setAlinhamento}
            campanhas={campanhas}
            campanhaId={campanhaId}
            onMudarCampanhaId={setCampanhaId}
            classe={classe}
            subclasse={subclasse}
            especie={especie}
            antecedente={antecedente}
            atributosFinais={atributosFinais}
            periciasProficientes={periciasProficientes}
            onFinalizar={handleFinalizar}
            podeFinalizar={podeFinalizar}
          />
        )}

        {/* Coluna Direita Persistente: Live Preview Sheet */}
        <LivePreviewSheet
          nome={nome}
          classe={classe}
          subclasse={subclasse}
          especie={especie}
          antecedente={antecedente}
          nivel={1}
          atributosFinais={atributosFinais}
          periciasProficientes={periciasProficientes}
          periciasExpertise={periciasExpertise}
          avatarUrl={avatarUrl}
          salvaguardasClasse={classe?.salvaguardas || []}
          onFinalizar={handleFinalizar}
          podeFinalizar={podeFinalizar}
        />
      </div>

      {/* 3. Rodapé de Navegação Persistente */}
      <div className="wizard-footer-nav">
        {/* Botão Anterior */}
        <button
          type="button"
          className="wizard-nav-btn prev"
          disabled={passo === 1}
          onClick={() => setPasso((p) => Math.max(1, p - 1))}
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          <span>Anterior</span>
        </button>

        {/* Barra de Progresso com 5 Ícones */}
        <div className="wizard-progress-track">
          {statusPassos.map((st) => {
            const isActive = passo === st.step;
            const isDone = st.valido;

            return (
              <div
                key={st.step}
                className={`wizard-step-node ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                onClick={() => setPasso(st.step)}
              >
                <div className="step-node-icon">
                  {isDone ? (
                    <span className="material-symbols-outlined text-sm">check</span>
                  ) : (
                    <span>{st.step}</span>
                  )}
                </div>
                <span className="step-node-label">{st.nome}</span>
                <span className={`step-status-tag ${isDone ? 'check' : 'alert'}`}>
                  {isDone ? '✓' : '!'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Status Text & Botão Próximo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="wizard-status-text">
            Passo {passo} de 5: <strong>{PASSOS_NOMES[passo - 1]}</strong>
          </div>

          {passo < 5 ? (
            <button
              type="button"
              className="wizard-nav-btn next"
              onClick={() => setPasso((p) => Math.min(5, p + 1))}
            >
              <span>Próximo</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              className="wizard-nav-btn next"
              disabled={!podeFinalizar}
              onClick={handleFinalizar}
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              <span>Finalizar Ficha</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
