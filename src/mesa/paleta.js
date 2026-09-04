// Paleta do canvas — espelha os tokens de cor do design do site (hub.css).
// A UI em volta usa as variáveis CSS de mesa.css; aqui é o mesmo vocabulário
// em números, porque o Pixi não lê CSS.
export const COR = {
  // Superfícies (do mais fundo pro mais alto)
  vazio: 0x010a13,
  fundo: 0x091428,
  painel: 0x0d2040,
  alto: 0x152747,

  // Dourado — cor primária, usada em seleção, grade e molduras
  ouro: 0xc8aa6e,
  ouroForte: 0x785a28,
  ouroClaro: 0xe5c587,

  // Turquesa — o que está "vivo": régua, ping, vida cheia
  turquesa: 0x0ac8b9,
  turquesa2: 0x0bc6e3,

  // Texto
  texto: 0xf0e6d2,
  texto2: 0xa09b8c,

  // Perigo
  erro: 0xff5858,
  erroFundo: 0x661010,

  preto: 0x000000,
  branco: 0xffffff,
};

export const CSS = {
  texto: '#f0e6d2',
  texto2: '#a09b8c',
  ouro: '#c8aa6e',
  turquesa: '#0ac8b9',
  erro: '#ff5858',
};

export const FONTE_SANS = 'Hanken Grotesk, Archivo, system-ui, sans-serif';
export const FONTE_SERIF = 'Cinzel, Source Serif 4, Georgia, serif';

// Cores de token: variações que convivem com o dourado sem competir com ele.
export const PALETA_TOKEN = [
  '#785a28',
  '#1e5b4a',
  '#1d3f7a',
  '#5a2f6b',
  '#8a4a1f',
  '#20616b',
];
