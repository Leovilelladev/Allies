// Ponte entre a ficha do site (tabela `personagens`) e o modelo que a Mesa usa.
//
// O site guarda os dados em dois lugares ao mesmo tempo: colunas (pv_atual, ca,
// forca…) e um espelho dentro de `dados_ficha`. A tela de ficha do site lê o
// `dados_ficha` primeiro em vários campos, então toda escrita feita aqui
// atualiza os dois — senão o site mostraria valor velho.

import { PALETA_TOKEN as PALETA } from './paleta';

function objeto(valor) {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : null;
}

function lista(valor) {
  return Array.isArray(valor) ? valor : null;
}

/** Linha de `personagens` → ficha usada pela Mesa. */
export function lerFicha(row) {
  if (!row) return null;
  const d = objeto(row.dados_ficha) || {};
  const nivel = Number(row.nivel ?? d.nivel) || 1;

  return {
    id: row.id,
    usuarioId: row.usuario_id,
    nome: row.nome || d.nome || 'Sem nome',
    classe: row.classe || d.classe || '',
    especie: row.raca || d.raca || '',
    subclasse: row.subclasse || '',
    nivel,
    profBonus: Number(row.proficiencia ?? d.profBonus) || Math.floor((nivel - 1) / 4) + 2,
    ca: Number(row.ca ?? d.ca) || 10,
    deslocamento: row.deslocamento || d.deslocamento || '9m',
    dadosVida: row.dados_vida || d.dadosVida || '1d8',

    pvTotal: Number(row.pv_total ?? d.pv_total) || 10,
    pvAtual: Number(row.pv_atual ?? d.pv_atual ?? row.pv_total ?? 10),
    pvTemp: Number(row.pv_temp ?? d.pvTemp) || 0,

    atributos: {
      for: Number(row.forca ?? d.for) || 10,
      des: Number(row.destreza ?? d.des) || 10,
      con: Number(row.constituicao ?? d.con) || 10,
      int: Number(row.inteligencia ?? d.int) || 10,
      sab: Number(row.sabedoria ?? d.sab) || 10,
      car: Number(row.carisma ?? d.car) || 10,
    },

    pericias: objeto(row.pericias) || objeto(d.pericias) || {},
    // O site chama de "ataques" na coluna e de "acoes" dentro do dados_ficha
    acoes: lista(d.acoes) || lista(row.ataques) || lista(d.ataques) || [],
    magias: lista(row.magias) || lista(d.magias) || [],
    espacos: objeto(row.espacos_magia) || objeto(d.spellSlots) || {},
    moedas: {
      po: Number(row.moedas?.po ?? d.moedas?.po) || 0,
      pp: Number(row.moedas?.pp ?? d.moedas?.pp) || 0,
      pc: Number(row.moedas?.pc ?? d.moedas?.pc) || 0,
    },

    retratoUrl: row.token_url || row.avatar_url || d.retrato_url || null,
    cor: d.cor_token || PALETA[(Number(row.id) || 0) % PALETA.length],

    // Campos que só a Mesa usa — moram no dados_ficha e o site ignora
    salvaguardas: objeto(d.salvaguardas) || {},
    inventario: lista(d.inventario) || [],
    visaoClara: d.visaoClara == null ? 18 : Number(d.visaoClara) || 0,
    visaoEscuro: d.visaoEscuro === true ? 18 : Number(d.visaoEscuro) || 0,
    atributoConjuracao: d.atributoConjuracao || 'int',

    _row: row,
  };
}

// Campo lógico → coluna do site + chave espelho no dados_ficha
const MAPA_COLUNAS = {
  classe: ['classe', 'classe'],
  especie: ['raca', 'raca'],
  nivel: ['nivel', 'nivel'],
  profBonus: ['proficiencia', 'profBonus'],
  ca: ['ca', 'ca'],
  deslocamento: ['deslocamento', 'deslocamento'],
  dadosVida: ['dados_vida', 'dadosVida'],
  pv_total: ['pv_total', 'pv_total'],
  pv_atual: ['pv_atual', 'pv_atual'],
  pvTemp: ['pv_temp', 'pvTemp'],
  pericias: ['pericias', 'pericias'],
  magias: ['magias', 'magias'],
  moedas: ['moedas', 'moedas'],
};

const ATRIBUTO_COLUNA = {
  for: 'forca',
  des: 'destreza',
  con: 'constituicao',
  int: 'inteligencia',
  sab: 'sabedoria',
  car: 'carisma',
};

// Só existem no dados_ficha
const SO_EXTRA = ['salvaguardas', 'inventario', 'visaoClara', 'visaoEscuro', 'atributoConjuracao', 'cor_token'];

/**
 * Monta o UPDATE para `personagens` a partir de um patch lógico da Mesa,
 * preenchendo coluna e espelho ao mesmo tempo.
 */
export function montarAtualizacao(row, patch) {
  const dados = { ...(objeto(row?.dados_ficha) || {}) };
  const update = {};

  for (const [chave, valor] of Object.entries(patch)) {
    if (chave === 'atributos') {
      for (const [attr, v] of Object.entries(valor)) {
        const coluna = ATRIBUTO_COLUNA[attr];
        if (coluna) update[coluna] = Number(v) || 0;
        dados[attr] = Number(v) || 0;
      }
      continue;
    }

    if (chave === 'acoes') {
      update.ataques = valor;
      dados.acoes = valor;
      dados.ataques = valor;
      continue;
    }

    if (chave === 'espacos') {
      update.espacos_magia = valor;
      dados.spellSlots = valor;
      continue;
    }

    if (chave === 'moedas') {
      // Preserva pe/pl, que o site tem e a Mesa não mexe
      const atual = objeto(row?.moedas) || {};
      const moedas = { ...atual, ...valor };
      update.moedas = moedas;
      dados.moedas = moedas;
      continue;
    }

    if (chave === 'retrato_url') {
      update.token_url = valor;
      dados.retrato_url = valor;
      continue;
    }

    if (SO_EXTRA.includes(chave)) {
      dados[chave] = valor;
      continue;
    }

    const par = MAPA_COLUNAS[chave];
    if (par) {
      update[par[0]] = valor;
      dados[par[1]] = valor;
    } else {
      dados[chave] = valor;
    }
  }

  update.dados_ficha = dados;
  update.atualizado_em = new Date().toISOString();
  return update;
}
