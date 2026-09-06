export const EFEITOS = [
  { id: 'fogo', nome: 'Bola de fogo', icone: '🔥', cor: 0xff7628 },
  { id: 'veneno', nome: 'Veneno', icone: '☠', cor: 0x8cdd56 },
  { id: 'gelo', nome: 'Gelo', icone: '❄', cor: 0x79dfff },
  { id: 'raio', nome: 'Raio', icone: 'ϟ', cor: 0xc6a6ff },
  { id: 'impacto', nome: 'Impacto', icone: '✦', cor: 0xffdc99 },
];
export const DURACAO_EFEITO = 1800;
export function validarEfeito(p) {
  if (!p || !EFEITOS.some(e => e.id === p.tipo) || typeof p.id !== 'string' || p.id.length > 80 || !p.id.length) return null;
  if (![p.x1, p.y1, p.x2, p.y2, p.tamanho].every(Number.isFinite)) return null;
  if ([p.x1, p.y1, p.x2, p.y2].some(n => Math.abs(n) > 40000) || p.tamanho < 10 || p.tamanho > 600) return null;
  return { id: p.id, tipo: p.tipo, x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, tamanho: p.tamanho };
}
export function criarFilaEfeitos() {
  let ativos = [];
  const vistos = new Map();
  return {
    adicionar(payload, agora) {
      const p = validarEfeito(payload);
      for (const [id, t] of vistos) if (agora - t > 10000) vistos.delete(id);
      if (!p || vistos.has(p.id) || ativos.length >= 8 || vistos.size >= 80) return false;
      vistos.set(p.id, agora);
      ativos.push({ ...p, inicio: agora });
      return true;
    },
    quadro(agora) {
      ativos = ativos.filter(e => agora - e.inicio < DURACAO_EFEITO);
      return ativos.map(e => ({ ...e, progresso: Math.max(0, (agora - e.inicio) / DURACAO_EFEITO) }));
    },
  };
}
