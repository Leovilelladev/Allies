import { readFileSync } from 'node:fs';

const livro = JSON.parse(readFileSync(new URL('./biblioteca/srd-5.2.1.json', import.meta.url), 'utf8'));
export const SRD_URL = livro.url;
const normalizar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ignorar = new Set('a an the of to in on for and or is are how what does do can with dnd 2024'.split(' '));
const tokens = (s) => normalizar(s).split(' ').filter((t) => t.length > 2 && !ignorar.has(t));
const frequencias = new Map();
const indice = livro.trechos.map((trecho) => {
  const termos = tokens(trecho.texto);
  const contagem = new Map();
  for (const t of termos) contagem.set(t, (contagem.get(t) || 0) + 1);
  for (const t of contagem.keys()) frequencias.set(t, (frequencias.get(t) || 0) + 1);
  return { ...trecho, normalizado: normalizar(trecho.texto), contagem, tamanho: termos.length };
});
const media = indice.reduce((s, t) => s + t.tamanho, 0) / indice.length;

export function buscarRegras(termos, nomes = []) {
  const frases = termos.map(normalizar).filter(Boolean);
  const palavras = [...new Set(termos.flatMap(tokens))];
  if (!palavras.length) return [];
  const ranqueados = indice.map((trecho) => {
    let score = 0;
    let encontrados = 0;
    for (const p of palavras) {
      const tf = trecho.contagem.get(p) || 0;
      if (!tf) continue;
      encontrados++;
      const idf = Math.log(1 + (indice.length - frequencias.get(p) + .5) / (frequencias.get(p) + .5));
      score += idf * tf * 2.2 / (tf + 1.2 * (.25 + .75 * trecho.tamanho / media));
    }
    for (const frase of frases) {
      if (trecho.normalizado.includes(frase)) score += 6;
      // Prefere a descrição nomeada à menção em uma lista de classe.
      if (trecho.texto.split('\n').some((linha) => normalizar(linha) === frase)) score += 20;
    }
    return { trecho, score: score * (encontrados / palavras.length) };
  }).filter((r) => r.score > 3).sort((a, b) => b.score - a.score);
  // Um nome que não consta nos trechos encontrados não pode receber uma regra inventada.
  if (nomes.some((nome) => !ranqueados.some(({ trecho }) => trecho.normalizado.includes(normalizar(nome))))) return [];
  const escolhidos = [];
  for (const { trecho } of ranqueados) {
    if (escolhidos.length >= 4) break;
    if (escolhidos.filter((t) => t.pagina === trecho.pagina).length >= 2) continue;
    escolhidos.push({ id: trecho.id, pagina: trecho.pagina, texto: trecho.texto, url: `${SRD_URL}#page=${trecho.pagina}` });
  }
  return escolhidos;
}

export function validarPlano(data) {
  if (!data || !Array.isArray(data.termos) || !Array.isArray(data.nomes)) return null;
  if (![...data.termos, ...data.nomes].every((t) => typeof t === 'string' && t.length <= 100)) return null;
  return { termos: data.termos.slice(0, 4), nomes: data.nomes.slice(0, 3) };
}

export function referenciasUsadas(texto, trechos) {
  const ids = new Set([...texto.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
  return trechos.flatMap((t, i) => ids.has(i + 1) ? [{ numero: i + 1, pagina: t.pagina, titulo: 'SRD 5.2.1', url: t.url }] : []);
}
