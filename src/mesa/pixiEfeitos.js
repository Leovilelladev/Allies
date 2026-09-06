import { EFEITOS } from './efeitos.js';

// Geometria determinística: os clientes desenham a mesma trajetória.
// A camada fica sob a névoa e não participa de hit testing.
export function desenharEfeitos(g, efeitos, reduzirMovimento = false) {
  g.clear();
  for (const e of efeitos) {
    const cor = EFEITOS.find(t => t.id === e.tipo).cor;
    const r = e.tamanho;
    const p = e.progresso;
    if (reduzirMovimento) {
      g.circle(e.x2, e.y2, r * .7).stroke({ color: cor, width: 3, alpha: (1 - p) * .7 });
      continue;
    }
    const voo = Math.min(1, p / .35);
    const x = e.x1 + (e.x2 - e.x1) * voo;
    const y = e.y1 + (e.y2 - e.y1) * voo;
    if (p < .35) {
      if (e.tipo === 'raio') {
        for (let camada = 0; camada < 2; camada++) {
          g.moveTo(e.x1, e.y1);
          for (let i = 1; i <= 16; i++) {
            const f = i / 16;
            const desvio = i === 16 ? 0 : Math.sin(i * 17 + Math.floor(p * 24)) * r * .18;
            g.lineTo(e.x1 + (x - e.x1) * f + desvio, e.y1 + (y - e.y1) * f - desvio);
          }
          g.stroke({ color: camada ? 0xffffff : cor, width: camada ? 2 : 7, alpha: camada ? .9 : .4 });
        }
      } else {
        for (let i = 10; i >= 0; i--) {
          const t = Math.max(0, voo - i * .025);
          g.circle(e.x1 + (e.x2 - e.x1) * t, e.y1 + (e.y2 - e.y1) * t, r * (.04 + (10 - i) * .007))
            .fill({ color: cor, alpha: .08 + (10 - i) * .06 });
        }
        g.circle(x, y, r * .055).fill(0xfff4d9);
      }
      continue;
    }
    const impacto = (p - .35) / .65;
    const alpha = 1 - impacto;
    g.circle(x, y, r * (.15 + impacto * .85)).stroke({ color: cor, width: Math.max(1, r * .035 * alpha), alpha: alpha * .65 });
    if (e.tipo === 'fogo') {
      g.circle(x, y, r * (.12 + impacto * .55)).fill({ color: 0xffac35, alpha: alpha * .55 });
    }
    const n = e.tipo === 'veneno' ? 14 : 26;
    for (let i = 0; i < n; i++) {
      const angulo = i * 2.39996;
      const alcance = r * Math.sqrt((i + 1) / n) * (.15 + impacto);
      const px = x + Math.cos(angulo) * alcance;
      const py = y + Math.sin(angulo) * alcance - (e.tipo === 'fogo' || e.tipo === 'veneno' ? impacto * r * .2 : 0);
      const size = r * (e.tipo === 'veneno' ? .25 : e.tipo === 'fogo' ? .09 + (i % 4) * .025 : .025 + (i % 4) * .01) * alpha;
      if (e.tipo === 'gelo') {
        g.poly([px, py - size * 3, px + size, py, px, py + size * 3, px - size, py]).fill({ color: cor, alpha });
      } else if (e.tipo === 'impacto' || e.tipo === 'raio') {
        g.moveTo(px, py).lineTo(px + Math.cos(angulo) * size * 4, py + Math.sin(angulo) * size * 4).stroke({ color: cor, width: 2, alpha });
      } else {
        g.circle(px, py, Math.max(.1, size)).fill({ color: e.tipo === 'fogo' && i % 3 === 0 ? 0xffdc72 : cor, alpha: alpha * (e.tipo === 'veneno' ? .4 : .9) });
      }
    }
  }
}
