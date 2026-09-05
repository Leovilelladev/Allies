export const EVENTO_ROLAGEM_3D = 'allies:dice-roll';
export const FACES_3D = [4, 6, 8, 10, 12, 20, 100];

// Separa a apresentação da mensagem persistida no chat.
export function prepararRolagem3D(payload) {
  if (!payload) return null;
  const modelos = [];
  const adicionar = (faces, valor) => {
    if (!FACES_3D.includes(faces) || !Number.isInteger(valor) || valor < 1 || valor > faces) return;
    if (faces === 100) {
      const dezenas = Math.floor((valor % 100) / 10);
      modelos.push({ modelo: 'percent', face: dezenas || 10, rotulo: `${dezenas}0` });
      modelos.push({ modelo: 'units', face: valor % 10 || 10, rotulo: `${valor % 10}` });
    } else {
      modelos.push({ modelo: faces, face: valor, rotulo: `d${faces}: ${valor}` });
    }
  };
  if (payload.d20) payload.d20.valores.forEach(v => adicionar(20, v));
  for (const formula of [payload.dados, payload.dano]) {
    for (const parte of formula?.partes || []) {
      if (parte.tipo === 'dado') parte.rolagens.forEach(v => adicionar(parte.faces, v));
    }
  }
  if (!modelos.length) return null;
  return {
    ...payload,
    visual: {
      modelos,
      total: payload.d20?.total ?? payload.dados?.total ?? payload.dano?.total,
      detalhe: payload.d20
        ? `${payload.d20.valores.join(' / ')} · ${payload.d20.modo}`
        : (payload.dados ?? payload.dano)?.detalhe,
    },
  };
}

export function anunciarRolagem3D(payload) {
  if (typeof window === 'undefined') return;
  const detalhe = prepararRolagem3D(payload);
  if (detalhe) window.dispatchEvent(new CustomEvent(EVENTO_ROLAGEM_3D, { detail: detalhe }));
}
