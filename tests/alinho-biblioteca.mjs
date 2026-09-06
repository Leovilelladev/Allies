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

const elfo = buscarRegras(['Elf', 'Wood Elf', 'Darkvision']);
assert.ok(elfo.some(t => t.pagina === 84 && /As an Elf[\s\S]*?Darkvision[\s\S]*?60 feet/.test(t.texto)));
assert.ok(elfo.some(t => t.pagina === 85 && t.texto.includes('Wood Elf')));
for (const primeira of ['Você tem visão no escuro de 60 pés.', 'Visão no escuro: 60 pés [84].']) {
  let numero = 0;
  const revisao = criarServicoAlinho({ env, fetchImpl: async (_, opcoes) => {
    numero++;
    const pedido = JSON.parse(opcoes.body);
    if (numero === 1) return Response.json({ choices: [{ message: { content: '{"termos":["Elf","Wood Elf","Darkvision"],"nomes":[]}' } }] });
    if (numero === 2) return Response.json({ choices: [{ message: { content: primeira } }] });
    assert.equal(pedido.messages.length, 4);
    assert.equal(pedido.messages[2].content, primeira);
    assert.match(pedido.messages[0].content, /As an Elf/);
    const ref = elfo.findIndex(t => t.pagina === 84) + 1;
    return Response.json({ choices: [{ message: { content: 'Se você quer dizer visão no escuro, são 60 pés (18 m na convenção de mesa) [' + ref + '].' }, finish_reason: 'stop' }] });
  } });
  const resposta = await revisao({ pergunta: 'elfo da floresta enxerga qnts mts' });
  assert.equal(numero, 3, 'Faz somente uma revisão das citações');
  assert.equal(resposta.body.fonte, 'srd-5.2.1');
  assert.equal(resposta.body.fontes[0].pagina, 84);
}
console.log('Alinho: traços de elfo e recuperação de citações ausentes/incorretas OK');
