/**
 * Comparação de identificadores vindos do Supabase.
 *
 * O banco usa UUIDs. Nunca converta IDs para Number: além de corromper UUIDs,
 * a conversão também transforma valores inválidos em NaN e mascara bugs de
 * autorização.
 */
export function sameId(left, right) {
  return left != null && right != null && String(left) === String(right);
}

export function hasId(value) {
  return value != null && String(value).trim() !== '';
}
