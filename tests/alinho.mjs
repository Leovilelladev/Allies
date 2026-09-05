import assert from 'node:assert/strict';
import { lerRascunho, exportarRascunho, responderDuvida, RASCUNHO_VAZIO } from '../src/home/alinhoModelo.js';

assert.deepEqual(lerRascunho({ getItem: () => '{invalido' }, 'teste'), RASCUNHO_VAZIO);
assert.deepEqual(lerRascunho({ getItem: () => { throw Error('Bloqueado'); } }, 'teste'), RASCUNHO_VAZIO);
assert.equal(lerRascunho({ getItem: () => JSON.stringify({ nome: 'Aria', conceito: 3, extra: 'ignorar' }) }, 'teste').conceito, '');
const armazenado = new Map([['usuario-1', JSON.stringify({ nome: 'Aria' })]]);
const storage = { getItem: (chave) => armazenado.get(chave) };
assert.equal(lerRascunho(storage, 'usuario-1').nome, 'Aria');
assert.equal(lerRascunho(storage, 'usuario-2').nome, '');
assert.match(responderDuvida('Como usar o VTT?'), /mesa virtual/);
assert.match(responderDuvida('ATRIBUTOS e nível'), /edição/);
assert.match(responderDuvida('Qual a capital da França?'), /Ainda não tenho/);
assert.match(exportarRascunho({ ...RASCUNHO_VAZIO, nome: 'Aria' }), /Nome: Aria/);
assert.match(exportarRascunho(RASCUNHO_VAZIO), /não é uma ficha de jogo finalizada/);
console.log('Alinho: rascunhos isolados, recuperação e orientações OK');
