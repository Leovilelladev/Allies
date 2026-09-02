import { useState, useEffect, useRef, useMemo } from 'react';
import bgCastelo from '../assets/backgrounds/bg-castelo.jpg';
import bgLaboratorio from '../assets/backgrounds/bg-laboratorio.jpg';
import ActionSlot from './components/ActionSlot';
import ModalConfigAcao from './components/ModalConfigAcao';
import ModalResultadoRolagem from './components/ModalResultadoRolagem';
import {
  executarRolagemAcao,
  aplicarDescansoAcoes,
  ACOES_PRESETS,
  redimensionarImagem,
  useToast,
} from '../shared';

const ATRIBUTOS_INFO = [
  { id: 'for', sigla: 'STR', nome: 'Força' },
  { id: 'des', sigla: 'DEX', nome: 'Destreza' },
  { id: 'con', sigla: 'CON', nome: 'Constituição' },
  { id: 'int', sigla: 'INT', nome: 'Inteligência' },
  { id: 'sab', sigla: 'WIS', nome: 'Sabedoria' },
  { id: 'car', sigla: 'CHA', nome: 'Carisma' },
];

const PERICIAS_DD = [
  { id: 'acrobacia', nome: 'Acrobatics', attr: 'des' },
  { id: 'lidarAnimais', nome: 'Animal Handling', attr: 'sab' },
  { id: 'arcanismo', nome: 'Arcana', attr: 'int' },
  { id: 'atletismo', nome: 'Athletics', attr: 'for' },
  { id: 'enganacao', nome: 'Deception', attr: 'car' },
  { id: 'historia', nome: 'History', attr: 'int' },
  { id: 'intuicao', nome: 'Insight', attr: 'sab' },
  { id: 'intimidacao', nome: 'Intimidation', attr: 'car' },
  { id: 'investigacao', nome: 'Investigation', attr: 'int' },
  { id: 'medicina', nome: 'Medicine', attr: 'sab' },
  { id: 'natureza', nome: 'Nature', attr: 'int' },
  { id: 'percepcao', nome: 'Perception', attr: 'sab' },
  { id: 'atuacao', nome: 'Performance', attr: 'car' },
  { id: 'persuasao', nome: 'Persuasion', attr: 'car' },
  { id: 'religiao', nome: 'Religion', attr: 'int' },
  { id: 'prestidigitacao', nome: 'Sleight of Hand', attr: 'des' },
  { id: 'furtividade', nome: 'Stealth', attr: 'des' },
  { id: 'sobrevivencia', nome: 'Survival', attr: 'sab' },
];

