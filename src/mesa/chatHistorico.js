export function mesclarMensagens(atuais, novas) {
  const porId = new Map([...atuais, ...novas].map(m => [String(m.id), m]));
  return [...porId.values()].sort((a, b) => {
    const tempo = new Date(a.criado_em) - new Date(b.criado_em);
    if (tempo) return tempo;
    const aId = String(a.id);
    const bId = String(b.id);
    if (/^\d+$/.test(aId) && /^\d+$/.test(bId)) return Number(aId) - Number(bId);
    return aId.localeCompare(bId);
  });
}
