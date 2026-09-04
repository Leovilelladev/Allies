import { celulasVisiveisDoPonto, visaoBloqueada, bloqueiaVisao, segmentosCruzam } from '../src/mesa/paredes.js';

const grid = 70;
let falhas = 0;
const checa = (nome, real, esperado) => {
  const ok = real === esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'ok  ' : 'FALHA'} ${nome} (obtido: ${real}, esperado: ${esperado})`);
};

// Cruzamento básico
checa('segmentos que se cruzam', segmentosCruzam(0, 0, 10, 0, 5, -5, 5, 5), true);
checa('segmentos paralelos', segmentosCruzam(0, 0, 10, 0, 0, 5, 10, 5), false);

// Parede vertical em x=140, entre y=0 e y=280
const parede = { tipo: 'parede', x1: 140, y1: 0, x2: 140, y2: 280, aberta: false };
const porta = { ...parede, tipo: 'porta' };
const portaAberta = { ...porta, aberta: true };
const janela = { ...parede, tipo: 'janela' };

checa('parede bloqueia', bloqueiaVisao(parede), true);
checa('porta fechada bloqueia', bloqueiaVisao(porta), true);
checa('porta aberta não bloqueia', bloqueiaVisao(portaAberta), false);
checa('janela não bloqueia', bloqueiaVisao(janela), false);

// Token em (35,140) olhando para o outro lado da parede
checa('visão atravessando a parede', visaoBloqueada(35, 140, 245, 140, [parede]), true);
checa('visão do mesmo lado', visaoBloqueada(35, 140, 105, 140, [parede]), false);

// Células visíveis com raio de 6 quadrados
const raio = grid * 6;
const semParede = celulasVisiveisDoPonto(35, 140, raio, grid, []);
const comParede = celulasVisiveisDoPonto(35, 140, raio, grid, [parede]);

checa('sem parede enxerga a casa (3,2) atrás', semParede.has('3,2'), true);
checa('com parede NÃO enxerga (3,2)', comParede.has('3,2'), false);
checa('com parede ainda enxerga (1,2) antes dela', comParede.has('1,2'), true);
checa('com parede enxerga a própria casa', comParede.has('0,2'), true);
checa('parede reduz o campo de visão', comParede.size < semParede.size, true);

// A parede tem altura limitada: dá pra ver contornando por cima dela
checa('enxerga contornando a parede pelo topo', comParede.has('3,-2') || comParede.has('2,-2'), true);

console.log(falhas === 0 ? '\nTUDO CERTO' : `\n${falhas} FALHA(S)`);
process.exit(falhas ? 1 : 0);
