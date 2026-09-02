// Allies RPG — D&D 5e Dynamic Action & Formula Engine

export function calcMod(score) {
  const s = Number(score) || 10;
  return Math.floor((s - 10) / 2);
}

export function fmtMod(n) {
  const num = Number(n) || 0;
  return num >= 0 ? `+${num}` : `${num}`;
}

/**
 * Normaliza os atributos e variáveis do personagem para o resolvedor de fórmulas.
 */
export function extrairStatsContexto(ficha) {
  if (!ficha) return { prof: 2, lvl: 1, ca: 10, mods: {}, scores: {} };

  let dados = {};
  if (ficha.dados_ficha && typeof ficha.dados_ficha === 'object') {
    dados = ficha.dados_ficha;
  } else if (ficha.dados && typeof ficha.dados === 'object') {
    dados = ficha.dados;
  } else if (typeof ficha.dados_ficha === 'string') {
    try { dados = JSON.parse(ficha.dados_ficha); } catch (e) { dados = {}; }
  } else if (typeof ficha.dados === 'string') {
    try { dados = JSON.parse(ficha.dados); } catch (e) { dados = {}; }
  }

  const rawAttr = (dados.atributos && typeof dados.atributos === 'object') ? dados.atributos : dados;
  const nivel = Number(ficha.nivel ?? dados.nivel ?? 1) || 1;
  const prof = Number(ficha.proficiencia ?? dados.profBonus ?? (Math.floor((nivel - 1) / 4) + 2)) || 2;
  const ca = Number(ficha.ca ?? dados.ca ?? 10) || 10;

  const forca = Number(ficha.forca ?? rawAttr.for ?? rawAttr.str ?? 10) || 10;
  const destreza = Number(ficha.destreza ?? rawAttr.des ?? rawAttr.dex ?? 10) || 10;
  const constituicao = Number(ficha.constituicao ?? rawAttr.con ?? 10) || 10;
  const inteligencia = Number(ficha.inteligencia ?? rawAttr.int ?? 10) || 10;
  const sabedoria = Number(ficha.sabedoria ?? rawAttr.sab ?? rawAttr.wis ?? 10) || 10;
  const carisma = Number(ficha.carisma ?? rawAttr.car ?? rawAttr.cha ?? 10) || 10;

  const scores = {
    for: forca,
    str: forca,
    des: destreza,
    dex: destreza,
    con: constituicao,
    int: inteligencia,
    sab: sabedoria,
    wis: sabedoria,
    car: carisma,
    cha: carisma,
  };

  const mods = {
    for: calcMod(forca),
    str: calcMod(forca),
    des: calcMod(destreza),
    dex: calcMod(destreza),
    con: calcMod(constituicao),
    int: calcMod(inteligencia),
    sab: calcMod(sabedoria),
    wis: calcMod(sabedoria),
    car: calcMod(carisma),
    cha: calcMod(carisma),
  };

  return {
    nivel,
    lvl: nivel,
    prof,
    ca,
    scores,
    mods,
  };
}

/**
 * Resolve fórmulas dinâmicas com variáveis @mod_str, @prof, @lvl, etc.
 * Ex: '1d8 + @mod_str + @prof' -> '1d8 + 3 + 2' -> '1d8 + 5'
 */