const FUNDOS_PADRAO = [
  { id: 'castelo', nome: 'Castelo Arcano', url: bgCastelo },
  { id: 'laboratorio', nome: 'Laboratório Hextech', url: bgLaboratorio },
  { id: 'masmorra', nome: 'Masmorra & Cripta', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop' },
  { id: 'floresta', nome: 'Floresta Ancestral', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop' },
  { id: 'taverna', nome: 'Taverna & Aventura', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop' },
  { id: 'cosmos', nome: 'Cosmos & Astral', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop' },
];

const CORES_TEMA = [
  { id: 'padrao', nome: 'Hextech Clássico', cor: '#040e22', borda: '#e5c587' },
  { id: 'arcane', nome: 'Arcane Teal', cor: '#002b26', borda: '#43e2d2' },
  { id: 'ouro', nome: 'Ancient Gold', cor: '#231804', borda: '#e5c587' },
  { id: 'crimson', nome: 'Crimson Dragon', cor: '#26070a', borda: '#ff5364' },
  { id: 'void', nome: 'Void Shadow', cor: '#170828', borda: '#b388ff' },
];

function mod(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}

function fmtMod(n) {
  const num = Number(n) || 0;
  return num >= 0 ? `+${num}` : `${num}`;
}

// Extrai objeto seguro dos dados da ficha unindo colunas e jsonb
function extrairDadosFicha(ficha) {
  if (!ficha) return {};
  let d = {};
  if (ficha.dados_ficha && typeof ficha.dados_ficha === 'object') {
    d = { ...ficha.dados_ficha };
  } else if (ficha.dados && typeof ficha.dados === 'object') {
    d = { ...ficha.dados };
  } else if (typeof ficha.dados_ficha === 'string') {
    try { d = JSON.parse(ficha.dados_ficha); } catch (e) { d = {}; }
  } else if (typeof ficha.dados === 'string') {
    try { d = JSON.parse(ficha.dados); } catch (e) { d = {}; }
  }

  return {
    ...d,
    pv_atual: ficha.pv_atual ?? d.pv_atual ?? d.pv_total ?? 10,
    pv_total: ficha.pv_total ?? d.pv_total ?? 10,
    pvTemp: ficha.pv_temp ?? d.pvTemp ?? 0,
    dadosVida: ficha.dados_vida ?? d.dadosVida ?? '1d8',
    ca: ficha.ca ?? d.ca ?? 10,
    deslocamento: ficha.deslocamento ?? d.deslocamento ?? '30ft',
    profBonus: ficha.proficiencia ?? d.profBonus ?? 2,
    for: ficha.forca ?? d.for ?? d.atributos?.for ?? 10,
    des: ficha.destreza ?? d.des ?? d.atributos?.des ?? 10,
    con: ficha.constituicao ?? d.con ?? d.atributos?.con ?? 10,
    int: ficha.inteligencia ?? d.int ?? d.atributos?.int ?? 10,
    sab: ficha.sabedoria ?? d.sab ?? d.atributos?.sab ?? 10,
    car: ficha.carisma ?? d.car ?? d.atributos?.car ?? 10,
    pericias: ficha.pericias ?? d.pericias ?? {},
    ataques: ficha.ataques ?? d.ataques ?? [],
    magias: ficha.magias ?? d.magias ?? [],
    spellSlots: ficha.espacos_magia ?? d.spellSlots ?? { 1: { total: 4, gastos: 0 } },
    moedas: ficha.moedas ?? d.moedas ?? { po: 0, pp: 0, pc: 0 },
    equipamento: ficha.equipamento ?? d.equipamento ?? '',
    tracos: ficha.tracos ?? d.tracos ?? '',
    historia: ficha.historia ?? d.historia ?? '',
  };
}

// Componente do Gráfico de Radar em SVG para os 6 Atributos
function RadarChart({ atributos = {} }) {
  const size = 230;
  const center = size / 2;
  const radius = 72;
  const maxScore = 20;

  const keys = ['for', 'des', 'con', 'int', 'sab', 'car'];
  const total = keys.length;

  const points = keys.map((key, i) => {
    const angle = (i * (360 / total) - 90) * (Math.PI / 180);
    const rawVal = atributos && typeof atributos === 'object' ? atributos[key] : 10;
    const val = Math.min(maxScore, Math.max(1, Number(rawVal) || 10));
    const r = (val / maxScore) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    const sigla = ATRIBUTOS_INFO[i]?.sigla || key.toUpperCase();
    return { x, y, angle, val, label: sigla };
  });

  const polygonPoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="sheet-radar-card">
      <div className="sheet-radar-header">
        <span className="sheet-radar-title">Radar de Atributos</span>
      </div>
      <div className="sheet-radar-svg-wrap">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#43e2d2" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00c6b7" stopOpacity="0.08" />
            </radialGradient>
          </defs>

          {/* Anéis concêntricos */}
          {rings.map((factor) => {
            const ringPoints = keys.map((_, i) => {
              const angle = (i * (360 / total) - 90) * (Math.PI / 180);
              const r = radius * factor;
              return `${(center + r * Math.cos(angle)).toFixed(1)},${(center + r * Math.sin(angle)).toFixed(1)}`;
            }).join(' ');
            return (
              <polygon
                key={factor}
                points={ringPoints}
                fill="none"
                stroke="rgba(77, 70, 58, 0.35)"
                strokeDasharray={factor < 1 ? '3,3' : 'none'}
                strokeWidth="1"
              />
            );
          })}

          {/* Raios axiais */}
          {keys.map((_, i) => {
            const angle = (i * (360 / total) - 90) * (Math.PI / 180);
            const x2 = center + radius * Math.cos(angle);
            const y2 = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="rgba(77, 70, 58, 0.4)"
                strokeWidth="1"
              />
            );
          })}

          {/* Polígono preenchido dos atributos */}
          <polygon
            points={polygonPoints}
            fill="url(#radarGlow)"
            stroke="#43e2d2"
            strokeWidth="2"
          />

          {/* Vértices com pontos luminosos */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="#e5c587"
              stroke="#040e22"
              strokeWidth="1.5"
            />
          ))}

          {/* Rótulos dos atributos */}
          {points.map((p, i) => {
            const labelR = radius + 22;
            const lx = center + labelR * Math.cos(p.angle);
            const ly = center + labelR * Math.sin(p.angle);
            return (
              <text
                key={i}
                x={lx}
                y={ly + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fontFamily="var(--font-sans)"
                fill="#e5c587"
              >
                {p.label} {p.val}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function FichaView({ ficha = {}, usuarioAtual = {}, onVoltar, onSalvar }) {
  const toast = useToast();
  const somenteLeitura = Number(ficha?.usuario_id) !== Number(usuarioAtual?.id);
  const [tabAtiva, setTabAtiva] = useState('actions');
  const [modalTema, setModalTema] = useState(false);

  const fileInputRef = useRef(null);
  const bgFileInputRef = useRef(null);

  const dInicial = extrairDadosFicha(ficha);

  // Customização Visual (Avatar/Token e Background)
  const [avatarUrl, setAvatarUrl] = useState(ficha?.avatar_url || ficha?.token_url || dInicial?.avatar_url || '');
  const [backgroundUrl, setBackgroundUrl] = useState(ficha?.background_url || dInicial?.background_url || bgCastelo);
  const [corTema, setCorTema] = useState(ficha?.cor_tema || dInicial?.cor_tema || 'padrao');
  const [bgBrightness, setBgBrightness] = useState(
    Number(ficha?.bg_brightness ?? dInicial?.bg_config?.brightness ?? dInicial?.bg_brightness ?? 24)
  );
  const [bgBlur, setBgBlur] = useState(
    Number(ficha?.bg_blur ?? dInicial?.bg_config?.blur ?? dInicial?.bg_blur ?? 10)
  );
  const [bgOverlay, setBgOverlay] = useState(
    Number(ficha?.bg_overlay ?? dInicial?.bg_config?.overlay ?? dInicial?.bg_overlay ?? 75)
  );

  // Cabeçalho e Identidade
  const [nomePersonagem, setNomePersonagem] = useState(ficha?.nome || ficha?.nome_personagem || dInicial?.nome || 'ASSALARIADO');
  const [classe, setClasse] = useState(ficha?.classe || dInicial?.classe || 'Guerreiro');
  const [subclasse, setSubclasse] = useState(ficha?.subclasse || dInicial?.subclasse || '');
  const [raca, setRaca] = useState(ficha?.raca || dInicial?.raca || 'Humano');
  const [antecedente, setAntecedente] = useState(ficha?.antecedente || dInicial?.antecedente || 'Herói do Povo');
  const [alinhamento, setAlinhamento] = useState(ficha?.alinhamento || dInicial?.alinhamento || 'Neutro e Bom');
  const [nivel, setNivel] = useState(Number(ficha?.nivel ?? dInicial?.nivel ?? 1) || 1);

  // Pontos de Vida (HP)
  const [pvAtual, setPvAtual] = useState(Number(dInicial?.pv_atual ?? dInicial?.pv_total ?? 12) || 12);
  const [pvMax, setPvMax] = useState(Number(dInicial?.pv_total ?? 12) || 12);
  const [pvTemp, setPvTemp] = useState(Number(dInicial?.pvTemp ?? 0) || 0);
  const [dadosVida, setDadosVida] = useState(dInicial?.dadosVida || '1d8');

  // Combate Trio & Proficiência
  const [ca, setCa] = useState(Number(dInicial?.ca ?? 14) || 14);
  const [deslocamento, setDeslocamento] = useState(dInicial?.deslocamento || '30ft');
  const [profBonus, setProfBonus] = useState(
    Number(dInicial?.profBonus ?? (Math.floor((Number(nivel) - 1) / 4) + 2)) || 2
  );

  // 6 Atributos (Limitados a 2 dígitos max: 0-99)
  const [atributos, setAtributos] = useState(() => {
    const raw = (dInicial?.atributos && typeof dInicial.atributos === 'object') ? dInicial.atributos : dInicial;
    return {
      for: Number(raw?.for ?? dInicial?.for ?? 15) || 10,
      des: Number(raw?.des ?? dInicial?.des ?? 14) || 10,
      con: Number(raw?.con ?? dInicial?.con ?? 14) || 10,
      int: Number(raw?.int ?? dInicial?.int ?? 10) || 10,
      sab: Number(raw?.sab ?? dInicial?.sab ?? 12) || 10,
      car: Number(raw?.car ?? dInicial?.car ?? 8) || 10,
    };
  });

  // Perícias
  const [pericias, setPericias] = useState(() => {
    if (dInicial?.pericias && typeof dInicial.pericias === 'object') {
      return dInicial.pericias;
    }
    return {
      acrobacia: true,
      arcanismo: true,
      investigacao: true,
    };
  });

  // Modais de Ações e Rolagem
  const [modalConfigAcao, setModalConfigAcao] = useState(null);
  const [resultadoRolagem, setResultadoRolagem] = useState(null);

  // Ações / Habilidades estilo MOBA
  const [ataques, setAtaques] = useState(() => {
    const rawList = dInicial?.acoes || dInicial?.ataques || ficha?.acoes || ficha?.ataques;
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList;
    }
    return ACOES_PRESETS.slice(0, 4);
  });

  // Magias & Espaços
  const [spellSlots, setSpellSlots] = useState(() => {
    if (dInicial?.spellSlots && typeof dInicial.spellSlots === 'object') {
      return dInicial.spellSlots;
    }
    return {
      1: { total: 4, gastos: 0 },
      2: { total: 2, gastos: 0 },
      3: { total: 0, gastos: 0 },
    };
  });
  const [magias, setMagias] = useState(() => Array.isArray(dInicial?.magias) ? dInicial.magias : []);

  // Inventário & Moedas
  const [moedas, setMoedas] = useState(() => {
    if (dInicial?.moedas && typeof dInicial.moedas === 'object') {
      return {
        po: Number(dInicial.moedas.po) || 0,
        pp: Number(dInicial.moedas.pp) || 0,
        pc: Number(dInicial.moedas.pc) || 0,
      };
    }
    return { po: 45, pp: 12, pc: 8 };
  });
  const [equipamento, setEquipamento] = useState(dInicial?.equipamento || 'Armadura de Couro Batido, Espada Longa, Mochila de Aventureiro.');

  // Traços & História
  const [tracos, setTracos] = useState(dInicial?.tracos || '');
  const [historia, setHistoria] = useState(dInicial?.historia || '');

  // Sincroniza se a ficha selecionada mudar
  useEffect(() => {
    if (ficha && ficha.id) {
      const d = extrairDadosFicha(ficha);
      setAvatarUrl(ficha.avatar_url || ficha.token_url || d.avatar_url || '');
      setBackgroundUrl(ficha.background_url || d.background_url || bgCastelo);
      setCorTema(ficha.cor_tema || d.cor_tema || 'padrao');
      setNomePersonagem(ficha.nome || ficha.nome_personagem || d.nome || 'ASSALARIADO');
      setClasse(ficha.classe || d.classe || 'Guerreiro');
      setSubclasse(ficha.subclasse || d.subclasse || '');
      setRaca(ficha.raca || d.raca || 'Humano');
      setAntecedente(ficha.antecedente || d.antecedente || 'Herói do Povo');
      setAlinhamento(ficha.alinhamento || d.alinhamento || 'Neutro e Bom');
      setNivel(Number(ficha.nivel ?? d.nivel ?? 1) || 1);
      setPvAtual(Number(d.pv_atual ?? d.pv_total ?? 12) || 12);
      setPvMax(Number(d.pv_total ?? 12) || 12);
      setPvTemp(Number(d.pvTemp ?? 0) || 0);
      setDadosVida(d.dadosVida || '1d8');
      setCa(Number(d.ca ?? 14) || 14);
      setDeslocamento(d.deslocamento || '30ft');
      setProfBonus(Number(d.profBonus ?? (Math.floor((Number(ficha.nivel || 1) - 1) / 4) + 2)) || 2);

      const rawAttr = (d.atributos && typeof d.atributos === 'object') ? d.atributos : d;
      setAtributos({
        for: Number(rawAttr?.for ?? 15) || 10,
        des: Number(rawAttr?.des ?? 14) || 10,
        con: Number(rawAttr?.con ?? 14) || 10,
        int: Number(rawAttr?.int ?? 10) || 10,
        sab: Number(rawAttr?.sab ?? 12) || 10,
        car: Number(rawAttr?.car ?? 8) || 10,
      });

      if (d.pericias && typeof d.pericias === 'object') setPericias(d.pericias);
      if (Array.isArray(d.ataques)) setAtaques(d.ataques);
      if (d.spellSlots && typeof d.spellSlots === 'object') setSpellSlots(d.spellSlots);
      if (Array.isArray(d.magias)) setMagias(d.magias);
      if (d.moedas && typeof d.moedas === 'object') setMoedas(d.moedas);
      if (d.equipamento) setEquipamento(d.equipamento);
      if (d.tracos) setTracos(d.tracos);
      if (d.historia) setHistoria(d.historia);
    }
  }, [ficha]);

  // Upload do Avatar / Token (Máx 500x500px)
  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await redimensionarImagem(file, 500, 500, 0.88);
        setAvatarUrl(dataUrl);
      } catch (err) {
        console.error('Erro ao redimensionar avatar:', err);
      }
    }
  };

  // Upload de Background Personalizado (Limite Máximo: 5MB)
  const handleUploadBg = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      toast('A imagem de fundo deve ter no máximo 5MB.', 'erro');
      if (e.target) e.target.value = '';
      return;
    }

    try {
      const dataUrl = await redimensionarImagem(file, 1600, 900, 0.85);
      setBackgroundUrl(dataUrl);
      toast('Fundo carregado! Clique em Salvar Ficha para gravar.', 'sucesso');
    } catch (err) {
      console.error('Erro ao processar imagem de fundo:', err);
      toast('Erro ao processar imagem de fundo.', 'erro');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Limita atributos a exatamente 2 dígitos inteiros (0 a 99)
  const handleAttrChange = (key, val) => {
    if (somenteLeitura) return;
    if (val === '') {
      setAtributos((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const cleanStr = String(val).replace(/\D/g, '').slice(0, 2);
    const num = Math.min(99, Math.max(0, Number(cleanStr) || 0));
    setAtributos((prev) => ({ ...prev, [key]: num }));
  };

  const handleTogglePericia = (periciaId) => {
    if (somenteLeitura) return;
    setPericias((prev) => ({
      ...prev,
      [periciaId]: !prev[periciaId],
    }));
  };

  const modDes = mod(atributos?.des ?? 10);
  const iniciativaCalc = fmtMod(modDes);
  const hpPct = Math.max(0, Math.min(100, Math.round((Number(pvAtual) / Math.max(1, Number(pvMax))) * 100)));
  const hpStatusClass = hpPct < 25 ? 'hp-critical' : (hpPct < 50 ? 'hp-warning' : 'hp-normal');

  const statsContexto = useMemo(() => {
    const mods = {
      for: mod(atributos?.for ?? 10),
      str: mod(atributos?.for ?? 10),
      des: mod(atributos?.des ?? 10),
      dex: mod(atributos?.des ?? 10),
      con: mod(atributos?.con ?? 10),
      int: mod(atributos?.int ?? 10),
      sab: mod(atributos?.sab ?? 10),
      wis: mod(atributos?.sab ?? 10),
      car: mod(atributos?.car ?? 10),
      cha: mod(atributos?.car ?? 10),
    };
    return {
      nivel: Number(nivel) || 1,
      lvl: Number(nivel) || 1,
      prof: Number(profBonus) || 2,
      proficiencia: Number(profBonus) || 2,
      ca: Number(ca) || 10,
      scores: atributos,
      atributos,
      mods,
      modificadores: mods,
      atributo_conjuracao: 'int',
    };
  }, [atributos, nivel, profBonus, ca]);

  const handleRollAcao = (acao) => {
    const res = executarRolagemAcao(acao, statsContexto);
    setResultadoRolagem(res);
  };

  const handleSalvarConfigAcao = (acaoConfig) => {
    setAtaques((prev) => {
      const existe = prev.some((a) => String(a.id) === String(acaoConfig.id));
      if (existe) {
        return prev.map((a) => (String(a.id) === String(acaoConfig.id) ? acaoConfig : a));
      }
      return [...prev, acaoConfig];
    });
    setModalConfigAcao(null);
  };

  const handleDuplicarAcao = (acao) => {
    const copia = {
      ...acao,
      id: Date.now(),
      nome: `${acao.nome} (Cópia)`,
    };
    setAtaques((prev) => [...prev, copia]);
  };

  const handleUpdateCharges = (acaoId, novasCargas) => {
    setAtaques((prev) =>
      prev.map((a) => (String(a.id) === String(acaoId) ? { ...a, cargas_atuais: novasCargas } : a))
    );
  };

  const handleDescansoCurto = () => {
    setAtaques((prev) => aplicarDescansoAcoes(prev, 'short_rest'));
  };

  const handleDescansoLongo = () => {
    setAtaques((prev) => aplicarDescansoAcoes(prev, 'long_rest'));
    setPvAtual(pvMax);
    setSpellSlots((prev) => {
      const n = { ...prev };
      Object.keys(n).forEach((k) => {
        n[k] = { ...n[k], gastos: 0 };
      });
      return n;
    });
  };

  const handleRemoveAtaque = (id) => {
    setAtaques(ataques.filter((a) => a.id !== id));
  };

  const handleSalvar = () => {
    const dados = {
      ...dInicial,
      classe,
      raca,
      antecedente,
      nivel: Number(nivel) || 1,
      avatar_url: avatarUrl,
      token_url: avatarUrl,
      background_url: backgroundUrl,
      cor_tema: corTema,
      pv_atual: Number(pvAtual) || 0,
      pv_total: Number(pvMax) || 0,
      pvTemp: Number(pvTemp) || 0,
      dadosVida,
      ca: Number(ca) || 10,
      deslocamento,
      profBonus: Number(profBonus) || 2,
      atributos: {
        for: Number(atributos.for) || 10,
        des: Number(atributos.des) || 10,
        con: Number(atributos.con) || 10,
        int: Number(atributos.int) || 10,
        sab: Number(atributos.sab) || 10,
        car: Number(atributos.car) || 10,
      },
      for: Number(atributos.for) || 10,
      destreza: Number(atributos.des) || 10,
      constituicao: Number(atributos.con) || 10,
      inteligencia: Number(atributos.int) || 10,
      sabedoria: Number(atributos.sab) || 10,
      carisma: Number(atributos.car) || 10,
      iniciativa: modDes,
      pericias,
      ataques,
      acoes: ataques,
      spellSlots,
      magias,
      moedas,
      equipamento,
      tracos,
      historia,
      bg_brightness: Number(bgBrightness) || 24,
      bg_blur: Number(bgBlur) || 10,
      bg_overlay: Number(bgOverlay) || 75,
      bg_config: {
        brightness: Number(bgBrightness) || 24,
        blur: Number(bgBlur) || 10,
        overlay: Number(bgOverlay) || 75,
      },
    };

    if (onSalvar) {
      onSalvar({
        id: ficha?.id,
        nome: (nomePersonagem || 'Personagem').trim(),
        nome_personagem: (nomePersonagem || 'Personagem').trim(),
        raca,
        classe,
        subclasse: subclasse || null,
        nivel: Number(nivel) || 1,
        antecedente,
        alinhamento,
        avatar_url: avatarUrl,
        token_url: avatarUrl,
        background_url: backgroundUrl,
        cor_tema: corTema,
        bg_brightness: Number(bgBrightness) || 24,
        bg_blur: Number(bgBlur) || 10,
        bg_overlay: Number(bgOverlay) || 75,
        // Colunas no banco
        pv_atual: Number(pvAtual) || 0,
        pv_total: Number(pvMax) || 0,
        pv_temp: Number(pvTemp) || 0,
        dados_vida: dadosVida || '1d8',
        ca: Number(ca) || 10,
        deslocamento: deslocamento || '30ft',
        iniciativa: Number(modDes) || 0,
        proficiencia: Number(profBonus) || 2,
        forca: Number(atributos.for) || 10,
        destreza: Number(atributos.des) || 10,
        constituicao: Number(atributos.con) || 10,
        inteligencia: Number(atributos.int) || 10,
        sabedoria: Number(atributos.sab) || 10,
        carisma: Number(atributos.car) || 10,
        pericias,
        ataques,
        acoes: ataques,
        magias,
        espacos_magia: spellSlots,
        moedas,
        equipamento,
        tracos,
        historia,
        dados_ficha: dados,
        dados,
      });
    }
  };

  return (
    <div className="sheet-container-nexus">
      {/* Input oculto para carregar arquivo de avatar / token */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleUploadAvatar}
      />

      {/* Input oculto para carregar background (Máx 5MB) */}
      <input
        type="file"
        ref={bgFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleUploadBg}
      />

      {/* Barra de Ações Superior */}
      <div className="sheet-top-action-bar">
        <button type="button" className="nexus-btn-back" onClick={onVoltar}>
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Voltar</span>
        </button>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!somenteLeitura && (
            <button
              type="button"
              className="nexus-btn-secondary"
              style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
              onClick={() => setModalTema(true)}
              title="Personalizar Fundo e Cores do Cabeçalho"
            >
              <span className="material-symbols-outlined text-sm">palette</span>
              <span>Personalizar Fundo</span>
            </button>
          )}

          {somenteLeitura && (
            <span className="nexus-badge-system" style={{ borderColor: 'rgba(229, 197, 135, 0.4)' }}>
              🔒 Somente Leitura
            </span>
          )}

          {!somenteLeitura && (
            <button type="button" className="gold-gradient-btn nexus-btn-create" onClick={handleSalvar}>
              <span className="material-symbols-outlined text-[18px]">save</span>
              <span>Salvar Ficha</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= HERO CARD DO PERSONAGEM (COM FUNDO BLUR/ESCURECIDO) ================= */}
      <div className="sheet-hero-card hex-card">
        {/* Botão de 3 Pontinhos no Canto para Personalizar Banner (Fundo, Claridade, Blur) */}
        {!somenteLeitura && (
          <div className="sheet-hero-banner-menu">
            <button
              type="button"
              className="sheet-hero-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setModalTema(true);
              }}
              title="Personalizar Fundo, Blur e Claridade do Banner"
            >
              <span className="material-symbols-outlined text-[20px]">more_horiz</span>
            </button>
          </div>
        )}

        {/* Fundo Personalizado com Blur e Escurecimento Ajustáveis para Foco nos Dados */}
        {backgroundUrl && (
          <div
            className="sheet-hero-bg-layer"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              filter: `blur(${bgBlur}px) brightness(${bgBrightness / 100}) saturate(1.2)`,
            }}
          />
        )}
        <div
          className="sheet-hero-bg-overlay"
          style={{
            background: `radial-gradient(circle at 25% 50%, rgba(4, 14, 34, ${Math.max(0.15, (bgOverlay - 30) / 100)}) 0%, rgba(4, 14, 34, ${bgOverlay / 100}) 100%)`,
          }}
        />

        {/* Retrato / Token do Personagem com Botão de Upload e Badge de Nível */}
        <div
          className="sheet-portrait-frame"
          onClick={() => !somenteLeitura && fileInputRef.current?.click()}
          title={somenteLeitura ? 'Retrato do Personagem' : 'Clique para carregar Token / Imagem'}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Token do Personagem" className="sheet-portrait-img" />
          ) : (
            <div className="sheet-portrait-art">
              <span className="material-symbols-outlined text-5xl text-primary/70">shield_person</span>
            </div>
          )}

          {/* Overlay com botão de carregar token no hover */}
          {!somenteLeitura && (
            <div className="sheet-portrait-upload-overlay">
              <span className="material-symbols-outlined">add_a_photo</span>
              <span className="sheet-portrait-upload-text">Carregar Token</span>
            </div>
          )}

          {/* Badge circular de Nível sobreposta na borda inferior */}
          <div className="sheet-lvl-circle">
            <span className="sheet-lvl-text">LVL</span>
            <span className="sheet-lvl-val">{nivel}</span>
          </div>
        </div>

        {/* Informações Principais & Barra de Vida */}
        <div className="sheet-hero-main">
          <div className="sheet-hero-title-row">
            <div className="sheet-name-wrapper">
              <input
                type="text"
                className="sheet-name-input-styled"
                value={nomePersonagem}
                onChange={(e) => setNomePersonagem(e.target.value)}
                placeholder="NOME DO PERSONAGEM"
                readOnly={somenteLeitura}
              />
            </div>

            {/* Badges de Classe, Raça e Antecedente */}
            <div className="sheet-subtitle-badges">
              <span className="sheet-sub-chip">
                <span className="material-symbols-outlined text-[16px] text-primary">swords</span>
                <input
                  type="text"
                  value={classe}
                  onChange={(e) => setClasse(e.target.value)}
                  className="sheet-sub-input"
                  placeholder="Classe"
                  readOnly={somenteLeitura}
                />
              </span>

              <span className="sheet-sub-chip">
                <span className="material-symbols-outlined text-[16px] text-secondary">face</span>
                <input
                  type="text"
                  value={raca}
                  onChange={(e) => setRaca(e.target.value)}
                  className="sheet-sub-input"
                  placeholder="Raça"
                  readOnly={somenteLeitura}
                />
              </span>

              <span className="sheet-sub-chip">
                <span className="material-symbols-outlined text-[16px] text-tertiary">star</span>
                <input
                  type="text"
                  value={antecedente}
                  onChange={(e) => setAntecedente(e.target.value)}
                  className="sheet-sub-input"
                  placeholder="Antecedente"
                  readOnly={somenteLeitura}
                />
              </span>
            </div>
          </div>

          {/* Barra de Hit Points (PV) */}
          <div className="sheet-hp-section">
            <div className="sheet-hp-labels">
              <span className="sheet-hp-title">HIT POINTS</span>
              <div className="sheet-hp-numbers">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  className={`sheet-hp-input ${hpStatusClass}`}
                  value={pvAtual}
                  onChange={(e) => setPvAtual(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  readOnly={somenteLeitura}
                />
                <span style={{ color: 'var(--color-on-surface-variant)', margin: '0 2px' }}>/</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  className="sheet-hp-input"
                  style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                  value={pvMax}
                  onChange={(e) => setPvMax(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  readOnly={somenteLeitura}
                />
              </div>
            </div>

            {/* Barra de Progresso com Glow e Animação Dinâmica */}
            <div className="sheet-hp-track">
              <div className={`sheet-hp-bar ${hpStatusClass}`} style={{ width: `${hpPct}%` }} />
            </div>

            {/* Badges de HP Adicionais */}
            <div className="sheet-hp-aux-row">
              <div className="sheet-hp-pill">
                <span>Temp HP:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={pvTemp}
                  onChange={(e) => setPvTemp(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="sheet-hp-aux-input"
                  readOnly={somenteLeitura}
                />
              </div>

              <div className="sheet-hp-pill">
                <span>Hit Dice:</span>
                <input
                  type="text"
                  value={dadosVida}
                  onChange={(e) => setDadosVida(e.target.value)}
                  className="sheet-hp-aux-input"
                  style={{ width: '50px' }}
                  readOnly={somenteLeitura}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= COMBAT TRIO & PROFICIENCY ================= */}
      <div className="sheet-trio-row">
        <div className="sheet-stat-pill hex-card">
          <span className="material-symbols-outlined text-2xl text-primary">shield</span>
          <div className="sheet-stat-pill-val">
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={ca}
              onChange={(e) => setCa(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="sheet-trio-input"
              readOnly={somenteLeitura}
            />
          </div>
          <span className="sheet-stat-pill-lbl">Armor Class</span>
        </div>

        <div className="sheet-stat-pill hex-card">
          <span className="material-symbols-outlined text-2xl text-secondary">speed</span>
          <div className="sheet-stat-pill-val text-secondary">{iniciativaCalc}</div>
          <span className="sheet-stat-pill-lbl">Initiative</span>
        </div>

        <div className="sheet-stat-pill hex-card">
          <span className="material-symbols-outlined text-2xl text-primary">directions_run</span>
          <div className="sheet-stat-pill-val">
            <input
              type="text"
              value={deslocamento}
              onChange={(e) => setDeslocamento(e.target.value)}
              className="sheet-trio-input"
              style={{ fontSize: '18px', width: '64px' }}
              readOnly={somenteLeitura}
            />
          </div>
          <span className="sheet-stat-pill-lbl">Speed</span>
        </div>

        {/* Proficiency Bonus Box */}
        <div className="sheet-prof-box hex-card">
          <span className="sheet-prof-lbl">Proficiency Bonus</span>
          <span className="sheet-prof-val">+{profBonus}</span>
        </div>
      </div>

      {/* ================= 3-COLUMN MAIN LAYOUT ================= */}
      <div className="sheet-grid-3cols">
        {/* COLUNA 1: ATRIBUTOS (2 DÍGITOS MAX: 0-99) + RADAR CHART */}
        <div className="sheet-col-left">
          <div className="sheet-attributes-card hex-card">
            {ATRIBUTOS_INFO.map((a) => {
              const score = atributos?.[a.id] ?? 10;
              const m = mod(score);
              return (
                <div key={a.id} className="sheet-diamond-attr-row">
                  <span className="sheet-attr-sigla">{a.sigla}</span>

                  <div className="sheet-diamond-frame">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={atributos?.[a.id] ?? ''}
                      onChange={(e) => handleAttrChange(a.id, e.target.value)}
                      className="sheet-attr-score-input"
                      style={{ textAlign: 'center', width: '36px' }}
                      placeholder="10"
                      readOnly={somenteLeitura}
                    />
                  </div>

                  <span className="sheet-attr-mod-val">{fmtMod(m)}</span>
                </div>
              );
            })}
          </div>

          {/* Gráfico de Radar de Atributos */}
          <RadarChart atributos={atributos} />
        </div>

        {/* COLUNA 2: SKILLS (PERÍCIAS) */}
        <div className="sheet-col-mid">
          <div className="sheet-skills-card hex-card">
            <h3 className="sheet-card-heading">Skills</h3>

            <div className="sheet-skills-list">
              {PERICIAS_DD.map((p) => {
                const treinada = !!pericias?.[p.id];
                const mAttr = mod(atributos?.[p.attr] ?? 10);
                const total = mAttr + (treinada ? Number(profBonus || 2) : 0);

                return (
                  <div
                    key={p.id}
                    className={`sheet-skill-row ${treinada ? 'trained' : ''}`}
                    onClick={() => handleTogglePericia(p.id)}
                  >
                    <span className="sheet-skill-dot">
                      {treinada ? '🟢' : '⚪'}
                    </span>
                    <span className="sheet-skill-name">
                      {p.nome} <span className="sheet-skill-governing">({ATRIBUTOS_INFO.find((x) => x.id === p.attr)?.sigla})</span>
                    </span>
                    <span className="sheet-skill-total">{fmtMod(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUNA 3: TABS DE AÇÕES, MAGIAS, INVENTÁRIO E TRAÇOS */}
        <div className="sheet-col-right">
          {/* Navegação por Abas */}
          <div className="sheet-nav-tabs">
            <button
              type="button"
              className={`sheet-tab-btn ${tabAtiva === 'actions' ? 'active' : ''}`}
              onClick={() => setTabAtiva('actions')}
            >
              Actions
            </button>
            <button
              type="button"
              className={`sheet-tab-btn ${tabAtiva === 'spells' ? 'active' : ''}`}
              onClick={() => setTabAtiva('spells')}
            >
              Spells
            </button>
            <button
              type="button"
              className={`sheet-tab-btn ${tabAtiva === 'inventory' ? 'active' : ''}`}
              onClick={() => setTabAtiva('inventory')}
            >
              Inventory
            </button>
            <button
              type="button"
              className={`sheet-tab-btn ${tabAtiva === 'traits' ? 'active' : ''}`}
              onClick={() => setTabAtiva('traits')}
            >
              Traits
            </button>
          </div>

          {/* CONTEÚDO DA ABA ACTIONS (MOBA STYLE) */}
          {tabAtiva === 'actions' && (
            <div className="sheet-tab-pane">
              <div className="moba-action-bar-wrap">
                {/* Barra de Descansos e Ações Rápidas */}
                <div className="moba-rest-bar">
                  <div className="moba-rest-actions">
                    {!somenteLeitura && (
                      <>
                        <button
                          type="button"
                          className="moba-rest-btn"
                          onClick={handleDescansoCurto}
                          title="Descanso Curto (1h) — Restaura habilidades com Short Rest"
                        >
                          <span className="material-symbols-outlined text-[16px] text-amber-300">coffee</span>
                          <span>Descanso Curto</span>
                        </button>

                        <button
                          type="button"
                          className="moba-rest-btn"
                          onClick={handleDescansoLongo}
                          title="Descanso Longo (8h) — Restaura todos os PVs, Magias e Cargas"
                        >
                          <span className="material-symbols-outlined text-[16px] text-teal-300">hotel</span>
                          <span>Descanso Longo</span>
                        </button>
                      </>
                    )}
                  </div>

                  {!somenteLeitura && (
                    <button
                      type="button"
                      className="gold-gradient-btn"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() => setModalConfigAcao({ modo: 'criar', acao: null })}
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Nova Habilidade</span>
                    </button>
                  )}
                </div>

                {/* Grid MOBA de Action Slots */}
                <div className="moba-action-grid">
                  {Array.isArray(ataques) &&
                    ataques.map((act) => (
                      <ActionSlot
                        key={act.id}
                        action={act}
                        characterStats={statsContexto}
                        onRoll={handleRollAcao}
                        onEdit={(a) => setModalConfigAcao({ modo: 'editar', acao: a })}
                        onDuplicate={handleDuplicarAcao}
                        onDelete={handleRemoveAtaque}
                        onUpdateCharges={handleUpdateCharges}
                        readOnly={somenteLeitura}
                      />
                    ))}
                </div>

                {(!ataques || ataques.length === 0) && (
                  <div
                    className="hex-card"
                    style={{ padding: '32px 16px', textAlign: 'center', borderRadius: '10px' }}
                  >
                    <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', margin: 0 }}>
                      Nenhuma habilidade configurada. Clique em "Nova Habilidade" para criar ataques, magias ou manobras.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA SPELLS */}
          {tabAtiva === 'spells' && (
            <div className="sheet-tab-pane">
              <div className="sheet-action-card hex-card" style={{ marginBottom: '20px' }}>
                <h4 className="sheet-action-title">Conjuração & CD</h4>
                <div className="sheet-action-stats" style={{ marginTop: '10px' }}>
                  <div>
                    <span className="sheet-stat-sub-lbl">Atributo Chave</span>
                    <span className="sheet-stat-sub-val text-primary">INT</span>
                  </div>
                  <div>
                    <span className="sheet-stat-sub-lbl">CD para Evitar</span>
                    <span className="sheet-stat-sub-val text-secondary">{8 + Number(profBonus || 2) + mod(atributos?.int ?? 10)}</span>
                  </div>
                  <div>
                    <span className="sheet-stat-sub-lbl">Bônus de Ataque</span>
                    <span className="sheet-stat-sub-val text-secondary">{fmtMod(Number(profBonus || 2) + mod(atributos?.int ?? 10))}</span>
                  </div>
                </div>
              </div>

              {/* Slots de Magia */}
              <div className="sheet-action-card hex-card">
                <h4 className="sheet-action-title">Espaços de Magia</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '14px' }}>
                  {[1, 2, 3].map((lvl) => {
                    const slot = spellSlots?.[lvl] || { total: 0, gastos: 0 };
                    const gastos = Number(slot.gastos) || 0;
                    const total = Number(slot.total) || 0;
                    const restantes = Math.max(0, total - gastos);
                    return (
                      <div key={lvl} style={{ background: 'rgba(4, 14, 34, 0.6)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)' }}>{lvl}º Círculo</span>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', margin: '4px 0' }}>
                          {restantes} / {total}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA INVENTORY */}
          {tabAtiva === 'inventory' && (
            <div className="sheet-tab-pane">
              <div className="sheet-action-card hex-card" style={{ marginBottom: '20px' }}>
                <h4 className="sheet-action-title">Bolsa de Moedas</h4>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <div className="sheet-coin-box">
                    <span className="sheet-coin-lbl">PO</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={moedas?.po ?? 0}
                      onChange={(e) => setMoedas({ ...moedas, po: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                      className="sheet-coin-input"
                      readOnly={somenteLeitura}
                    />
                  </div>
                  <div className="sheet-coin-box">
                    <span className="sheet-coin-lbl" style={{ color: '#c5cad4' }}>PP</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={moedas?.pp ?? 0}
                      onChange={(e) => setMoedas({ ...moedas, pp: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                      className="sheet-coin-input"
                      readOnly={somenteLeitura}
                    />
                  </div>
                  <div className="sheet-coin-box">
                    <span className="sheet-coin-lbl" style={{ color: '#d97706' }}>PC</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={moedas?.pc ?? 0}
                      onChange={(e) => setMoedas({ ...moedas, pc: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                      className="sheet-coin-input"
                      readOnly={somenteLeitura}
                    />
                  </div>
                </div>
              </div>

              <div className="sheet-action-card hex-card">
                <h4 className="sheet-action-title">Equipamentos & Itens</h4>
                <textarea
                  className="wizard-textarea"
                  rows={6}
                  value={equipamento || ''}
                  onChange={(e) => setEquipamento(e.target.value)}
                  placeholder="Liste suas armas, armaduras, poções e itens mágicos..."
                  readOnly={somenteLeitura}
                />
              </div>
            </div>
          )}

          {/* CONTEÚDO DA ABA TRAITS */}
          {tabAtiva === 'traits' && (
            <div className="sheet-tab-pane">
              <div className="sheet-action-card hex-card" style={{ marginBottom: '20px' }}>
                <h4 className="sheet-action-title">Traços de Personalidade & Habilidades</h4>
                <textarea
                  className="wizard-textarea"
                  rows={5}
                  value={tracos || ''}
                  onChange={(e) => setTracos(e.target.value)}
                  placeholder="Traços de personalidade, ideais, vínculos e fraquezas..."
                  readOnly={somenteLeitura}
                />
              </div>

              <div className="sheet-action-card hex-card">
                <h4 className="sheet-action-title">História do Personagem</h4>
                <textarea
                  className="wizard-textarea"
                  rows={5}
                  value={historia || ''}
                  onChange={(e) => setHistoria(e.target.value)}
                  placeholder="Origem, família, eventos marcantes e objetivos..."
                  readOnly={somenteLeitura}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE PERSONALIZAÇÃO DE FUNDO E CORES */}
      {modalTema && (
        <div
          className="wizard-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalTema(false);
          }}
        >
          <div className="wizard-modal-container" style={{ maxWidth: '640px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div className="wizard-sparkle-circle">
                <span className="material-symbols-outlined text-2xl">palette</span>
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '24px',
                  color: 'var(--color-primary)',
                  margin: '0 0 6px',
                }}
              >
                Personalizar Banner & Cores
              </h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', margin: 0 }}>
                Escolha o fundo atmosférico para o cabeçalho do herói (com blur e escurecimento integrados).
              </p>
            </div>

            {/* Fundos Padrão */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Imagens de Fundo
                </label>
                <span style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: 700 }}>
                  Tamanho Máximo: 5MB
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {FUNDOS_PADRAO.map((fundo) => {
                  const sel = backgroundUrl === fundo.url;
                  return (
                    <div
                      key={fundo.id}
                      onClick={() => setBackgroundUrl(fundo.url)}
                      style={{
                        height: '76px',
                        borderRadius: '8px',
                        backgroundImage: `url(${fundo.url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        border: sel ? '2px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: sel ? '0 0 14px rgba(229, 197, 135, 0.5)' : 'none',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'flex-end',
                        padding: '6px',
                      }}
                    >
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4, 14, 34, 0.4)' }} />
                      <span style={{ position: 'relative', zIndex: 2, fontSize: '11px', fontWeight: 700, color: '#ffffff', textShadow: '0 1px 3px #000' }}>
                        {fundo.nome}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="nexus-btn-secondary"
                  style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  onClick={() => bgFileInputRef.current?.click()}
                  title="Carregar imagem do seu computador (máximo 5MB)"
                >
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span>Carregar do Computador (Máx 5MB)</span>
                </button>
                <button
                  type="button"
                  className="nexus-btn-secondary"
                  style={{ padding: '8px 12px', fontSize: '12px' }}
                  onClick={() => setBackgroundUrl('')}
                >
                  <span>Remover Fundo</span>
                </button>
              </div>
            </div>

            {/* Ajustes Visuais do Banner (Claridade e Blur) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                  Efeitos Visuais do Banner
                </label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--color-secondary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    setBgBrightness(24);
                    setBgBlur(10);
                    setBgOverlay(75);
                  }}
                >
                  Restaurar Padrão
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Claridade / Brilho */}
                <div className="nexus-slider-group">
                  <div className="nexus-slider-header">
                    <span className="nexus-slider-label">
                      <span className="material-symbols-outlined text-[16px] text-amber-200">brightness_6</span>
                      <span>Claridade / Brilho</span>
                    </span>
                    <span className="nexus-slider-val">{bgBrightness}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={bgBrightness}
                    onChange={(e) => setBgBrightness(Number(e.target.value))}
                    className="nexus-range-slider"
                  />
                </div>

                {/* Desfoque / Blur */}
                <div className="nexus-slider-group">
                  <div className="nexus-slider-header">
                    <span className="nexus-slider-label">
                      <span className="material-symbols-outlined text-[16px] text-primary">blur_on</span>
                      <span>Desfoque / Blur</span>
                    </span>
                    <span className="nexus-slider-val">{bgBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    value={bgBlur}
                    onChange={(e) => setBgBlur(Number(e.target.value))}
                    className="nexus-range-slider"
                  />
                </div>

                {/* Escurecimento / Overlay */}
                <div className="nexus-slider-group">
                  <div className="nexus-slider-header">
                    <span className="nexus-slider-label">
                      <span className="material-symbols-outlined text-[16px] text-secondary">contrast</span>
                      <span>Escurecimento / Sombra</span>
                    </span>
                    <span className="nexus-slider-val">{bgOverlay}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={95}
                    value={bgOverlay}
                    onChange={(e) => setBgOverlay(Number(e.target.value))}
                    className="nexus-range-slider"
                  />
                </div>
              </div>
            </div>

            {/* Temas de Cor */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Paleta de Cores
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                {CORES_TEMA.map((t) => {
                  const sel = corTema === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setCorTema(t.id)}
                      style={{
                        background: t.cor,
                        border: sel ? `2px solid ${t.borda}` : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        padding: '10px 8px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        boxShadow: sel ? `0 0 12px ${t.borda}55` : 'none',
                      }}
                    >
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: t.borda, margin: '0 auto 6px' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff' }}>
                        {t.nome}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="wizard-modal-footer">
              <button type="button" className="gold-gradient-btn" style={{ width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 700 }} onClick={() => setModalTema(false)}>
                PRONTO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO AVANÇADA DE HABILIDADES */}
      {modalConfigAcao && (
        <ModalConfigAcao
          acaoInicial={modalConfigAcao.acao}
          characterStats={statsContexto}
          onSalvar={handleSalvarConfigAcao}
          onCancelar={() => setModalConfigAcao(null)}
        />
      )}

      {/* MODAL DE RESULTADO DA ROLAGEM DE AÇÃO */}
      {resultadoRolagem && (
        <ModalResultadoRolagem
          resultado={resultadoRolagem}
          onRolarNovamente={() => {
            const acaoOriginal = ataques.find((a) => String(a.id) === String(resultadoRolagem.actionId));
            if (acaoOriginal) handleRollAcao(acaoOriginal);
          }}
          onFechar={() => setResultadoRolagem(null)}
        />
      )}
    </div>
  );
}

