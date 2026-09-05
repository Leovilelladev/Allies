import assert from 'node:assert/strict';
import { encontrarFicha } from '../src/mesa/selecaoFicha.js';

const fichas = [{ id: 1, nome: 'Aria' }, { id: 2, nome: 'Borin' }];
assert.equal(encontrarFicha(fichas, '2'), fichas[1], 'Troca pelo valor textual do select');
assert.equal(encontrarFicha(fichas, String(fichas[1].id)), fichas[1], 'Restaura ID persistido');
assert.equal(encontrarFicha(fichas, 1), fichas[0]);
assert.equal(encontrarFicha(fichas, '99'), null, 'Ficha removida não é restaurada');
assert.equal(encontrarFicha(fichas, null), null);
assert.equal(encontrarFicha([], '1'), null);
const textual = [{ id: 'personagem-a' }];
assert.equal(encontrarFicha(textual, 'personagem-a'), textual[0]);
console.log('Seleção de fichas: OK');
