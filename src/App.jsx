import { lazy, Suspense, useEffect, useState } from 'react';
import { sb, ToastProvider, ConfirmProvider } from './shared';
import { Login } from './login';
import { Astra_restaurarSessao } from './login/Astra_auth';
import { Home } from './home';

const Mesa = lazy(() => import('./mesa/Mesa'));

import './styles/global.css';
import './styles/hub.css';
import './styles/mesa.css';

export default function App() {
  const [usuarioAtual, setUsuarioAtual] = useState(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [tela, setTela] = useState('hub'); // 'hub' | 'mesa'
  const [mesaCampanhaId, setMesaCampanhaId] = useState(null);
  const [mesaSessaoId, setMesaSessaoId] = useState(null);
  const [campanhaInicialHub, setCampanhaInicialHub] = useState(null);

  useEffect(() => {
    // Verifica parâmetros de URL iniciais
    const params = new URLSearchParams(window.location.search);
    const cId = params.get('campanha');
    const sId = params.get('sessao');
    const cenaId = params.get('cena');

    if (cId) {
      if (sId || cenaId) {
        setMesaCampanhaId(cId);
        setMesaSessaoId(sId || null);
        setTela('mesa');
      } else {
        setCampanhaInicialHub(cId);
      }
    }

    const inicializarSessao = async () => {
      try {
        const usuario = await Astra_restaurarSessao(sb);
        if (usuario) {
          localStorage.setItem('allies_usuario', JSON.stringify(usuario));
          setUsuarioAtual(usuario);
        } else {
          localStorage.removeItem('allies_usuario');
        }
      } catch (err) {
        console.warn('Erro ao restaurar sessão:', err);
      } finally {
        setCarregandoSessao(false);
      }
    };

    inicializarSessao();
  }, []);

  const handleAbrirMesa = (campanhaId, sessaoId = null) => {
    setMesaCampanhaId(campanhaId);
    setMesaSessaoId(sessaoId);
    setTela('mesa');
    const p = new URLSearchParams();
    p.set('campanha', campanhaId);
    if (sessaoId) p.set('sessao', sessaoId);
    window.history.replaceState(null, '', `?${p.toString()}`);
  };

  const handleVoltarCampanha = () => {
    setTela('hub');
    const p = new URLSearchParams();
    if (mesaCampanhaId) {
      p.set('campanha', mesaCampanhaId);
      setCampanhaInicialHub(mesaCampanhaId);
    }
    window.history.replaceState(null, '', p.toString() ? `?${p.toString()}` : window.location.pathname);
  };

  const handleLogout = async () => {
    try {
      await sb.auth.signOut();
    } catch (e) {
      console.warn('Erro no signOut:', e);
    }
    localStorage.removeItem('allies_usuario');
    setUsuarioAtual(null);
    setTela('hub');
    window.history.replaceState(null, '', window.location.pathname);
  };

  if (carregandoSessao) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-3)' }}>Carregando Allies…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        {!usuarioAtual ? (
          <Login onAuthSuccess={(u) => { if (u) setUsuarioAtual(u); setTela('hub'); }} />
        ) : tela === 'mesa' && mesaCampanhaId ? (
          <Suspense
            fallback={
              <div className="mesa-root">
                <div className="mesa-msg-central"><p>Carregando a mesa…</p></div>
              </div>
            }
          >
            <Mesa
              campanhaId={mesaCampanhaId}
              sessaoInicialId={mesaSessaoId}
              onVoltarCampanha={handleVoltarCampanha}
            />
          </Suspense>
        ) : (
          <Home
            usuarioAtual={usuarioAtual}
            onLogout={handleLogout}
            onAbrirMesa={handleAbrirMesa}
            campanhaInicialId={campanhaInicialHub}
          />
        )}
      </ConfirmProvider>
    </ToastProvider>
  );
}
