import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { sb } from '../shared/supabaseClient';
import { anunciarRolagem3D, EVENTO_ROLAGEM_3D } from './diceEvents';

const Dado3DOverlay = lazy(() => import('./Dado3DOverlay'));

export default function Dado3DHost({ cenaId, scale, stagePos }) {
  const [rolagem, setRolagem] = useState(null);
  const limparDados = useCallback(() => setRolagem(null), []);

  useEffect(() => {
    const receber = (event) => {
      if (!event.detail?.visual?.modelos?.length) return;
      setRolagem({ ...event.detail, nonce: crypto.randomUUID() });
    };
    window.addEventListener(EVENTO_ROLAGEM_3D, receber);
    return () => window.removeEventListener(EVENTO_ROLAGEM_3D, receber);
  }, []);

  useEffect(() => {
    if (!cenaId) return undefined;
    const canal = sb
      .channel(`mesa-dados-3d-${cenaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mesa_chat', filter: `cena_id=eq.${cenaId}` },
        ({ new: mensagem }) => {
          if (mensagem?.tipo !== 'rolagem' || !mensagem.rolagem) return;
          anunciarRolagem3D(mensagem.rolagem);
        }
      )
      .subscribe();
    return () => { sb.removeChannel(canal); };
  }, [cenaId]);

  if (!rolagem) return null;
  return (
    <Suspense fallback={null}>
      <Dado3DOverlay
        key={rolagem.nonce}
        rolagem={rolagem}
        transformacaoMapa={{ scale, stagePos }}
        onClose={limparDados}
      />
    </Suspense>
  );
}
