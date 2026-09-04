import { lazy, Suspense, useEffect, useState } from 'react';
import { EVENTO_ROLAGEM_3D } from './diceEvents';

const Dado3DOverlay = lazy(() => import('./Dado3DOverlay'));

export default function Dado3DHost() {
  const [rolagem, setRolagem] = useState(null);

  useEffect(() => {
    const receber = (event) => {
      if (!event.detail?.d20?.valores?.length) return;
      setRolagem({
        ...event.detail,
        nonce: crypto.randomUUID(),
        fase: event.detail.d20.valores.length > 3 ? 'cinematica' : 'dados',
      });
    };
    window.addEventListener(EVENTO_ROLAGEM_3D, receber);
    return () => window.removeEventListener(EVENTO_ROLAGEM_3D, receber);
  }, []);

  if (!rolagem) return null;
  if (rolagem.fase === 'cinematica') {
    return (
      <div className="dado3d-overlay dado3d-cinematica" role="status" aria-label="Mestre lançando os dados">
        <video
          autoPlay
          muted
          playsInline
          preload="auto"
          src="/videos/mestre_d20_higgsfield_leo.mp4"
          onEnded={() => setRolagem((atual) => ({ ...atual, fase: 'dados' }))}
          onError={() => setRolagem((atual) => ({ ...atual, fase: 'dados' }))}
        />
        <button
          className="dado3d-pular"
          onClick={() => setRolagem((atual) => ({ ...atual, fase: 'dados' }))}
        >
          Pular
        </button>
        <button className="dado3d-fechar" onClick={() => setRolagem(null)} aria-label="Fechar animação">
          ×
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={null}>
      <Dado3DOverlay
        key={`${rolagem.nonce}-${rolagem.fase}`}
        rolagem={rolagem}
        cinematicaExterna={rolagem.fase === 'dados' && rolagem.d20.valores.length > 3}
        onClose={() => setRolagem(null)}
      />
    </Suspense>
  );
}
