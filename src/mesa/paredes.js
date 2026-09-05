// Paredes e linha de visão.
//
// A névoa da mesa é baseada em células da grade, então a visão também é: para
// cada célula dentro do alcance, testamos se o segmento que vai do token até o
// centro dela cruza alguma parede. É mais simples que polígono de visibilidade
// e encaixa direto na névoa que já existe (incluindo a memória do mapa).
import { METROS_POR_QUADRADO } from './constantes.js';

export const TIPOS_PAREDE = [
  { id: 'parede', rotulo: 'Parede', cor: 0xff5858, dica: 'Bloqueia a visão' },
  { id: 'porta', rotulo: 'Porta', cor: 0xc8aa6e, dica: 'Bloqueia quando fechada; clique pra abrir' },
  { id: 'janela', rotulo: 'Janela', cor: 0x0ac8b9, dica: 'Deixa ver através' },
];

export function bloqueiaVisao(parede) {
  if (parede.tipo === 'janela') return false;
  if (parede.tipo === 'porta') return !parede.aberta;
  return true;
}

/** Os segmentos AB e CD se cruzam? */
export function segmentosCruzam(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d2 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  const d3 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d4 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const eps = 1e-7;
  const noSegmento = (px, py, ux, uy, vx, vy) =>
    px >= Math.min(ux, vx) - eps && px <= Math.max(ux, vx) + eps &&
    py >= Math.min(uy, vy) - eps && py <= Math.max(uy, vy) + eps;
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;
  // Contatos nas pontas também bloqueiam: segmentos adjacentes não são frestas.
  return (Math.abs(d1) <= eps && noSegmento(cx, cy, ax, ay, bx, by)) ||
    (Math.abs(d2) <= eps && noSegmento(dx, dy, ax, ay, bx, by)) ||
    (Math.abs(d3) <= eps && noSegmento(ax, ay, cx, cy, dx, dy)) ||
    (Math.abs(d4) <= eps && noSegmento(bx, by, cx, cy, dx, dy));
}

/** Existe parede entre os dois pontos? */
export function visaoBloqueada(x1, y1, x2, y2, paredes) {
  for (const p of paredes) {
    if (segmentosCruzam(x1, y1, x2, y2, p.x1, p.y1, p.x2, p.y2)) return true;
  }
  return false;
}

/**
 * Células que o ponto enxerga: dentro do raio e sem parede no caminho.
 * Devolve um Set de chaves "coluna,linha".
 */
export function celulasVisiveisDoPonto(x, y, raioPx, gridSize, paredes) {
  const vistas = new Set();
  if (raioPx <= 0) return vistas;

  // Só as paredes que podem atrapalhar esse alcance
  const relevantes = paredes.filter(
    (p) =>
      bloqueiaVisao(p) &&
      Math.min(p.x1, p.x2) <= x + raioPx &&
      Math.max(p.x1, p.x2) >= x - raioPx &&
      Math.min(p.y1, p.y2) <= y + raioPx &&
      Math.max(p.y1, p.y2) >= y - raioPx
  );

  const colMin = Math.floor((x - raioPx) / gridSize);
  const colMax = Math.floor((x + raioPx) / gridSize);
  const linMin = Math.floor((y - raioPx) / gridSize);
  const linMax = Math.floor((y + raioPx) / gridSize);
  const limite = raioPx + gridSize * 0.35;

  for (let c = colMin; c <= colMax; c++) {
    for (let l = linMin; l <= linMax; l++) {
      const cx = c * gridSize + gridSize / 2;
      const cy = l * gridSize + gridSize / 2;
      if (Math.hypot(cx - x, cy - y) > limite) continue;

      if (!relevantes.length) {
        vistas.add(`${c},${l}`);
        continue;
      }

      // Basta um canto da célula estar à vista para ela contar — evita que a
      // casa exatamente encostada na parede fique escura sem motivo.
      const alvos = [
        [cx, cy],
        [cx - gridSize * 0.35, cy - gridSize * 0.35],
        [cx + gridSize * 0.35, cy - gridSize * 0.35],
        [cx - gridSize * 0.35, cy + gridSize * 0.35],
        [cx + gridSize * 0.35, cy + gridSize * 0.35],
      ];
      if (alvos.some(([ax, ay]) => !visaoBloqueada(x, y, ax, ay, relevantes))) {
        vistas.add(`${c},${l}`);
      }
    }
  }

  vistas.add(`${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`);
  return vistas;
}

/** Ponto mais próximo do segmento — usado para clicar em cima de uma parede. */
export function distanciaAoSegmento(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const tamanho = vx * vx + vy * vy;
  if (tamanho === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * vx + (py - y1) * vy) / tamanho;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
}

export const metrosParaPxParede = (m, gridSize) => (m / METROS_POR_QUADRADO) * gridSize;