export function resolverFormulaDinamica(formula, fichaOuStats) {
  if (!formula || typeof formula !== 'string') return '';

  const ctx = fichaOuStats?.mods ? fichaOuStats : extrairStatsContexto(fichaOuStats);
  let str = formula.trim();

  // Substitui modificadores (@mod_str, @mod_for, etc.)
  const mapVariaveis = {
    '@mod_for': ctx.mods.for,
    '@mod_str': ctx.mods.for,
    '@mod_des': ctx.mods.des,
    '@mod_dex': ctx.mods.des,
    '@mod_con': ctx.mods.con,
    '@mod_int': ctx.mods.int,
    '@mod_sab': ctx.mods.sab,
    '@mod_wis': ctx.mods.sab,
    '@mod_car': ctx.mods.car,
    '@mod_cha': ctx.mods.car,
    '@prof': ctx.prof,
    '@proficiencia': ctx.prof,
    '@lvl': ctx.nivel,
    '@nivel': ctx.nivel,
    '@ca': ctx.ca,
    '@for': ctx.scores.for,
    '@str': ctx.scores.for,
    '@des': ctx.scores.des,
    '@dex': ctx.scores.des,
    '@con': ctx.scores.con,
    '@int': ctx.scores.int,
    '@sab': ctx.scores.sab,
    '@wis': ctx.scores.sab,
    '@car': ctx.scores.car,
    '@cha': ctx.scores.car,
  };

  // Substitui cada variável na fórmula
  for (const [chave, valor] of Object.entries(mapVariaveis)) {
    const reg = new RegExp(chave + '\\b', 'gi');
    str = str.replace(reg, String(valor));
  }

  // Simplifica somas de constantes (ex: '1d8 + 3 + 2' -> '1d8 + 5')
  try {
    // Separa os dados (ex: '1d8', '2d6') dos números constantes
    const tokens = str.split(/(\s*[+\-*/]\s*)/);
    let dadosPartes = [];
    let constanteAcumulada = 0;
    let sinalAtual = '+';

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i].trim();
      if (!t) continue;
      if (t === '+' || t === '-' || t === '*' || t === '/') {
        sinalAtual = t;
        continue;
      }

      if (/\d*d\d+/i.test(t)) {
        dadosPartes.push((dadosPartes.length > 0 ? ` ${sinalAtual} ` : '') + t);
      } else if (!isNaN(Number(t))) {
        const val = Number(t);
        if (sinalAtual === '+') constanteAcumulada += val;
        else if (sinalAtual === '-') constanteAcumulada -= val;
        else if (sinalAtual === '*') constanteAcumulada *= val;
        else if (sinalAtual === '/') constanteAcumulada = Math.floor(constanteAcumulada / (val || 1));
      } else {
        dadosPartes.push((dadosPartes.length > 0 ? ` ${sinalAtual} ` : '') + t);
      }
    }

    let resultado = dadosPartes.join('');
    if (constanteAcumulada !== 0) {
      if (resultado.length > 0) {
        resultado += constanteAcumulada > 0 ? ` + ${constanteAcumulada}` : ` - ${Math.abs(constanteAcumulada)}`;
      } else {
        resultado = String(constanteAcumulada);
      }
    } else if (resultado.length === 0) {
      resultado = '0';
    }

    return resultado;
  } catch (err) {
    return str;
  }
}

/**
 * Calcula o bônus de acerto de uma ação (Attack Roll).
 */
export function calcularBonusAtaque(acao, fichaOuStats) {
  if (!acao) return 0;
  const ctx = fichaOuStats?.mods ? fichaOuStats : extrairStatsContexto(fichaOuStats);
  const attrKey = (acao.atributo_base || 'for').toLowerCase();
  const attrMod = ctx.mods[attrKey] ?? 0;
  const profBonus = acao.proficiente !== false ? ctx.prof : 0;
  const bonusFixo = Number(acao.bonus_adicional_acerto || 0);

  return attrMod + profBonus + bonusFixo;
}

/**
 * Calcula o CD de Salvaguarda (Spell Save DC).
 */
export function calcularCDSalvaguarda(acao, fichaOuStats) {
  if (!acao) return 10;
  if (acao.salvaguarda_dc_custom) return Number(acao.salvaguarda_dc_custom);

  const ctx = fichaOuStats?.mods ? fichaOuStats : extrairStatsContexto(fichaOuStats);
  const attrKey = (acao.atributo_base || 'int').toLowerCase();
  const attrMod = ctx.mods[attrKey] ?? 0;

  return 8 + ctx.prof + attrMod;
}

/**
 * Rola dados a partir de uma fórmula resolvida (ex: '1d8 + 3', '2d6 + 5').
 */
