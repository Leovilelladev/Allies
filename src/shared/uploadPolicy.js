export const UPLOAD_LIMITES = Object.freeze({
  imagem: Object.freeze({
    nome: 'imagem',
    maxBytes: 5 * 1024 * 1024,
    tipos: Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  }),
  mapa: Object.freeze({
    nome: 'mapa',
    maxBytes: 20 * 1024 * 1024,
    tipos: Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  }),
  audio: Object.freeze({
    nome: 'áudio',
    maxBytes: 25 * 1024 * 1024,
    tipos: Object.freeze(['audio/*']),
  }),
});

function formatarMegabytes(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function tipoPermitido(mime, tipos) {
  return tipos.some((tipo) => {
    if (tipo.endsWith('/*')) return mime.startsWith(tipo.slice(0, -1));
    return mime === tipo;
  });
}

export function validarArquivoUpload(arquivo, politica) {
  if (!arquivo) throw new Error(`Nenhum ${politica.nome} foi selecionado.`);

  if (arquivo.size > politica.maxBytes) {
    throw new Error(`O ${politica.nome} deve ter no máximo ${formatarMegabytes(politica.maxBytes)}.`);
  }

  const mime = String(arquivo.type || '').toLowerCase();
  if (!mime || !tipoPermitido(mime, politica.tipos)) {
    throw new Error(`Formato de ${politica.nome} não permitido.`);
  }

  return arquivo;
}

export function validarImagemUpload(arquivo) {
  return validarArquivoUpload(arquivo, UPLOAD_LIMITES.imagem);
}
