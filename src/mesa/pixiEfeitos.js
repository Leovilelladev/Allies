import { EFEITOS } from './efeitos.js';

// Vetores em coordenadas do mapa, sem imagens externas ou interação com tokens.
function chama(g, x, y, tamanho, angulo, alpha) {
  const ponto = (a, b) => [x + (a * Math.cos(angulo) - b * Math.sin(angulo)) * tamanho, y + (a * Math.sin(angulo) + b * Math.cos(angulo)) * tamanho];
  for (const [escala, cor] of [[1, 0xef3e13], [.72, 0xff931e], [.38, 0xffed9a]]) {
    const p = (a, b) => ponto(a * escala, b * escala);
    g.moveTo(...p(0, .6))
      .bezierCurveTo(...p(-.9, .25), ...p(-.65, -.5), ...p(-.2, -.9))
      .quadraticCurveTo(...p(-.25, -.25), ...p(0, -.45))
      .quadraticCurveTo(...p(.5, -1.1), ...p(.25, -1.7))
      .bezierCurveTo(...p(1.2, -.35), ...p(.85, .55), ...p(0, .6))
      .fill({ color: cor, alpha });
  }
}
function cristal(g, x, y, size, angulo, alpha) {
  const dx = Math.cos(angulo), dy = Math.sin(angulo);
  const pontos = [x - dx * size, y - dy * size, x - dy * size * .3, y + dx * size * .3, x + dx * size, y + dy * size, x + dy * size * .3, y - dx * size * .3];
  g.poly(pontos).fill({ color: 0x45bce8, alpha }).stroke({ color: 0xb8faff, width: 1, alpha });
  g.moveTo(pontos[0], pontos[1]).lineTo(pontos[4], pontos[5]).stroke({ color: 0xf1ffff, width: 1.5, alpha });
}
function raio(g, x1, y1, x2, y2, r, fase, alpha) {
  const pontos = [x1, y1];
  for (let i = 1; i <= 12; i++) {
    const d = i === 12 ? 0 : Math.sin(i * 17 + fase) * r * .2;
    pontos.push(x1 + (x2 - x1) * i / 12 + d, y1 + (y2 - y1) * i / 12 - d);
  }
  for (const [width, color, a] of [[10, 0x8954ef, .18], [4, 0xc8a4ff, .85], [1.5, 0xfaffff, 1]]) {
    g.moveTo(pontos[0], pontos[1]);
    for (let i = 2; i < pontos.length; i += 2) g.lineTo(pontos[i], pontos[i + 1]);
    g.stroke({ width, color, alpha: alpha * a });
  }
}
export function desenharEfeitos(g, efeitos, reduzirMovimento = false) {
  g.clear();
  for (const e of efeitos) {
    const cor = EFEITOS.find(t => t.id === e.tipo).cor;
    const r = e.tamanho;
    const p = e.progresso;
    // Movimento reduzido mantém a identidade do ataque, em uma composição
    // imóvel no destino que apenas desaparece, sem trajetória ou flashes.
    const voo = reduzirMovimento ? 1 : Math.min(1, p / .32);
    const x = e.x1 + (e.x2 - e.x1) * voo;
    const y = e.y1 + (e.y2 - e.y1) * voo;
    if (voo < 1) {
      const angulo = Math.atan2(e.y2 - e.y1, e.x2 - e.x1);
      if (e.tipo === 'raio') raio(g, e.x1, e.y1, x, y, r, p * 8, 1);
      else if (e.tipo === 'gelo') {
        for (let i = 0; i < 5; i++) cristal(g, x - Math.cos(angulo) * i * r * .12, y - Math.sin(angulo) * i * r * .12, r * .17, angulo, 1 - i * .16);
      } else if (e.tipo === 'fogo') {
        for (let i = 5; i >= 0; i--) chama(g, x - Math.cos(angulo) * i * r * .09, y - Math.sin(angulo) * i * r * .09, r * (.2 - i * .02), angulo - Math.PI / 2, 1 - i * .13);
      } else {
        for (let i = 8; i >= 0; i--) g.circle(x - Math.cos(angulo) * i * r * .05, y - Math.sin(angulo) * i * r * .05, r * (.13 - i * .009)).fill({ color: cor, alpha: .8 - i * .08 });
      }
      continue;
    }
    const t = reduzirMovimento ? .4 : (p - .32) / .68;
    const alpha = reduzirMovimento ? 1 - p : Math.min(1, (1 - t) * 1.8);
    const expansao = reduzirMovimento ? .8 : .3 + .7 * Math.sin(Math.min(1, t * 1.4) * Math.PI / 2);
    if (e.tipo === 'fogo') {
      g.circle(x, y, r * expansao * .65).fill({ color: 0xff5018, alpha: alpha * .16 });
      for (let i = 0; i < 17; i++) {
        const a = i * 2.39996;
        const d = Math.sqrt(i / 17) * r * expansao * .65;
        chama(g, x + Math.cos(a) * d, y + Math.sin(a) * d - t * r * .15, r * (.18 + (i % 3) * .045) * (1 - t * .35), Math.sin(i) * .4, alpha * .9);
      }
      for (let i = 0; i < 20; i++) {
        const a = i * 2.39996, d = r * expansao * (.65 + (i % 4) * .14);
        g.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d).lineTo(x + Math.cos(a) * (d + 6), y + Math.sin(a) * (d + 6)).stroke({ color: 0xffd871, width: 2, alpha });
      }
    } else if (e.tipo === 'veneno') {
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39996, d = Math.sqrt(i / 22) * r * expansao * .65;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d - t * r * .12;
        const size = r * (.2 + (i % 4) * .025);
        g.circle(px, py, size).fill({ color: i % 2 ? 0x537832 : 0x8ac83f, alpha: alpha * .38 });
        if (i % 3 === 0) g.circle(px, py - size * .3, size * .2).stroke({ color: 0xd1f56d, width: 1.5, alpha: alpha * .8 });
      }
      // Crânio estilizado, legível mesmo sem movimento.
      g.circle(x, y - r * .06, r * .21).fill({ color: 0xc8ef8c, alpha: alpha * .8 });
      g.rect(x - r * .12, y + r * .06, r * .24, r * .17).fill({ color: 0xc8ef8c, alpha: alpha * .8 });
      for (const dx of [-.08, .08]) g.circle(x + r * dx, y - r * .055, r * .05).fill({ color: 0x263b29, alpha });
    } else if (e.tipo === 'gelo') {
      for (let i = 0; i < 14; i++) {
        const a = i * 2.39996, d = r * expansao * Math.sqrt(i / 14) * .8;
        cristal(g, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.18 + (i % 3) * .07), a, alpha);
      }
    } else if (e.tipo === 'raio') {
      for (let i = 0; i < 7; i++) {
        const a = i * Math.PI * 2 / 7;
        raio(g, x, y, x + Math.cos(a) * r * expansao, y + Math.sin(a) * r * expansao, r * .4, reduzirMovimento ? i : t * 6 + i, alpha);
      }
    } else {
      const pontos = [];
      for (let i = 0; i < 20; i++) {
        const a = i * Math.PI / 10, d = r * expansao * (i % 2 ? .22 : .75 + (i % 3) * .1);
        pontos.push(x + Math.cos(a) * d, y + Math.sin(a) * d);
      }
      g.poly(pontos).fill({ color: 0xffc261, alpha: alpha * .75 }).stroke({ color: 0xfff0c3, width: 2, alpha });
      g.moveTo(x - r * .5, y + r * .45).quadraticCurveTo(x, y - r * .25, x + r * .65, y - r * .5).stroke({ color: 0xffffff, width: 4, alpha });
    }
  }
}
