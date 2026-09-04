export const EVENTO_ROLAGEM_3D = 'allies:dice-roll';

export function anunciarRolagem3D(payload) {
  if (typeof window === 'undefined') return;

  let detalhe = payload;
  if (!payload?.d20 && payload?.dados?.partes) {
    const valores = payload.dados.partes
      .filter((parte) => parte.tipo === 'dado' && parte.faces === 20 && parte.sinal > 0)
      .flatMap((parte) => parte.rolagens);
    if (!valores.length) return;
    detalhe = {
      ...payload,
      d20: {
        valores,
        escolhido: valores[0],
        total: payload.dados.total,
        modo: 'soma',
        multiplos: true,
        critico: valores.includes(20),
        falha: valores.includes(1),
      },
    };
  }

  if (!detalhe?.d20) return;
  window.dispatchEvent(new CustomEvent(EVENTO_ROLAGEM_3D, { detail: detalhe }));
}
