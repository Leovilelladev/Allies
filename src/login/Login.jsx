import { useState } from 'react';
import { sb } from '../shared/supabaseClient';
import { criarLimitadorJanela } from '../shared/rateLimit';
import { obterBackgroundAleatorio } from './backgrounds';
import './login.css';
import { Astra_login } from './Astra_auth';

const MIN_PASSWORD_LENGTH = 8;
const limiteTentativasAuth = criarLimitadorJanela({ maximo: 5, janelaMs: 60_000 });

function traduzErro(msg) {
  if (/invalid login credentials/i.test(msg)) return 'Usuário, e-mail ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Este e-mail já possui uma conta.';
  if (/password/i.test(msg)) return `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  return msg;
}

export default function Login({ onAuthSuccess }) {
  const [modoAuth, setModoAuth] = useState('login'); // 'login' | 'signup'
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
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

    const identificadorRaw = usuario.trim();
    const identificadorEhEmail = identificadorRaw.includes('@');
    const usuarioRaw = identificadorEhEmail ? '' : identificadorRaw;
    if (modoAuth === 'signup' && !/^[a-zA-Z0-9_]{3,20}$/.test(usuarioRaw)) {
      setErro('Usuário deve ter de 3 a 20 caracteres: letras, números ou underscore.');
      return;
    }
    if (modoAuth === 'login' && !identificadorEhEmail && !/^[a-zA-Z0-9_]{3,20}$/.test(usuarioRaw)) {
      setErro('Informe um e-mail ou um usuário válido.');
      return;
    }

    if (!senha || senha.length < MIN_PASSWORD_LENGTH) {
      setErro(`A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    const usuarioLimpo = usuarioRaw.toLowerCase();
    const tentativa = limiteTentativasAuth.tentar();
    if (!tentativa.permitido) {
      const segundos = Math.max(1, Math.ceil(tentativa.aguardeMs / 1000));
      setErro(`Muitas tentativas. Aguarde ${segundos}s e tente novamente.`);
      return;
    }
    setCarregando(true);

    try {
      if (modoAuth === 'signup') {
        const nomeLimpo = nome.trim();
        if (!nomeLimpo) {
          setErro('Informe seu nome de aventureiro.');
          setCarregando(false);
          return;
        }
        const emailLimpo = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
          setErro('Informe um e-mail válido para confirmar sua conta.');
          setCarregando(false);
          return;
        }

        // O perfil é criado pelo trigger do Supabase Auth. Nunca persistimos
        // senha em tabela pública e não fazemos pré-consulta de username:
        // usuários anônimos não devem ter acesso ao diretório de perfis.
        const { data, error: authError } = await sb.auth.signUp({
          email: emailLimpo,
          password: senha,
          options: {
            data: { nome: nomeLimpo, usuario: usuarioLimpo },
          },
        });

        if (authError) throw authError;
        if (!data?.user) throw new Error('Não foi possível criar a conta.');

        if (!data.session) {
          setErro('Conta criada. Confirme o e-mail recebido para concluir o acesso.');
          return;
        }

        const usuarioSessao = await Astra_login_com_usuario(sb, data.user, usuarioLimpo, nomeLimpo);
        if (onAuthSuccess) onAuthSuccess(usuarioSessao);
      } else {
        const usuarioSessao = await Astra_login(sb, identificadorRaw, senha);

        limiteTentativasAuth.limpar();
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

            {modoAuth === 'signup' && (
              <div className="split-field">
                <label htmlFor="email">E-mail</label>
                <div className="split-input-wrap">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    required
                  />
                </div>
              </div>
            )}

            <div className="split-field">
              <label htmlFor="usuario">{modoAuth === 'signup' ? 'Usuário' : 'E-mail ou usuário'}</label>
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
                  placeholder={modoAuth === 'signup' ? 'Nome de usuário' : 'voce@exemplo.com ou usuário'}
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
                  minLength={MIN_PASSWORD_LENGTH}
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

async function Astra_login_com_usuario(client, user, usuario, nome) {
  const { data: perfil, error } = await client
    .from('usuarios')
    .select('id, auth_id, nome_usuario, nome_exibicao')
    .eq('auth_id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!perfil) {
    throw new Error('Conta criada, mas o perfil ainda não foi provisionado. Tente entrar novamente.');
  }
  return {
    id: perfil.id,
    nome_usuario: perfil.nome_usuario || usuario,
    nome_exibicao: perfil.nome_exibicao || nome || perfil.nome_usuario || usuario,
    email: user.email,
  };
}
