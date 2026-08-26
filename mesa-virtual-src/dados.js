// Parser de notação simples de dados: NdM, NdM+K, NdM-K, dM (assume N=1)
const REGEX_DADO = /^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i;

export function parseDado(expressao) {
  const match = expressao.trim().match(REGEX_DADO);
  if (!match) return null;

  const quantidade = match[1] ? parseInt(match[1], 10) : 1;
  const lados = parseInt(match[2], 10);
  const modificador = match[3] ? parseInt(match[3].replace(/\s+/g, ''), 10) : 0;

  if (quantidade < 1 || quantidade > 100 || lados < 2 || lados > 1000) return null;
  return { quantidade, lados, modificador };
}

export function rolarDado({ quantidade, lados, modificador }) {
  const resultados = Array.from({ length: quantidade }, () => 1 + Math.floor(Math.random() * lados));
  const soma = resultados.reduce((a, b) => a + b, 0) + modificador;
  return { resultados, modificador, total: soma };
}

// Monta o texto de exibição de uma rolagem, ex: "2d6+3: [4, 2] +3 = 9"
export function formatarRolagem(expressao, rolagem) {
  const { resultados, modificador, total } = rolagem;
  const partes = [`[${resultados.join(', ')}]`];
  if (modificador > 0) partes.push(`+${modificador}`);
  if (modificador < 0) partes.push(`${modificador}`);
  return `${expressao}: ${partes.join(' ')} = ${total}`;
}
