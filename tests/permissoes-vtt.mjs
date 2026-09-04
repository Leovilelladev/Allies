import assert from 'node:assert/strict';
import { podeControlarToken, podeCriarTokenDeFicha } from '../src/mesa/permissoes.js';

const tokenLeo = { id: 1, fichaId: 10, donoId: 7 };
const criatura = { id: 2, fichaId: null, donoId: null };

assert.equal(podeControlarToken({ ehMestre: true, userId: 99, token: criatura }), true);
assert.equal(podeControlarToken({ ehMestre: false, userId: 7, token: tokenLeo }), true);
assert.equal(podeControlarToken({ ehMestre: false, userId: '7', token: tokenLeo }), true);
assert.equal(podeControlarToken({ ehMestre: false, userId: 8, token: tokenLeo }), false);
assert.equal(podeControlarToken({ ehMestre: false, userId: 7, token: criatura }), false);
assert.equal(podeCriarTokenDeFicha({ ehMestre: false, userId: 7, ficha: { usuarioId: 7 } }), true);
assert.equal(podeCriarTokenDeFicha({ ehMestre: false, userId: 7, ficha: { usuarioId: 8 } }), false);

console.log('ok  permissões de controle do VTT');
