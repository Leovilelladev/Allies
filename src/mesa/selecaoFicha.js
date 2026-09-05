// Selects e localStorage retornam texto; preserve o ID original do personagem.
export function encontrarFicha(fichas, id) {
  if (id == null) return null;
  return fichas.find((ficha) => String(ficha.id) === String(id)) ?? null;
}
