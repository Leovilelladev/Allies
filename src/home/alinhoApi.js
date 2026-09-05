export async function perguntarAlinho(pergunta, { signal, fetchImpl = fetch } = {}) {
  const response = await fetchImpl('/api/alinho', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pergunta }),
    signal,
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('A conversa com IA ainda não está disponível neste endereço. Use os tópicos de ajuda.'); }
  if (!response.ok) throw new Error(data.erro || 'Não consegui responder agora. Tente mais tarde.');
  if (typeof data.resposta !== 'string' || !data.resposta.trim()) throw new Error('Não recebi uma resposta. Tente mais tarde.');
  return data;
}
