// Upload de imagens da mesa (retratos de ficha e imagens de token).
// A imagem é redimensionada no navegador antes de subir, então o bucket
// guarda arquivos pequenos em vez de fotos de 4 MB.
import { sb } from '../shared/supabaseClient';
import { redimensionarImagem } from '../shared/imageUtils';

const BUCKET_RETRATOS = 'mesa-imagens';
const BUCKET_MAPAS = 'mesa-mapas';

function dataUrlParaBlob(dataUrl) {
  const [cabecalho, base64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(cabecalho)?.[1] || 'image/jpeg';
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function subir(bucket, blob, pasta) {
  const caminho = `${pasta}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from(bucket).upload(caminho, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(caminho);
  return data?.publicUrl || null;
}

function validar(arquivo) {
  if (!arquivo) throw new Error('Nenhum arquivo');
  if (!arquivo.type?.startsWith('image/')) throw new Error('O arquivo precisa ser uma imagem');
}

/** Retrato de ficha / imagem de token: quadrado, 320px. */
export async function enviarImagem(arquivo, pasta = 'geral') {
  validar(arquivo);
  const dataUrl = await redimensionarImagem(arquivo, 320, 320, 0.85);
  return subir(BUCKET_RETRATOS, dataUrlParaBlob(dataUrl), pasta);
}

/**
 * Baixa a imagem de uma URL externa e re-hospeda no nosso storage.
 *
 * Motivo: o canvas WebGL só aceita imagens de origens que liberam CORS. A
 * maioria dos sites não libera, então a imagem "existe" mas nunca aparece no
 * mapa. Trazendo o arquivo para o nosso bucket, ele passa a ser servido da
 * mesma origem e sempre funciona.
 */
export async function importarDeUrl(url, pasta = 'geral', { mapa = false } = {}) {
  const limpa = (url || '').trim();
  if (!limpa) throw new Error('URL vazia');
  if (!/^https?:\/\//i.test(limpa)) throw new Error('A URL precisa começar com http:// ou https://');

  // Já é do nosso storage? Não precisa reimportar.
  if (limpa.includes('/storage/v1/object/public/mesa-')) return limpa;

  let resposta;
  try {
    resposta = await fetch(limpa, { mode: 'cors' });
  } catch (e) {
    throw new Error('Esse site não deixa baixar a imagem direto. Salve o arquivo e use "Enviar imagem".');
  }
  if (!resposta.ok) throw new Error(`O site respondeu ${resposta.status}. Confira o link.`);

  const blob = await resposta.blob();
  if (!blob.type?.startsWith('image/')) {
    throw new Error('Esse link não aponta para uma imagem (talvez seja a página, não o arquivo).');
  }

  const arquivo = new File([blob], 'imagem', { type: blob.type });
  if (mapa) return (await enviarMapa(arquivo, pasta)).url;
  return enviarImagem(arquivo, pasta);
}

/** Lê largura e altura originais da imagem antes de enviar. */
export function medirImagem(arquivo) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Mapa da cena: mantém resolução alta (até 2560px) para dar zoom sem borrar.
 * Devolve a URL pública e as dimensões originais, que servem pra sugerir
 * quantos quadrados a mesa deve ter.
 */
export async function enviarMapa(arquivo, pasta = 'geral') {
  validar(arquivo);
  const medidas = await medirImagem(arquivo);
  const dataUrl = await redimensionarImagem(arquivo, 2560, 2560, 0.9);
  const url = await subir(BUCKET_MAPAS, dataUrlParaBlob(dataUrl), pasta);
  return { url, ...(medidas || {}) };
}
