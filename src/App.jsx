import { useEffect, useState } from 'react';
import { sb, ToastProvider, ConfirmProvider } from './shared';
import { Login } from './login';
import { Home } from './home';
import { Mesa } from './mesa';

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
        const salvoLocal = localStorage.getItem('allies_usuario');
        if (salvoLocal) {
          const uData = JSON.parse(salvoLocal);
          if (uData?.id) {
            // Valida se usuario ainda existe no Supabase
            const { data: uDb } = await sb
              .from('usuarios')
              .select('id, nome_usuario, nome_exibicao')
              .eq('id', uData.id)
              .maybeSingle();

            if (uDb) {
              setUsuarioAtual({
                id: uDb.id,
                nome_usuario: uDb.nome_usuario,
                nome_exibicao: uDb.nome_exibicao || uDb.nome_usuario,
                email: `${uDb.nome_usuario}@allies.local`,
              });
              setCarregandoSessao(false);
              return;
            }
          }
        }

        // Tenta pegar de Supabase Auth
        const { data: authData } = await sb.auth.getSession();
        if (authData?.session?.user) {
          const authUser = authData.session.user;
          const uNome =
            authUser.user_metadata?.usuario ||
            authUser.email?.split('@')[0] ||
            '';

          if (uNome) {
            const { data: uDb } = await sb
              .from('usuarios')
              .select('id, nome_usuario, nome_exibicao')
              .ilike('nome_usuario', uNome)
              .maybeSingle();

            if (uDb) {
              const uObj = {
                id: uDb.id,
                nome_usuario: uDb.nome_usuario,
                nome_exibicao: uDb.nome_exibicao || uDb.nome_usuario,
                email: authUser.email,
              };
              localStorage.setItem('allies_usuario', JSON.stringify(uObj));
              setUsuarioAtual(uObj);
            }
          }
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
          <Mesa
            campanhaId={mesaCampanhaId}
            sessaoInicialId={mesaSessaoId}
            onVoltarCampanha={handleVoltarCampanha}
          />
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
