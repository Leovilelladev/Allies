// =========================================================
// Allies — Lista de Backgrounds da Tela de Login
// Para adicionar novas imagens no futuro, basta importar o arquivo
// e adicioná-lo ao array LOGIN_BACKGROUNDS abaixo.
// =========================================================

import bgCastelo from '../assets/backgrounds/bg-castelo.jpg';
import bgLaboratorio from '../assets/backgrounds/bg-laboratorio.jpg';

export const LOGIN_BACKGROUNDS = [
  {
    id: 'castelo',
    nome: 'Fortaleza Crepuscular',
    src: bgCastelo,
  },
  {
    id: 'laboratorio',
    nome: 'Laboratório Arcano',
    src: bgLaboratorio,
  },
  // Exemplo para adicionar futuramente:
  // {
  //   id: 'taverna',
  //   nome: 'Taverna do Javali',
  //   src: bgTaverna,
  // },
];

export function obterBackgroundAleatorio() {
  if (!LOGIN_BACKGROUNDS.length) return null;
  const index = Math.floor(Math.random() * LOGIN_BACKGROUNDS.length);
  return LOGIN_BACKGROUNDS[index];
}
