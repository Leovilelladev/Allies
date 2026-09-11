import { useEffect } from 'react';

/**
 * Fecha um dropdown ao clicar fora dele ou apertar Esc.
 * @param {object} ref  ref do elemento que engloba gatilho + painel
 * @param {function} aoFechar
 * @param {boolean} ativo
 */
export default function useFecharFora(ref, aoFechar, ativo = true) {
  useEffect(() => {
    if (!ativo) return undefined;

    const clique = (e) => {
      if (ref.current && !ref.current.contains(e.target)) aoFechar();
    };
    const tecla = (e) => {
      if (e.key === 'Escape') aoFechar();
    };

    document.addEventListener('mousedown', clique);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', clique);
      document.removeEventListener('keydown', tecla);
    };
  }, [ref, aoFechar, ativo]);
}
