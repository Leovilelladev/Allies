import assert from 'node:assert/strict';
import { criarFilaEfeitos, validarEfeito, EFEITOS } from '../src/mesa/efeitos.js';
import { desenharEfeitos } from '../src/mesa/pixiEfeitos.js';
import { Graphics } from 'pixi.js';
const base = { id: 'teste', tipo: 'fogo', x1: 10, y1: 20, x2: 200, y2: 300, tamanho: 70 };
for (const alteracao of [{ x1: NaN }, { y2: Infinity }, { tamanho: 99999 }, { tipo: 'invalido' }, { id: '' }, { x2: '10' }]) assert.equal(validarEfeito({ ...base, ...alteracao }), null);
const fila = criarFilaEfeitos();
assert.equal(fila.adicionar(base, 0), true);
assert.equal(fila.adicionar(base, 1), false);
for (let i = 1; i < 8; i++) assert.equal(fila.adicionar({ ...base, id: String(i) }, 0), true);
assert.equal(fila.adicionar({ ...base, id: 'lotado' }, 0), false);
assert.equal(fila.quadro(900).length, 8);
assert.equal(fila.quadro(1800).length, 0);
assert.equal(fila.adicionar(base, 2000), false);
assert.equal(fila.adicionar(base, 11000), true);
const g = new Graphics();
for (const e of EFEITOS) for (const progresso of [0, .2, .35, .7, .999]) {
  desenharEfeitos(g, [{ ...base, tipo: e.id, progresso }]);
  desenharEfeitos(g, [{ ...base, tipo: e.id, progresso }], true);
}
desenharEfeitos(g, []);
g.destroy();
console.log('Efeitos: validação, deduplicação, limite, expiração e renderização dos cinco tipos OK');
