import { useState } from 'react';
import { sb } from '../shared/supabaseClient';
import { obterBackgroundAleatorio } from './backgrounds';
import './login.css';

function traduzErro(msg) {
  if (/invalid login credentials/i.test(msg)) return 'Usuário ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Este usuário já possui uma conta.';
  if (/password/i.test(msg) && /6/i.test(msg)) return 'A senha precisa de pelo menos 6 caracteres.';
  return msg;
}

export default function Login({ onAuthSuccess }) {
  const [modoAuth, setModoAuth] = useState('login'); // 'login' | 'signup'
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Seleciona um background aleatório no carregamento
  const [bgAtivo] = useState(() => obterBackgroundAleatorio());

  const alternarModo = () => {
    setModoAuth((prev) => (prev === 'login' ? 'signup' : 'login'));
    setErro('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const usuarioRaw = usuario.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(usuarioRaw)) {
      setErro('Usuário deve ter de 3 a 20 caracteres: letras, números ou underscore.');
      return;
    }

    if (!senha || senha.length < 6) {
      setErro('A senha precisa de pelo menos 6 caracteres.');
      return;
    }

    const usuarioLimpo = usuarioRaw.toLowerCase();
    const emailInterno = `${usuarioLimpo}@allies.local`;
    setCarregando(true);

    try {
      if (modoAuth === 'signup') {
        const nomeLimpo = nome.trim();
        if (!nomeLimpo) {
          setErro('Informe seu nome de aventureiro.');
          setCarregando(false);
          return;
        }

        // 1. Verifica se nome_usuario já existe no Supabase
        const { data: usuarioExistente } = await sb
          .from('usuarios')
          .select('id')
          .ilike('nome_usuario', usuarioLimpo)
          .maybeSingle();

        if (usuarioExistente) {
          setErro('Este nome de usuário já está em uso.');
          setCarregando(false);
          return;
        }

        // 2. Cria o registro na tabela public.usuarios
        const { data: novoUsuario, error: insError } = await sb
          .from('usuarios')
          .insert({
            nome_usuario: usuarioLimpo,
            nome_exibicao: nomeLimpo,
            senha: senha,
          })
          .select()
          .single();

        if (insError) {
          throw new Error('Erro ao registrar usuário: ' + insError.message);
        }

        // 3. Tenta cadastrar no Supabase Auth em segundo plano para manter sessão
        try {
          await sb.auth.signUp({
            email: emailInterno,
            password: senha,
            options: {
              data: {
                nome: nomeLimpo,
                usuario: usuarioLimpo,
                usuario_db_id: novoUsuario.id,
              },
            },
          });
        } catch (authErr) {
          console.warn('Nota sobre Supabase Auth:', authErr);
        }

        const usuarioSessao = {
          id: novoUsuario.id,
          nome_usuario: novoUsuario.nome_usuario,
          nome_exibicao: novoUsuario.nome_exibicao || novoUsuario.nome_usuario,
          email: emailInterno,
        };

        localStorage.setItem('allies_usuario', JSON.stringify(usuarioSessao));
        if (onAuthSuccess) onAuthSuccess(usuarioSessao);
      } else {
        // Modo Login
        const { data: usuarioEncontrado, error: busError } = await sb
          .from('usuarios')
          .select('*')
          .ilike('nome_usuario', usuarioLimpo)
          .maybeSingle();

        if (busError) {
          throw new Error('Erro ao buscar usuário: ' + busError.message);
        }

        if (!usuarioEncontrado) {
          setErro('Usuário não encontrado.');
          setCarregando(false);
          return;
        }

        if (usuarioEncontrado.senha !== senha) {
          setErro('Senha incorreta.');
          setCarregando(false);
          return;
        }

        // Tenta logar no Supabase Auth em segundo plano
        try {
          await sb.auth.signInWithPassword({
            email: emailInterno,
            password: senha,
          });
        } catch (authErr) {
          console.warn('Nota sobre login Supabase Auth:', authErr);
        }

        const usuarioSessao = {
          id: usuarioEncontrado.id,
          nome_usuario: usuarioEncontrado.nome_usuario,
          nome_exibicao: usuarioEncontrado.nome_exibicao || usuarioEncontrado.nome_usuario,
          email: emailInterno,
        };

        localStorage.setItem('allies_usuario', JSON.stringify(usuarioSessao));
        if (onAuthSuccess) onAuthSuccess(usuarioSessao);
      }
    } catch (err) {
      setErro(traduzErro(err.message || 'Ocorreu um erro ao processar'));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="split-auth-container">
      {/* Background selecionado aleatoriamente */}
      {bgAtivo && (
        <div className="split-auth-bg active">
          <img src={bgAtivo.src} alt={bgAtivo.nome} loading="eager" decoding="async" />
        </div>
      )}

      {/* Filtro horizontal escurecendo à esquerda e diminuindo para a direita */}
      <div className="split-auth-overlay-horizontal" />

      {/* Coluna da Esquerda: Hero sobre a Imagem com o branding Allies */}
      <aside className="split-auth-hero">
        <div className="split-hero-foot">Allies · Campanhas de RPG</div>
        <div className="split-hero-inner">
          <h1 className="split-hero-title">Allies</h1>
          <div className="split-hero-mark"></div>
          <p className="split-hero-tagline">
            Campanhas, fichas e mesas de batalha num só lugar.
          </p>
        </div>
      </aside>

      {/* Coluna da Direita: Painel com Blur suave no lugar do branco */}
      <div className="split-auth-panel">
        <div className="split-tome">
          <h2>{modoAuth === 'signup' ? 'Criar conta' : 'Entrar'}</h2>
          <p className="split-tome-sub">
            {modoAuth === 'signup'
              ? 'Escolha um nome de usuário e uma senha.'
              : 'Acesse suas campanhas, fichas e mesas.'}
          </p>

          {erro && <div className="split-auth-error">{erro}</div>}

          <form onSubmit={handleSubmit}>
            {modoAuth === 'signup' && (
              <div className="split-field">
                <label htmlFor="nome">Seu nome</label>
                <div className="split-input-wrap">
                  <input
                    type="text"
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    autoComplete="name"
                    placeholder="Seu nome de aventureiro"
                    required
                  />
                </div>
              </div>
            )}

            <div className="split-field">
              <label htmlFor="usuario">Usuário</label>
              <div className="split-input-wrap">
                <input
                  type="text"
                  id="usuario"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  autoComplete="username"
                  required
                  pattern="[a-zA-Z0-9_]{3,20}"
                  title="3 a 20 caracteres: letras, números ou underscore"
                  placeholder="Nome de usuário"
                  autoFocus
                />
              </div>
            </div>

            <div className="split-field">
              <label htmlFor="senha">Senha</label>
              <div className="split-input-wrap">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  id="senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete={modoAuth === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  placeholder="Sua senha secreta"
                />
                <button
                  type="button"
                  className="split-toggle-pass"
                  onClick={() => setMostrarSenha((v) => !v)}
                  title={mostrarSenha ? 'Ocultar senha' : 'Ver senha'}
                >
                  {mostrarSenha ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            <button type="submit" className="split-btn-submit" disabled={carregando}>
              {carregando
                ? modoAuth === 'signup'
                  ? 'Criando…'
                  : 'Entrando…'
                : modoAuth === 'signup'
                ? 'Criar conta'
                : 'Entrar'}
            </button>
          </form>

          <div className="split-switch">
            <span>{modoAuth === 'signup' ? 'Já tem conta?' : 'Ainda não tem conta?'}</span>
            <button type="button" onClick={alternarModo}>
              {modoAuth === 'signup' ? 'Entrar' : 'Criar conta'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
