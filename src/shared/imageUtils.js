/**
 * Allies RPG — Utilitário de Imagens & Redimensionamento para Canvas (Max 500x500px)
 */

export function redimensionarImagem(file, maxLargura = 500, maxAltura = 500, qualidade = 0.88) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Nenhum arquivo fornecido'));
    }

    // Se já for uma string (ex: URL ou dataURL)
    if (typeof file === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;
        if (width > maxLargura || height > maxAltura) {
          const ratio = Math.min(maxLargura / width, maxAltura / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', qualidade));
      };
      img.onerror = () => resolve(file); // Retorna original se falhar CORS
      img.src = file;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Mantém proporção limitando a max 500x500px
        if (width > maxLargura || height > maxAltura) {
          const ratio = Math.min(maxLargura / width, maxAltura / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Erro ao processar imagem'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}
