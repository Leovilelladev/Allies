import assert from 'node:assert/strict';
import { buscarRegras, validarPlano, referenciasUsadas } from '../server/biblioteca.js';
import { criarServicoAlinho } from '../server/alinho.js';

for (const [nome, pagina, evidencia] of [
  ['Concentration', 179, 'maximum DC of 30'],
  ['Fireball', 131, '8d6 Fire damage'],
  ['Magic Missile', 146, '1d4 + 1 Force damage'],
  ['Bag of Holding', 212, '500 pounds'],
  ['Goblin Minion', 290, 'Goblin Minion'],
]) {
  const resultados = buscarRegras([nome], [nome]);
  assert.equal(resultados[0].pagina, pagina, nome);
  assert.ok(resultados.some((r) => r.texto.replace(/\s+/g, ' ').includes(evidencia)), nome);
  assert.ok(resultados.length <= 4);
  assert.ok(resultados.every((r) => r.url.endsWith(`#page=${r.pagina}`)));
}
assert.equal(buscarRegras(['Beholder'], ['Beholder']).length, 0);
assert.equal(buscarRegras(['magic item'], ['Nonexistent Banana Crown']).length, 0);
assert.equal(buscarRegras([]).length, 0);
assert.equal(validarPlano({ termos: [null], nomes: [] }), null);
const trechos = buscarRegras(['Concentration']);
assert.equal(referenciasUsadas('Uma regra [1]. Outra [99].', trechos).length, 1);
assert.equal(referenciasUsadas('Sem referência.', trechos).length, 0);
const env = { ALINHO_ENABLED: 'true', GROQ_API_KEY: 'teste' };
let chamadas = 0;
const ausente = criarServicoAlinho({ env, fetchImpl: async () => {
  chamadas++;
  return Response.json({ choices: [{ message: { content: JSON.stringify({ termos: ['Beholder'], nomes: ['Beholder'] }) } }] });
} });
assert.equal((await ausente({ pergunta: 'Me explique o beholder' })).body.fonte, 'srd-nao-encontrado');
assert.equal(chamadas, 1, 'Não gera regras quando a busca não encontra conteúdo');
for (const resposta of ['Regra inventada [99].', 'Regra sem referência.']) {
  const servico = criarServicoAlinho({ env, fetchImpl: async (_, opcoes) => Response.json({ choices: [{ message: { content: JSON.parse(opcoes.body).response_format ? '{"termos":["Concentration"],"nomes":[]}' : resposta } }] }) });
  assert.equal((await servico({ pergunta: 'Concentração?' })).body.fonte, 'srd-nao-encontrado');
}
console.log('SRD: busca de regras/magias/itens/criaturas, páginas e falha sem fontes OK');
