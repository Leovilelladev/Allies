export const RASCUNHO_VAZIO = { nome: '', conceito: '', estilo: '', historia: '' };

export const DUVIDAS = [
  { titulo: 'Por onde começo?', palavras: ['comec', 'iniciante', 'primeir'], resposta: 'Comece pela ideia do personagem: quem ele é e por que vai se aventurar? Use “Criar minha ficha” aqui comigo para organizar essa ideia. Depois, combine o sistema, a edição e o nível inicial com o mestre.' },
  { titulo: 'Como criar uma ficha no Allies?', palavras: ['ficha', 'personagem', 'criar'], resposta: 'No hub, abra Meus Personagens e use a opção de nova ficha. Meu guia prepara um rascunho para você consultar ao preencher a ficha. Atributos, equipamentos e outras escolhas dependem das regras combinadas com o mestre.' },
  { titulo: 'O que combinar com o mestre?', palavras: ['mestre', 'regra', 'sistema', 'classe', 'atributo', 'nivel', 'magia'], resposta: 'Confirme o sistema e a edição, o nível inicial, as opções de personagem permitidas e como definir os atributos. Também vale conversar sobre o tom da história e os limites do grupo. Ainda não consulto livros de regras nem as regras particulares da sua campanha.' },
  { titulo: 'Como funciona a mesa virtual?', palavras: ['mesa', 'vtt', 'token', 'mapa', 'dado', 'rolar'], resposta: 'A mesa virtual reúne o mapa, os tokens, as fichas, o chat e a iniciativa. Tokens representam personagens ou criaturas no mapa. No painel de ficha, você pode consultar os dados do personagem e fazer rolagens. Combine com o mestre quando rolar.' },
  { titulo: 'Meu rascunho já é uma ficha?', palavras: ['rascunho', 'salv', 'baix', 'pront'], resposta: 'Ainda não. O rascunho reúne suas ideias e fica neste navegador. Você pode baixá-lo para guardar ou compartilhar. Ele não cria um personagem na campanha: depois da revisão com o mestre, preencha a ficha em Meus Personagens.' },
];

export function responderDuvida(texto) {
  const normalizado = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const encontrada = DUVIDAS.find((duvida) => duvida.palavras.some((palavra) => normalizado.includes(palavra)));
  return encontrada?.resposta || 'Ainda não tenho uma resposta pronta para essa dúvida. Posso ajudar com os primeiros passos, fichas e mesa virtual pelos tópicos acima. Para uma regra específica, confirme com o mestre o sistema e a edição usados.';
}

export function lerRascunho(storage, chave) {
  try {
    const salvo = JSON.parse(storage.getItem(chave));
    return Object.fromEntries(Object.keys(RASCUNHO_VAZIO).map((campo) => [campo, typeof salvo?.[campo] === 'string' ? salvo[campo].slice(0, campo === 'nome' ? 80 : 1200) : '']));
  } catch { return { ...RASCUNHO_VAZIO }; }
}

export function exportarRascunho(rascunho) {
  return `ALLIES — Rascunho com o Alinho\n\nNome: ${rascunho.nome}\nConceito: ${rascunho.conceito}\nEstilo de aventura: ${rascunho.estilo || 'A combinar'}\nHistória: ${rascunho.historia || 'A construir'}\n\nPróximos passos com o mestre:\n- Confirmar sistema, edição e nível inicial.\n- Definir classe, origem, atributos e equipamentos.\n- Preencher a ficha em Meus Personagens.\n\nEste rascunho não é uma ficha de jogo finalizada.\n`;
}
