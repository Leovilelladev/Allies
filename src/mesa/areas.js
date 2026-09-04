// Áreas de efeito (bola de fogo, cone de dragão, linha de relâmpago).
// Tudo é guardado em metros; a conversão para pixels usa o tamanho do
// quadrado da cena.
import { METROS_POR_QUADRADO } from './constantes';

export const FORMAS = [
  { id: 'circulo', rotulo: 'Círculo', dica: 'Raio, tipo bola de fogo' },
  { id: 'cone', rotulo: 'Cone', dica: 'Comprimento; arraste pra mirar' },
  { id: 'linha', rotulo: 'Linha', dica: 'Comprimento; arraste pra mirar' },
  { id: 'quadrado', rotulo: 'Quadrado', dica: 'Lado, centralizado no clique' },
];

export const TAMANHOS_SUGERIDOS = [1.5, 3, 4.5, 6, 9, 12, 18, 24, 30];

// No 5e o cone tem, na ponta, largura igual ao comprimento
export const MEIO_ANGULO_CONE = Math.atan(0.5);

export function metrosParaPx(metros, gridSize) {
  return (metros / METROS_POR_QUADRADO) * gridSize;
}

/** A área pega o centro deste token? */
export function tokenNaArea(token, area, gridSize) {
  const dx = token.x - area.x;
  const dy = token.y - area.y;
  const tamanhoPx = metrosParaPx(area.tamanho, gridSize);

  if (area.forma === 'circulo') {
    return Math.hypot(dx, dy) <= tamanhoPx;
  }

  if (area.forma === 'quadrado') {
    const meio = tamanhoPx / 2;
    return Math.abs(dx) <= meio && Math.abs(dy) <= meio;
  }

  if (area.forma === 'cone') {
    const dist = Math.hypot(dx, dy);
    if (dist > tamanhoPx || dist === 0) return dist === 0;
    let diferenca = Math.atan2(dy, dx) - area.angulo;
    while (diferenca > Math.PI) diferenca -= Math.PI * 2;
    while (diferenca < -Math.PI) diferenca += Math.PI * 2;
    return Math.abs(diferenca) <= MEIO_ANGULO_CONE;
  }

  if (area.forma === 'linha') {
    const larguraPx = metrosParaPx(area.largura || 1.5, gridSize);
    const cos = Math.cos(area.angulo);
    const sin = Math.sin(area.angulo);
    const aoLongo = dx * cos + dy * sin;
    const perpendicular = -dx * sin + dy * cos;
    return aoLongo >= 0 && aoLongo <= tamanhoPx && Math.abs(perpendicular) <= larguraPx / 2;
  }

  return false;
}

/** Desenha a área num Graphics do Pixi, em coordenadas de mundo. */
export function desenharArea(g, area, gridSize, { preenchimento = 0.16, traco = 0.85 } = {}) {
  const cor = parseInt((area.cor || '#c8aa6e').replace('#', ''), 16);
  const tamanhoPx = metrosParaPx(area.tamanho, gridSize);

  if (area.forma === 'circulo') {
    g.circle(area.x, area.y, tamanhoPx);
  } else if (area.forma === 'quadrado') {
    const meio = tamanhoPx / 2;
    g.rect(area.x - meio, area.y - meio, tamanhoPx, tamanhoPx);
  } else if (area.forma === 'cone') {
    const e = area.angulo - MEIO_ANGULO_CONE;
    const d = area.angulo + MEIO_ANGULO_CONE;
    // A ponta do cone fica um pouco mais longe nas bordas; o triângulo simples
    // é o suficiente e é como a maioria das mesas desenha.
    g.poly([
      area.x,
      area.y,
      area.x + Math.cos(e) * tamanhoPx,
      area.y + Math.sin(e) * tamanhoPx,
      area.x + Math.cos(d) * tamanhoPx,
      area.y + Math.sin(d) * tamanhoPx,
    ]);
  } else if (area.forma === 'linha') {
    const larguraPx = metrosParaPx(area.largura || 1.5, gridSize);
    const cos = Math.cos(area.angulo);
    const sin = Math.sin(area.angulo);
    const px = -sin * (larguraPx / 2);
    const py = cos * (larguraPx / 2);
    g.poly([
      area.x + px,
      area.y + py,
      area.x + cos * tamanhoPx + px,
      area.y + sin * tamanhoPx + py,
      area.x + cos * tamanhoPx - px,
      area.y + sin * tamanhoPx - py,
      area.x - px,
      area.y - py,
    ]);
  } else {
    return;
  }

  g.fill({ color: cor, alpha: preenchimento });
  g.stroke({ width: 2 / (g.__escala || 1), color: cor, alpha: traco });
}
