// Allies — Biblioteca de Retratos e Tokens de Personagens (D&D 5E / Hextech)

export const RETRATOS_CLASSES = [
  {
    classe: 'Guerreiro',
    nome: 'Guerreiro Marcial',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=800&auto=format&fit=crop',
    icone: 'shield',
  },
  {
    classe: 'Paladino',
    nome: 'Cavaleiro Sagrado',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop',
    icone: 'military_tech',
  },
  {
    classe: 'Mago',
    nome: 'Arquimago Arcano',
    url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?q=80&w=800&auto=format&fit=crop',
    icone: 'auto_awesome',
  },
  {
    classe: 'Ladino',
    nome: 'Assassino das Sombras',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    icone: 'visibility_off',
  },
  {
    classe: 'Clérigo',
    nome: 'Devoto da Luz',
    url: 'https://images.unsplash.com/photo-1519638399535-1b036603ac77?q=80&w=800&auto=format&fit=crop',
    icone: 'flare',
  },
  {
    classe: 'Bárbaro',
    nome: 'Furioso Tribal',
    url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=800&auto=format&fit=crop',
    icone: 'gavel',
  },
  {
    classe: 'Bardo',
    nome: 'Trovador Errante',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
    icone: 'music_note',
  },
  {
    classe: 'Bruxo',
    nome: 'Pacto do Vazio',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
    icone: 'dark_mode',
  },
  {
    classe: 'Patrulheiro',
    nome: 'Arqueiro da Floresta',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=800&auto=format&fit=crop',
    icone: 'target',
  },
  {
    classe: 'Druida',
    nome: 'Guardião Ancestral',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    icone: 'forest',
  },
  {
    classe: 'Feiticeiro',
    nome: 'Canalizador Elemental',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=800&auto=format&fit=crop',
    icone: 'bolt',
  },
  {
    classe: 'Monge',
    nome: 'Mestre do Ki',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=800&auto=format&fit=crop',
    icone: 'sports_martial_arts',
  },
  {
    classe: 'Artífice',
    nome: 'Engenheiro Rúnico',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop',
    icone: 'precision_manufacturing',
  },
];

const MAPA_CLASSES = RETRATOS_CLASSES.reduce((acc, cur) => {
  acc[cur.classe.toLowerCase()] = cur.url;
  return acc;
}, {});

/**
 * Retorna a melhor imagem de retrato para um personagem:
 * 1. avatar_url ou token_url explícitos do personagem
 * 2. avatar_url ou token_url dentro de dados_ficha / dados
 * 3. Retrato temático baseado na classe do personagem
 * 4. background_url da ficha
 * 5. Retrato padrão de Guerreiro
 */
export function obterRetratoPersonagem(ficha) {
  if (!ficha) return RETRATOS_CLASSES[0].url;

  // 1. URLs diretas no objeto
  if (ficha.avatar_url && typeof ficha.avatar_url === 'string' && ficha.avatar_url.trim()) {
    return ficha.avatar_url.trim();
  }
  if (ficha.token_url && typeof ficha.token_url === 'string' && ficha.token_url.trim()) {
    return ficha.token_url.trim();
  }

  // 2. URLs dentro do jsonb dados / dados_ficha
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

  if (dados?.avatar_url && typeof dados.avatar_url === 'string' && dados.avatar_url.trim()) {
    return dados.avatar_url.trim();
  }
  if (dados?.token_url && typeof dados.token_url === 'string' && dados.token_url.trim()) {
    return dados.token_url.trim();
  }

  // 3. Imagem temática pela classe do personagem
  const classe = String(ficha.classe || dados?.classe || '').trim().toLowerCase();
  if (classe) {
    if (MAPA_CLASSES[classe]) return MAPA_CLASSES[classe];
    for (const [k, url] of Object.entries(MAPA_CLASSES)) {
      if (classe.includes(k) || k.includes(classe)) return url;
    }
  }

  // 4. Background URL caso exista
  if (ficha.background_url && typeof ficha.background_url === 'string' && ficha.background_url.trim()) {
    return ficha.background_url.trim();
  }

  return RETRATOS_CLASSES[0].url;
}

export function obterRetratoPorClasse(classeNome) {
  if (!classeNome) return RETRATOS_CLASSES[0].url;
  const c = String(classeNome).trim().toLowerCase();
  if (MAPA_CLASSES[c]) return MAPA_CLASSES[c];
  for (const [k, url] of Object.entries(MAPA_CLASSES)) {
    if (c.includes(k) || k.includes(c)) return url;
  }
  return RETRATOS_CLASSES[0].url;
}
