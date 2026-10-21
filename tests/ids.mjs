import assert from 'node:assert/strict';
import { hasId, sameId } from '../src/shared/ids.js';

const mestre = '8c62b8f7-6b9d-4c92-a0c8-1d5f2a8f7a10';
assert.equal(sameId(mestre, mestre), true);
assert.equal(sameId(mestre, '7ec7e8a2-b70f-4b62-a51d-1c2a4e9b5f01'), false);
assert.equal(sameId(42, '42'), true);
assert.equal(sameId(undefined, mestre), false);
assert.equal(hasId(mestre), true);
assert.equal(hasId(''), false);

console.log('IDs: comparação UUID e validação de presença OK');
