import { useState, useMemo, useRef } from 'react';
import { obterRetratoPorClasse } from '../../shared';
import './hextechModal.css';

// 1. Lista de Raças (Espécies) para o Passo 1
const RACAS_OFICIAIS = [
  {
    id: 'humano',
    nome: 'Humano',
    icone: 'person',
    desc: 'Versátil e Adaptável',
    deslocamento: '30ft (9m)',
    tracos: 'Versatilidade Humana: +1 em todos os atributos e proficiência adicional.',
    bonus: { for: 1, des: 1, con: 1, int: 1, sab: 1, car: 1 },
  },
  {
    id: 'elfo',
    nome: 'Elfo',
    icone: 'spa',
    desc: 'Ágil e Místico',
    deslocamento: '30ft (9m)',
    tracos: 'Visão no Escuro (60ft), Ancestralidade Feérica (imune a sono mágico), Sentidos Aguçados.',
    bonus: { des: 2, int: 1 },
  },
  {
    id: 'anao',
    nome: 'Anão',
    icone: 'hardware',
    desc: 'Resistente e Fiel',
    deslocamento: '25ft (7.5m)',
    tracos: 'Visão no Escuro (60ft), Resiliência Anã (resistência a veneno), Tenacidade de Batalha.',
    bonus: { con: 2, for: 1 },
  },
  {
    id: 'halfling',
    nome: 'Halfling',
    icone: 'eco',
    desc: 'Sortudo e Bravo',
    deslocamento: '25ft (7.5m)',
    tracos: 'Sortudo (rerrola 1s naturais no d20), Bravura (vantagem contra medo), Agilidade Halfling.',
    bonus: { des: 2, car: 1 },
  },
  {
    id: 'draconato',
    nome: 'Draconato',
    icone: 'whatshot',
    desc: 'Sopro de Dragão',
    deslocamento: '30ft (9m)',
    tracos: 'Ancestralidade Dracônica, Arma de Sopro Elemental (2d6), Resistência a Dano Elemental.',
    bonus: { for: 2, car: 1 },
  },
  {
    id: 'gnomo',
    nome: 'Gnomo',
    icone: 'settings',
    desc: 'Engenho Hextech',
    deslocamento: '25ft (7.5m)',
    tracos: 'Visão no Escuro (60ft), Astúcia Gnômica (vantagem em salvaguardas de INT, SAB e CAR).',
    bonus: { int: 2, con: 1 },
  },
  {
    id: 'meio_elfo',
    nome: 'Meio-Elfo',
    icone: 'brightness_medium',
    desc: 'Duas Luas e Graça',
    deslocamento: '30ft (9m)',
    tracos: 'Visão no Escuro (60ft), Ancestralidade Feérica, Versatilidade em Perícias.',
    bonus: { car: 2, des: 1, con: 1 },
  },
  {
    id: 'meio_orc',
    nome: 'Meio-Orc',
    icone: 'fitness_center',
    desc: 'Fúria e Força Bruta',
    deslocamento: '30ft (9m)',
    tracos: 'Visão no Escuro (60ft), Resistência Implacável (evita cair a 0 PV 1x/descanso), Ataques Selvagens.',
    bonus: { for: 2, con: 1 },
  },
  {
    id: 'tiefling',
    nome: 'Tiefling',
    icone: 'local_fire_department',
    desc: 'Chifres e Fogo Infernal',
    deslocamento: '30ft (9m)',
    tracos: 'Visão no Escuro (60ft), Resistência Infernal (resistência a dano de fogo), Legado Infernal.',
    bonus: { car: 2, int: 1 },
  },
];

