function mesmoId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/** Regra única de controle de tokens no cliente. A proteção definitiva também deve existir no RLS. */
export function podeControlarToken({ ehMestre, userId, token }) {
  if (!token) return false;
  if (ehMestre) return true;
  return !!token.fichaId && mesmoId(token.donoId, userId);
}

export function podeCriarTokenDeFicha({ ehMestre, userId, ficha }) {
  if (ehMestre) return true;
  return !!ficha && mesmoId(ficha.usuarioId, userId);
}
