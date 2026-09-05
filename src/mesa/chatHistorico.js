export function mesclarMensagens(atuais, novas) {
  const porId = new Map([...atuais, ...novas].map(m => [String(m.id), m]));
  return [...porId.values()].sort((a, b) => {
    const tempo = new Date(a.criado_em) - new Date(b.criado_em);
    return tempo || (Number(a.id) - Number(b.id));
  });
}