// 2. Lista de Classes para o Passo 2 com Stats de Combate Balanceados
const CLASSES_OFICIAIS = [
  {
    id: 'barbaro',
    nome: 'Bárbaro',
    icone: 'gavel',
    dadoVida: '1d12',
    dadoVidaMax: 12,
    caBase: 14,
    arma: 'Machado de Batalha Duplo',
    ataque: { nome: 'Machado Grande', acerto: '+5', dano: '1d12+3', tipoDano: 'Cortante', desc: 'Golpe poderoso e pesado.' },
    atributos: { for: 16, des: 14, con: 15, int: 8, sab: 12, car: 8 },
    pericias: { atletismo: true, sobrevivencia: true, intimidacao: true },
    equipamento: 'Machado Grande, duas machadinhas de arremesso, pacote de explorador.',
    habilidades: 'Fúria Bárbara, Defesa sem Armadura.',
  },
  {
    id: 'bardo',
    nome: 'Bardo',
    icone: 'music_note',
    dadoVida: '1d8',
    dadoVidaMax: 8,
    caBase: 13,
    arma: 'Alaúde & Rapieira',
    ataque: { nome: 'Rapieira Graciosa', acerto: '+4', dano: '1d8+2', tipoDano: 'Perfurante', desc: 'Ataque ágil com arma de acuidade.' },
    atributos: { for: 8, des: 14, con: 12, int: 10, sab: 12, car: 16 },
    pericias: { atuacao: true, persuasao: true, enganacao: true, prestidigitacao: true },
    equipamento: 'Rapieira, instrumento musical (Alaúde), armadura de couro, adaga.',
    habilidades: 'Inspiração de Bardo (1d6), Conjuração de Magias.',
  },
  {
    id: 'bruxo',
    nome: 'Bruxo',
    icone: 'visibility',
    dadoVida: '1d8',
    dadoVidaMax: 8,
    caBase: 12,
    arma: 'Foco Arcano de Pacto',
    ataque: { nome: 'Raio Místico (Eldritch Blast)', acerto: '+5', dano: '1d10', tipoDano: 'Energia', desc: 'Disparo de energia pura do além.' },
    atributos: { for: 8, des: 14, con: 14, int: 12, sab: 10, car: 16 },
    pericias: { arcanismo: true, intimidacao: true, investigacao: true },
    equipamento: 'Foco arcano, adaga, armadura de couro, grimório de pacto.',
    habilidades: 'Magia de Pacto, Invocações Ocultas.',
  },
  {
    id: 'clerigo',
    nome: 'Clérigo',
    icone: 'flare',
    dadoVida: '1d8',
    dadoVidaMax: 8,
    caBase: 16,
    arma: 'Maça & Escudo Sagrado',
    ataque: { nome: 'Maça Abençoada', acerto: '+4', dano: '1d6+2', tipoDano: 'Contundente', desc: 'Arma consagrada com bênção divina.' },
    atributos: { for: 14, des: 10, con: 14, int: 10, sab: 16, car: 12 },
    pericias: { religiao: true, intuicao: true, medicina: true },
    equipamento: 'Maça, cota de malha, escudo com símbolo sagrado, pacote de sacerdote.',
    habilidades: 'Conjuração Divina, Canalizar Divindade.',
  },
  {
    id: 'druida',
    nome: 'Druida',
    icone: 'forest',
    dadoVida: '1d8',
    dadoVidaMax: 8,
    caBase: 13,
    arma: 'Bordão de Madeira & Foice',
    ataque: { nome: 'Bordão Ancestral', acerto: '+3', dano: '1d6+1', tipoDano: 'Contundente', desc: 'Madeira viva canalizada com magia natural.' },
    atributos: { for: 10, des: 12, con: 14, int: 12, sab: 16, car: 8 },
    pericias: { natureza: true, lidarAnimais: true, sobrevivencia: true },
    equipamento: 'Bordão de madeira, escudo de couro, foco druídico, pacote de explorador.',
    habilidades: 'Conjuração Druídica, Forma Selvagem.',
  },
  {
    id: 'feiticeiro',
    nome: 'Feiticeiro',
    icone: 'electric_bolt',
    dadoVida: '1d6',
    dadoVidaMax: 6,
    caBase: 12,
    arma: 'Chama Arcana Caótica',
    ataque: { nome: 'Raio de Fogo', acerto: '+5', dano: '1d10', tipoDano: 'Fogo', desc: 'Feitiço instintivo ardente.' },
    atributos: { for: 8, des: 14, con: 14, int: 10, sab: 10, car: 16 },
    pericias: { arcanismo: true, enganacao: true, intimidacao: true },
    equipamento: 'Duas adagas, foco arcano de cristal, pacote de aventureiro.',
    habilidades: 'Magia Inata, Origem de Feitiçaria, Metamagia.',
  },
  {
    id: 'guerreiro',
    nome: 'Guerreiro',
    icone: 'shield',
    dadoVida: '1d10',
    dadoVidaMax: 10,
    caBase: 16,
    arma: 'Espada Longa & Escudo',
    ataque: { nome: 'Espada Longa', acerto: '+5', dano: '1d8+3', tipoDano: 'Cortante', desc: 'Cortes precisos e treinados.' },
    atributos: { for: 16, des: 13, con: 15, int: 10, sab: 12, car: 8 },
    pericias: { atletismo: true, percepcao: true, intimidacao: true },
    equipamento: 'Cota de malha, espada longa, escudo de metal, besta leve com 20 virotes.',
    habilidades: 'Estilo de Luta, Retomar o Fôlego (1d10+1), Surto de Ação.',
  },
  {
    id: 'ladino',
    nome: 'Ladino',
    icone: 'vpn_key',
    dadoVida: '1d8',
    dadoVidaMax: 8,
    caBase: 14,
    arma: 'Par de Adagas Sombrias',
    ataque: { nome: 'Adaga Furtiva', acerto: '+5', dano: '1d4+3', tipoDano: 'Perfurante', desc: 'Ataque de precisão com bônus de Ataque Furtivo (+1d6).' },
    atributos: { for: 8, des: 16, con: 12, int: 14, sab: 10, car: 14 },
    pericias: { furtividade: true, prestidigitacao: true, acrobacia: true, investigacao: true },
    equipamento: 'Rapieira, arco curto com 20 flechas, duas adagas, ferramentas de ladrão.',
    habilidades: 'Ataque Furtivo (+1d6), Especialização, Ação Astuta.',
  },
  {
    id: 'mago',
    nome: 'Mago',
    icone: 'auto_stories',
    dadoVida: '1d6',
    dadoVidaMax: 6,
    caBase: 12,
    arma: 'Grimório & Cajado Arcano',
    ataque: { nome: 'Raio de Gelo', acerto: '+5', dano: '1d8', tipoDano: 'Frio', desc: 'Raio congelante que reduz o movimento do alvo em 10ft.' },
    atributos: { for: 8, des: 14, con: 13, int: 16, sab: 12, car: 10 },
    pericias: { arcanismo: true, historia: true, investigacao: true },
    equipamento: 'Grimório encadernado em couro, bordão arcano, bolsa de componentes.',
    habilidades: 'Conjuração Arcana, Recuperação Arcana, Tradição Arcana.',
  },
  {
    id: 'monge',
    nome: 'Monge',
    icone: 'sports_martial_arts',
    dadoVida: '1d8',
    dadoVidaMax: 8,
    caBase: 15,
    arma: 'Punhos Fechados com Bandagens',
    ataque: { nome: 'Golpe Desarmado', acerto: '+5', dano: '1d4+3', tipoDano: 'Contundente', desc: 'Golpe marcial canalizado com Ki.' },
    atributos: { for: 10, des: 16, con: 13, int: 10, sab: 15, car: 8 },
    pericias: { acrobacia: true, atletismo: true, intuicao: true },
    equipamento: 'Lança curta, 10 dardos, pacote de explorador.',
    habilidades: 'Artes Marciais (1d4), Defesa sem Armadura (10+DES+SAB), Pontos de Ki.',
  },
  {
    id: 'paladino',
    nome: 'Paladino',
    icone: 'military_tech',
    dadoVida: '1d10',
    dadoVidaMax: 10,
    caBase: 16,
    arma: 'Espada de Duas Mãos & Luz Divina',
    ataque: { nome: 'Espada Larga', acerto: '+5', dano: '2d6+3', tipoDano: 'Cortante', desc: 'Espada pesada abençoada pelo juramento.' },
    atributos: { for: 16, des: 10, con: 14, int: 8, sab: 10, car: 15 },
    pericias: { atletismo: true, persuasao: true, religiao: true },
    equipamento: 'Cota de malha, espada larga, 5 dardos, símbolo sagrado.',
    habilidades: 'Sentido Divino, Cura pelas Mãos (5 PV), Destruição Divina (Divine Smite).',
  },
  {
    id: 'patrulheiro',
    nome: 'Patrulheiro',
    icone: 'track_changes',
    dadoVida: '1d10',
    dadoVidaMax: 10,
    caBase: 14,
    arma: 'Arco Longo de Precisão',
    ataque: { nome: 'Arco Longo', acerto: '+5', dano: '1d8+3', tipoDano: 'Perfurante', desc: 'Disparo de longa distância com mira certeira.' },
    atributos: { for: 12, des: 16, con: 13, int: 10, sab: 14, car: 8 },
    pericias: { sobrevivencia: true, percepcao: true, furtividade: true, natureza: true },
    equipamento: 'Armadura de couro batido, duas espadas curtas, arco longo com aljava e 20 flechas.',
    habilidades: 'Inimigo Favorito, Explorador Natural.',
  },
];

