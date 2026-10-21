import assert from 'node:assert/strict';
import { UPLOAD_LIMITES, validarArquivoUpload } from '../src/shared/uploadPolicy.js';

function arquivo(type, size) {
  return { type, size };
}

assert.doesNotThrow(() => validarArquivoUpload(arquivo('image/jpeg', 1024), UPLOAD_LIMITES.imagem));
assert.doesNotThrow(() => validarArquivoUpload(arquivo('audio/mpeg', 1024), UPLOAD_LIMITES.audio));
assert.throws(
  () => validarArquivoUpload(arquivo('image/jpeg', UPLOAD_LIMITES.imagem.maxBytes + 1), UPLOAD_LIMITES.imagem),
  /no máximo 5 MB/
);
assert.throws(
  () => validarArquivoUpload(arquivo('application/pdf', 1024), UPLOAD_LIMITES.imagem),
  /Formato de imagem não permitido/
);
assert.throws(
  () => validarArquivoUpload(arquivo('audio/mpeg', UPLOAD_LIMITES.audio.maxBytes + 1), UPLOAD_LIMITES.audio),
  /no máximo 25 MB/
);

console.log('Política de uploads: tipos e limites verificados.');
