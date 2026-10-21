import assert from 'node:assert/strict';
import { criarLimitadorJanela } from '../src/shared/rateLimit.js';

let agora = 1_000;
const limite = criarLimitadorJanela({ maximo: 2, janelaMs: 1_000, agora: () => agora });

assert.equal(limite.tentar().permitido, true);
assert.equal(limite.tentar().permitido, true);
assert.equal(limite.tentar().permitido, false);
agora += 1_001;
assert.equal(limite.tentar().permitido, true);
limite.limpar();
assert.equal(limite.tentar().permitido, true);

console.log('Rate limit local: janela, bloqueio e limpeza verificados.');