export default function ModalCriacaoCampeaoHextech({
  campanhas = [],
  campanhaPadraoId,
  onCriar,
  onCancelar,
}) {
  const [passo, setPasso] = useState(1); // 1: Raça, 2: Classe, 3: Resumo

  // Estado das Opções
  const [racas, setRacas] = useState(RACAS_OFICIAIS);
  const [racaSelecionada, setRacaSelecionada] = useState(null);

  const [classes, setClasses] = useState(CLASSES_OFICIAIS);
  const [classeSelecionada, setClasseSelecionada] = useState(null);

  // Passo 3: Dados Finais
  const [nomeCampeao, setNomeCampeao] = useState('');
  const [campanhaId, setCampanhaId] = useState(campanhaPadraoId || (campanhas[0]?.id || ''));
  const [salvando, setSalvando] = useState(false);

  // Diálogo Prompt Customizado
  const [dialogoCustomAberto, setDialogoCustomAberto] = useState(false);
  const [customInputNome, setCustomInputNome] = useState('');

  // Refs para scroll lateral
  const scrollTrackRef = useRef(null);

  const scrollLateral = (offset) => {
    if (scrollTrackRef.current) {
      scrollTrackRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Validação do botão Continuar
  const podeContinuar = useMemo(() => {
    if (passo === 1) return Boolean(racaSelecionada);
    if (passo === 2) return Boolean(classeSelecionada);
    if (passo === 3) return Boolean(nomeCampeao.trim()) && !salvando;
    return false;
  }, [passo, racaSelecionada, classeSelecionada, nomeCampeao, salvando]);

  // Abre diálogo de criar customizado
  const handleAbrirCustom = () => {
    setCustomInputNome('');
    setDialogoCustomAberto(true);
  };

  // Salva o item customizado e já o seleciona
  const handleConfirmarCustom = (e) => {
    e.preventDefault();
    const nomeLimpo = customInputNome.trim();
    if (!nomeLimpo) return;

    if (passo === 1) {
      const novaRaca = {
        id: 'custom_raca_' + Date.now(),
        nome: nomeLimpo,
        icone: 'fingerprint',
        desc: 'Raça Personalizada',
        deslocamento: '30ft (9m)',
        tracos: 'Traços biológicos e ancestrais únicos criados pelo jogador.',
        bonus: { for: 1, des: 1, con: 1 },
      };
      setRacas((prev) => [...prev, novaRaca]);
      setRacaSelecionada(novaRaca);
    } else if (passo === 2) {
      const novaClasse = {
        id: 'custom_classe_' + Date.now(),
        nome: nomeLimpo,
        icone: 'military_tech',
        arma: 'Armamento Personalizado',
        dadoVida: '1d8',
        dadoVidaMax: 8,
        caBase: 14,
        ataque: { nome: 'Arma Customizada', acerto: '+4', dano: '1d8+2', tipoDano: 'Físico', desc: 'Ataque com estilo marcial próprio.' },
        atributos: { for: 14, des: 14, con: 14, int: 10, sab: 12, car: 10 },
        pericias: { atletismo: true, percepcao: true },
        equipamento: 'Armadura inicial, arma personalizada, pacote de aventureiro.',
        habilidades: 'Habilidades marcantes da classe criada pelo jogador.',
      };
      setClasses((prev) => [...prev, novaClasse]);
      setClasseSelecionada(novaClasse);
    }

    setDialogoCustomAberto(false);
  };

  // Avançar ou Gerar Ficha no Supabase
  const handleAvancarOuFinalizar = async () => {
    if (passo === 1 && racaSelecionada) {
      setPasso(2);
    } else if (passo === 2 && classeSelecionada) {
      setPasso(3);
    } else if (passo === 3 && nomeCampeao.trim() && !salvando) {
      setSalvando(true);

      const racaNome = racaSelecionada?.nome || 'Humano';
      const classeNome = classeSelecionada?.nome || 'Guerreiro';
      const avatarPadrao = obterRetratoPorClasse(classeNome);

      // Combina atributos base da classe com bônus da raça
      const baseAttr = classeSelecionada?.atributos || { for: 15, des: 14, con: 14, int: 10, sab: 12, car: 10 };
      const racaBonus = racaSelecionada?.bonus || { for: 1, des: 1, con: 1, int: 1, sab: 1, car: 1 };

      const atributosFinais = {
        for: (baseAttr.for || 10) + (racaBonus.for || 0),
        des: (baseAttr.des || 10) + (racaBonus.des || 0),
        con: (baseAttr.con || 10) + (racaBonus.con || 0),
        int: (baseAttr.int || 10) + (racaBonus.int || 0),
        sab: (baseAttr.sab || 10) + (racaBonus.sab || 0),
        car: (baseAttr.car || 10) + (racaBonus.car || 0),
      };

      const conMod = Math.floor((atributosFinais.con - 10) / 2);
      const desMod = Math.floor((atributosFinais.des - 10) / 2);
      const pvMax = (classeSelecionada?.dadoVidaMax || 10) + conMod;

      const periciasCombinadas = {
        ...(classeSelecionada?.pericias || { atletismo: true, percepcao: true }),
      };

      const listaAtaques = [];
      if (classeSelecionada?.ataque) {
        listaAtaques.push({
          id: 1,
          nome: classeSelecionada.ataque.nome,
          tipo: 'Ataque',
          acerto: classeSelecionada.ataque.acerto,
          dano: classeSelecionada.ataque.dano,
          tipoDano: classeSelecionada.ataque.tipoDano,
          desc: classeSelecionada.ataque.desc,
        });
      }

      const tracosCompletos = [
        `[Ancestralidade: ${racaNome}]: ${racaSelecionada?.tracos || 'Herança lendária.'}`,
        `[Treinamento de ${classeNome}]: ${classeSelecionada?.habilidades || 'Mestre de combate.'}`,
      ].join('\n\n');

      try {
        await onCriar({
          nome: nomeCampeao.trim(),
          raca: racaNome,
          classe: classeNome,
          subclasse: null,
          nivel: 1,
          antecedente: 'Aventureiro',
          alinhamento: 'Neutro e Bom',
          campanhaId: campanhaId || null,
          avatar_url: avatarPadrao,
          token_url: avatarPadrao,
          background_url: avatarPadrao,
          dadosIniciais: {
            avatar_url: avatarPadrao,
            token_url: avatarPadrao,
            pv_total: pvMax,
            pv_atual: pvMax,
            pvTemp: 0,
            ca: classeSelecionada?.caBase || (10 + desMod),
            deslocamento: racaSelecionada?.deslocamento || '30ft (9m)',
            iniciativa: desMod,
            profBonus: 2,
            dadosVida: classeSelecionada?.dadoVida || '1d10',
            for: atributosFinais.for,
            des: atributosFinais.des,
            con: atributosFinais.con,
            int: atributosFinais.int,
            sab: atributosFinais.sab,
            car: atributosFinais.car,
            pericias: periciasCombinadas,
            ataques: listaAtaques,
            magias: [],
            espacos_magia: { 1: { total: 2, gastos: 0 } },
            moedas: { pc: 0, pp: 0, pe: 0, po: 50, pl: 0 },
            equipamento: classeSelecionada?.equipamento || 'Equipamento inicial de aventureiro, poção de cura e 50 PO.',
            tracos: tracosCompletos,
            historia: `Campeão da linhagem ${racaNome}, devoto do caminho de ${classeNome}.`,
            idiomas: ['Comum'],
          },
        });
      } catch (err) {
        console.error('Erro ao invocar personagem:', err);
        setSalvando(false);
      }
    }
  };

  return (
    <div
      className="hextech-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !salvando) onCancelar();
      }}
    >
      <div className="hextech-modal-window">
        {/* Cantos estilizados Hextech */}
        <div className="hextech-corner-accent top-left" />
        <div className="hextech-corner-accent top-right" />
        <div className="hextech-corner-accent bottom-left" />
        <div className="hextech-corner-accent bottom-right" />

        {/* 1. CABEÇALHO */}
        <div className="hextech-header">
          <div className="hextech-title-group">
            <div className="hextech-gem-icon" />
            <h2 className="hextech-title">Criação de Campeão</h2>
          </div>

          <button
            type="button"
            className="hextech-btn-close"
            onClick={onCancelar}
            disabled={salvando}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* 2. CORPO DO MODAL */}
        <div className="hextech-body">
          {/* PASSO 1: RAÇA / ESPÉCIE */}
          {passo === 1 && (
            <>
              <div className="hextech-step-header">
                <h3 className="hextech-step-title">Selecione sua Origem</h3>
                <p className="hextech-step-sub">Escolha a linhagem que forjará os dons ancestrais do seu campeão.</p>
              </div>

              <div className="hextech-scroll-wrapper">
                <button
                  type="button"
                  className="hextech-scroll-arrow left"
                  onClick={() => scrollLateral(-260)}
                  title="Rolar para a esquerda"
                >
                  ◀
                </button>

                <div className="hextech-scroll-track" ref={scrollTrackRef}>
                  {racas.map((rc) => {
                    const isSelected = racaSelecionada?.id === rc.id;
                    return (
                      <div
                        key={rc.id}
                        className={`hextech-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setRacaSelecionada(rc)}
                      >
                        {/* Container dedicado de imagem / arte */}
                        <div className="hextech-card-image-slot">
                          <div className="hextech-card-art-overlay" />
                          <div className="hextech-card-icon-frame">
                            <span className="material-symbols-outlined hextech-card-icon">{rc.icone}</span>
                          </div>
                          <span className="hextech-card-hint">{rc.desc}</span>
                        </div>

                        {/* Barra de Nome */}
                        <div className="hextech-card-footer">
                          <span className="hextech-card-name">{rc.nome}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Cartão Extra Obrigatório: + Nova Raça */}
                  <div className="hextech-card-custom" onClick={handleAbrirCustom}>
                    <div className="hextech-plus-circle">+</div>
                    <span className="hextech-custom-label">Nova Raça</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="hextech-scroll-arrow right"
                  onClick={() => scrollLateral(260)}
                  title="Rolar para a direita"
                >
                  ▶
                </button>
              </div>
            </>
          )}

          {/* PASSO 2: CLASSE */}
          {passo === 2 && (
            <>
              <div className="hextech-step-header">
                <h3 className="hextech-step-title">Escolha seu Caminho</h3>
                <p className="hextech-step-sub">Defina sua disciplina bélica ou arcana para as batalhas.</p>
              </div>

              <div className="hextech-scroll-wrapper">
                <button
                  type="button"
                  className="hextech-scroll-arrow left"
                  onClick={() => scrollLateral(-260)}
                  title="Rolar para a esquerda"
                >
                  ◀
                </button>

                <div className="hextech-scroll-track" ref={scrollTrackRef}>
                  {classes.map((cl) => {
                    const isSelected = classeSelecionada?.id === cl.id;
                    return (
                      <div
                        key={cl.id}
                        className={`hextech-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setClasseSelecionada(cl)}
                      >
                        {/* Container dedicado de imagem / arte */}
                        <div className="hextech-card-image-slot">
                          <div className="hextech-card-art-overlay" />
                          <div className="hextech-card-icon-frame">
                            <span className="material-symbols-outlined hextech-card-icon">{cl.icone}</span>
                          </div>
                          <span className="hextech-card-hint">{cl.arma}</span>
                        </div>

                        {/* Barra de Nome */}
                        <div className="hextech-card-footer">
                          <span className="hextech-card-name">{cl.nome}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Cartão Extra Obrigatório: + Nova Classe */}
                  <div className="hextech-card-custom" onClick={handleAbrirCustom}>
                    <div className="hextech-plus-circle">+</div>
                    <span className="hextech-custom-label">Nova Classe</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="hextech-scroll-arrow right"
                  onClick={() => scrollLateral(260)}
                  title="Rolar para a direita"
                >
                  ▶
                </button>
              </div>
            </>
          )}

          {/* PASSO 3: CONFIRMAÇÃO FINAL */}
          {passo === 3 && (
            <>
              <div className="hextech-step-header">
                <h3 className="hextech-step-title">Confirmação Final</h3>
                <p className="hextech-step-sub">Nomeie seu campeão e revise suas escolhas antes de gerar a ficha no Supabase.</p>
              </div>

              <div className="hextech-summary-container">
                <div className="hextech-name-input-box">
                  <label className="hextech-input-label">Nome do Campeão *</label>
                  <input
                    type="text"
                    className="hextech-text-input"
                    placeholder="Ex: Valerius Starfall, Thorgar Barbaférrea, Lyra Sombralança..."
                    value={nomeCampeao}
                    onChange={(e) => setNomeCampeao(e.target.value)}
                    autoFocus
                    required
                    disabled={salvando}
                  />
                </div>

                {campanhas.length > 0 && (
                  <div className="hextech-name-input-box">
                    <label className="hextech-input-label">Vincular à Campanha</label>
                    <select
                      className="hextech-text-input"
                      value={campanhaId}
                      onChange={(e) => setCampanhaId(e.target.value)}
                      disabled={salvando}
                    >
                      {campanhas.map((c) => (
                        <option key={c.id} value={c.id}>
                          🏰 {c.titulo || c.nome}
                        </option>
                      ))}
                      <option value="">⚔️ Herói Avulso (Sem campanha)</option>
                    </select>
                  </div>
                )}

                <div className="hextech-summary-cards-row">
                  <div className="hextech-summary-block">
                    <div className="hextech-block-icon">
                      <span className="material-symbols-outlined text-2xl">{racaSelecionada?.icone || 'person'}</span>
                    </div>
                    <div className="hextech-block-info">
                      <span className="hextech-block-label">Origem / Raça</span>
                      <span className="hextech-block-val">{racaSelecionada?.nome}</span>
                    </div>
                  </div>

                  <div className="hextech-summary-block">
                    <div className="hextech-block-icon">
                      <span className="material-symbols-outlined text-2xl">{classeSelecionada?.icone || 'shield'}</span>
                    </div>
                    <div className="hextech-block-info">
                      <span className="hextech-block-label">Caminho / Classe</span>
                      <span className="hextech-block-val">{classeSelecionada?.nome}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. RODAPÉ HEXTECH */}
        <div className="hextech-footer">
          {/* Botão Anterior */}
          <button
            type="button"
            className="hextech-btn-nav hextech-btn-prev"
            disabled={passo === 1 || salvando}
            onClick={() => setPasso((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>

          {/* 3 Losangos Interligados */}
          <div className="hextech-progress-bar">
            <div className={`hextech-diamond-node ${passo === 1 ? 'active' : passo > 1 ? 'completed' : ''}`} />
            <div className={`hextech-progress-line ${passo >= 2 ? 'active' : ''}`} />
            <div className={`hextech-diamond-node ${passo === 2 ? 'active' : passo > 2 ? 'completed' : ''}`} />
            <div className={`hextech-progress-line ${passo >= 3 ? 'active' : ''}`} />
            <div className={`hextech-diamond-node ${passo === 3 ? 'active' : ''}`} />
          </div>

          {/* Botão Continuar / Gerar Ficha */}
          <button
            type="button"
            className="hextech-btn-nav hextech-btn-next"
            disabled={!podeContinuar || salvando}
            onClick={handleAvancarOuFinalizar}
          >
            {salvando ? 'Invocando...' : passo === 3 ? 'Gerar Ficha' : 'Continuar'}
          </button>
        </div>

        {/* DIÁLOGO PROMPT EMBUTIDO PARA CRIAR PERSONALIZADO */}
        {dialogoCustomAberto && (
          <div className="hextech-custom-dialog-backdrop">
            <form onSubmit={handleConfirmarCustom} className="hextech-custom-dialog">
              <h4 className="hextech-dialog-title">
                {passo === 1 ? 'Digite o nome da nova Raça/Origem' : 'Digite o nome da nova Classe/Caminho'}
              </h4>

              <input
                type="text"
                className="hextech-text-input"
                placeholder={passo === 1 ? 'Ex: Aasimar, Goliath, Tabaxi...' : 'Ex: Artífice, Pistoleiro, Alquimista...'}
                value={customInputNome}
                onChange={(e) => setCustomInputNome(e.target.value)}
                autoFocus
                required
              />

              <div className="hextech-dialog-actions">
                <button
                  type="button"
                  className="hextech-btn-nav hextech-btn-prev"
                  style={{ padding: '6px 14px', fontSize: '11px' }}
                  onClick={() => setDialogoCustomAberto(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="hextech-btn-nav hextech-btn-next"
                  style={{ padding: '6px 16px', fontSize: '11px' }}
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
