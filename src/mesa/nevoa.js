// A memória revela terreno, nunca a posição atual de criaturas fora da visão.
export function tokenVisivelNaNevoa(token, { comoJogador, fogAtivo, celulasVisiveis, fogRevelado, gridSize }) {
  if (!comoJogador || !fogAtivo) return true;
  const chave = `${Math.floor(token.x / gridSize)},${Math.floor(token.y / gridSize)}`;
  return (celulasVisiveis ?? fogRevelado).has(chave);
}

export function tokensDoObservador(tokens, donoId) {
  if (donoId == null || donoId === '') return [];
  return tokens.filter(t => t.fichaId && t.donoId != null && String(t.donoId) === String(donoId));
}