export function rolarDadosFormula(formulaStr, ehCritico = false) {
  if (!formulaStr) return { total: 0, detalhe: '0', dados: [] };

  const formulaLimpa = formulaStr.replace(/\s+/g, '');
  // Captura dados (ex: '1d8', '2d6') e números soltos
  const regex = /([+-]?\d*d\d+|[+-]?\d+)/gi;
  const matches = formulaLimpa.match(regex) || [];

  let total = 0;
  let detalhePartes = [];
  let listaDados = [];

  for (const token of matches) {
    if (/d/i.test(token)) {
      const match = token.match(/([+-]?)(\d*)d(\d+)/i);
      if (match) {
        const sinal = match[1] === '-' ? -1 : 1;
        let qtd = Number(match[2]) || 1;
        const faces = Number(match[3]) || 6;

        // Se for acerto crítico em D&D 5e, dobra a quantidade de dados de dano!
        if (ehCritico) qtd = qtd * 2;

        const rolagens = [];
        let subtotal = 0;
        for (let i = 0; i < qtd; i++) {
          const r = Math.floor(Math.random() * faces) + 1;
          rolagens.push(r);
          subtotal += r;
        }

        total += sinal * subtotal;
        listaDados.push({ qtd, faces, rolagens, subtotal });
        detalhePartes.push(`[${rolagens.join(' + ')}]`);
      }
    } else {
      const num = Number(token);
      if (!isNaN(num)) {
        total += num;
        detalhePartes.push(num >= 0 ? `+${num}` : `${num}`);
      }
    }
  }

  return {
    total: Math.max(0, total),
    detalhe: detalhePartes.join(' ') || `${total}`,
    dados: listaDados,
  };
}

/**
 * Executa a rolagem completa de uma Ação (Acerto + Dano + CD + Cargas).
 */
export function executarRolagemAcao(acao, fichaOuStats) {
  const ctx = fichaOuStats?.mods ? fichaOuStats : extrairStatsContexto(fichaOuStats);
  const nomeAcao = acao.nome || 'Habilidade';
  const tipoAcao = acao.tipo || 'action';

  let resultadoAcerto = null;
  let ehCritico = false;
  let ehFalhaCritica = false;

  // 1. Rolagem de Ataque (D20 + Bônus)
  if (acao.tem_ataque !== false && (acao.atributo_base || acao.tem_ataque)) {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const bonus = calcularBonusAtaque(acao, ctx);
    const totalAcerto = d20 + bonus;

    ehCritico = d20 === 20;
    ehFalhaCritica = d20 === 1;

    resultadoAcerto = {
      d20,
      modificador: bonus,
      total: totalAcerto,
      ehCritico,
      ehFalhaCritica,
      formula: `d20(${d20}) ${fmtMod(bonus)}`,
    };
  }

  // 2. Rolagem de Dano / Efeito
  let resultadoDano = null;
  const formulaBruta = acao.formula_dano || acao.dano || '';
  if (formulaBruta) {
    const formulaResolvida = resolverFormulaDinamica(formulaBruta, ctx);
    const rolagem = rolarDadosFormula(formulaResolvida, ehCritico);

    resultadoDano = {
      total: rolagem.total,
      formulaResolvida,
      tipoDano: acao.tipo_dano || acao.tipoDano || 'slashing',
      detalhes: rolagem.detalhe,
      dados: rolagem.dados,
    };
  }

  // 3. CD de Salvaguarda
  let resultadoSaveDC = null;
  if (acao.tem_salvaguarda || acao.salvaguarda_atributo) {
    resultadoSaveDC = {
      dc: calcularCDSalvaguarda(acao, ctx),
      atributo: (acao.salvaguarda_atributo || 'des').toUpperCase(),
    };
  }

  return {
    actionId: acao.id,
    nomeAcao,
    tipoAcao,
    temAtaque: !!resultadoAcerto,
    acerto: resultadoAcerto,
    dano: resultadoDano,
    saveDC: resultadoSaveDC,
    descricao: acao.descricao || acao.desc || '',
    alcance: acao.alcance || '',
    alvo: acao.alvo || '',
    icone_url: acao.icone_url || '',
  };
}

/**
 * Aplica recarga de descanso (Short Rest ou Long Rest) nas ações com cargas.
 */
export function aplicarDescansoAcoes(acoes = [], tipoDescanso = 'short_rest') {
  if (!Array.isArray(acoes)) return [];

  return acoes.map((a) => {
    if (!a.tem_cargas || !a.max_cargas) return a;

    const regra = a.tipo_recarga || 'long_rest';

    if (tipoDescanso === 'long_rest') {
      // Descanso longo recupera todas as cargas
      return { ...a, cargas_atuais: a.max_cargas };
    } else if (tipoDescanso === 'short_rest') {
      // Descanso curto só recupera se a regra for short_rest
      if (regra === 'short_rest') {
        return { ...a, cargas_atuais: a.max_cargas };
      }
    }

    return a;
  });
}

