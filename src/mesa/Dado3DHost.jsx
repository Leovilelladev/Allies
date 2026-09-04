import { lazy, Suspense, useEffect, useState } from 'react';
import { EVENTO_ROLAGEM_3D } from './diceEvents';

const Dado3DOverlay = lazy(() => import('./Dado3DOverlay'));

export default function Dado3DHost() {
  const [rolagem, setRolagem] = useState(null);

  useEffect(() => {
    const receber = (event) => {
      if (!event.detail?.d20?.valores?.length) return;
      setRolagem({ ...event.detail, nonce: crypto.randomUUID() });
    };
    window.addEventListener(EVENTO_ROLAGEM_3D, receber);
    return () => window.removeEventListener(EVENTO_ROLAGEM_3D, receber);
  }, []);

  if (!rolagem) return null;
  return (
    <Suspense fallback={null}>
      <Dado3DOverlay
        key={rolagem.nonce}
        rolagem={rolagem}
        onClose={() => setRolagem(null)}
      />
    </Suspense>
  );
}
