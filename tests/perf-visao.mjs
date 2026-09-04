import { celulasVisiveisDoPonto } from '../src/mesa/paredes.js';

const grid = 70;
const paredes = [];
for (let i = 0; i < 60; i++) {
  const x = Math.random() * 30 * grid;
  const y = Math.random() * 20 * grid;
  const horizontal = Math.random() > 0.5;
  paredes.push({
    tipo: 'parede',
    x1: x, y1: y,
    x2: horizontal ? x + grid * 4 : x,
    y2: horizontal ? y : y + grid * 4,
    aberta: false,
  });
}
const tokens = Array.from({ length: 5 }, () => ({
  x: Math.random() * 30 * grid,
  y: Math.random() * 20 * grid,
}));

const raio = grid * 12;
const rodadas = 60;
const inicio = performance.now();
let total = 0;
for (let r = 0; r < rodadas; r++) {
  for (const t of tokens) total += celulasVisiveisDoPonto(t.x, t.y, raio, grid, paredes).size;
}
const ms = (performance.now() - inicio) / rodadas;
console.log('60 paredes / 5 tokens / raio 18m');
console.log(`tempo por recalculo: ${ms.toFixed(2)} ms`);
console.log(`celulas visiveis: ${Math.round(total / rodadas)}`);
console.log(ms < 16 ? 'OK - cabe num frame de 60fps' : ms < 50 ? 'aceitavel' : 'LENTO demais');