/**
 * Galeria de Habilidades e Ações Pré-Definidas para Ações Estilo MOBA
 */
export const ACOES_PRESETS = [
  {
    id: 'espada-longa',
    nome: 'Espada Longa',
    tipo: 'action',
    icone_url: '',
    descricao: 'Ataque corpo a corpo marcial com lâmina afiada.',
    alcance: '1.5m / Corpo a corpo',
    alvo: '1 criatura',
    tem_ataque: true,
    atributo_base: 'for',
    proficiente: true,
    formula_dano: '1d8 + @mod_str',
    tipo_dano: 'slashing',
    tem_cargas: false,
  },
  {
    id: 'raio-fogo',
    nome: 'Raio de Fogo',
    tipo: 'action',
    icone_url: '',
    descricao: 'Dispara um raio ígneo brilhante contra um alvo à distância.',
    alcance: '36m / 120ft',
    alvo: '1 alvo',
    tem_ataque: true,
    atributo_base: 'int',
    proficiente: true,
    formula_dano: '1d10',
    tipo_dano: 'fire',
    tem_cargas: false,
  },
  {
    id: 'segundo-folego',
    nome: 'Segundo Fôlego',
    tipo: 'bonus_action',
    icone_url: '',
    descricao: 'Você possui um poço de vigor que pode utilizar para se proteger de perigos.',
    alcance: 'Pessoal',
    alvo: 'Você mesmo',
    tem_ataque: false,
    formula_dano: '1d10 + @lvl',
    tipo_dano: 'healing',
    tem_cargas: true,
    max_cargas: 1,
    cargas_atuais: 1,
    tipo_recarga: 'short_rest',
  },
  {
    id: 'ataque-furtivo',
    nome: 'Golpe Furtivo',
    tipo: 'action',
    icone_url: '',
    descricao: 'Ataque de precisão nas fraquezas do inimigo quando você tem vantagem.',
    alcance: 'Corpo a corpo / Distância',
    alvo: '1 criatura',
    tem_ataque: true,
    atributo_base: 'des',
    proficiente: true,
    formula_dano: '1d6 + @mod_dex + 1d6',
    tipo_dano: 'piercing',
    tem_cargas: false,
  },
  {
    id: 'imposicao-maos',
    nome: 'Cura Divina',
    tipo: 'action',
    icone_url: '',
    descricao: 'Seu toque abençoado cura ferimentos e alivia enfermidades.',
    alcance: 'Toque',
    alvo: '1 criatura',
    tem_ataque: false,
    formula_dano: '2d8 + @mod_sab',
    tipo_dano: 'healing',
    tem_cargas: true,
    max_cargas: 3,
    cargas_atuais: 3,
    tipo_recarga: 'long_rest',
  },
  {
    id: 'furia-barbara',
    nome: 'Fúria Bárbara',
    tipo: 'bonus_action',
    icone_url: '',
    descricao: 'Em combate, você luta com ferocidade primitiva ganhando bônus de dano e resistência.',
    alcance: 'Pessoal',
    alvo: 'Você mesmo',
    tem_ataque: false,
    formula_dano: '2',
    tipo_dano: 'utility',
    tem_cargas: true,
    max_cargas: 2,
    cargas_atuais: 2,
    tipo_recarga: 'long_rest',
  },
  {
    id: 'bola-de-fogo',
    nome: 'Bola de Fogo',
    tipo: 'action',
    icone_url: '',
    descricao: 'Uma explosão fulgurante de fogo irrompe com um estrondo ensurdecedor.',
    alcance: '45m / 150ft',
    alvo: 'Esfera de 6m de raio',
    tem_ataque: false,
    atributo_base: 'int',
    tem_salvaguarda: true,
    salvaguarda_atributo: 'des',
    formula_dano: '8d6',
    tipo_dano: 'fire',
    tem_cargas: true,
    max_cargas: 2,
    cargas_atuais: 2,
    tipo_recarga: 'long_rest',
  },
];

