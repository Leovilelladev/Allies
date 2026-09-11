import { useRef, useState } from 'react';
import { useToast } from '../../shared/Toast';
import { redimensionarImagem } from '../../shared/imageUtils';
import Avatar from '../../shared/Avatar';
import {
  salvarPerfil,
  alterarSenha,
  CORES_DESTAQUE,
  LIMITE_BIO,
  LIMITE_TITULO,
  COR_PADRAO,
} from '../../shared/perfil';
import { PREFS_NOTIFICACAO_PADRAO } from '../../shared/notificacoes';

const ABAS = [
  { id: 'perfil', rotulo: 'Perfil', icone: 'badge' },
  { id: 'conta', rotulo: 'Conta', icone: 'key' },
  { id: 'notificacoes', rotulo: 'Notificações', icone: 'notifications' },
];

const OPCOES_NOTIFICACAO = [
  {
    chave: 'convites',
    titulo: 'Entradas em campanha',
    desc: 'Quando um mestre te adiciona a uma mesa.',
  },
  {
    chave: 'sessoes',
    titulo: 'Sessões agendadas',
    desc: 'Sessão nova ou remarcada nas suas campanhas.',
  },
  {
    chave: 'personagens',
    titulo: 'Personagens na sua mesa',
    desc: 'Para mestres: alguém vinculou um personagem.',
  },
  {
    chave: 'lembretes',
    titulo: 'Lembretes de sessão',
    desc: 'Aviso quando a sessão acontece nas próximas 48h.',
  },
];

function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function ModalConfiguracoes({ perfil, abaInicial = 'perfil', onFechar, onSalvo }) {
  const { toast } = useToast();
  const inputArquivo = useRef(null);

  const [aba, setAba] = useState(abaInicial);
  const [salvando, setSalvando] = useState(false);

  // Aba perfil
  const [nomeExibicao, setNomeExibicao] = useState(perfil?.nome_exibicao || '');
  const [titulo, setTitulo] = useState(perfil?.titulo || '');
  const [bio, setBio] = useState(perfil?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(perfil?.avatar_url || '');
  const [cor, setCor] = useState(perfil?.cor_destaque || COR_PADRAO);

  // Aba conta
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);

  // Aba notificações
  const [prefs, setPrefs] = useState({
    ...PREFS_NOTIFICACAO_PADRAO,
    ...(perfil?.preferencias?.notificacoes || {}),
  });

  const escolherArquivo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await redimensionarImagem(file, 256, 256, 0.85);
      setAvatarUrl(dataUrl);
    } catch (err) {
      toast('Não foi possível ler a imagem: ' + (err.message || err), 'erro');
    } finally {
      e.target.value = '';
    }
  };

  const persistir = async (campos, mensagem) => {
    setSalvando(true);
    try {
      const atualizado = await salvarPerfil(perfil.id, campos);
      onSalvo?.(atualizado);
      toast(mensagem, 'sucesso');
    } catch (err) {
      toast(err.message || 'Erro ao salvar.', 'erro');
    } finally {
      setSalvando(false);
    }
  };

  const salvarAbaPerfil = (e) => {
    e.preventDefault();
    persistir(
      {
        nome_exibicao: nomeExibicao,
        titulo,
        bio,
        avatar_url: avatarUrl,
        cor_destaque: cor,
      },
      'Perfil atualizado.'
    );
  };

  const salvarAbaNotificacoes = () => {
    persistir(
      { preferencias: { ...(perfil?.preferencias || {}), notificacoes: prefs } },
      'Preferências de notificação salvas.'
    );
  };

  const submeterSenha = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmaSenha) {
      toast('A confirmação não bate com a nova senha.', 'erro');
      return;
    }
    setTrocandoSenha(true);
    try {
      await alterarSenha(perfil.nome_usuario, senhaAtual, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmaSenha('');
      toast('Senha alterada com sucesso.', 'sucesso');
    } catch (err) {
      toast(err.message || 'Erro ao trocar a senha.', 'erro');
    } finally {
      setTrocandoSenha(false);
    }
  };

  return (
    <div
      className="wizard-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="config-modal">
        <div className="hextech-corner-accent top-left" />
        <div className="hextech-corner-accent top-right" />
        <div className="hextech-corner-accent bottom-left" />
        <div className="hextech-corner-accent bottom-right" />

        <button type="button" className="config-fechar" onClick={onFechar} title="Fechar">
          <span className="material-symbols-outlined">close</span>
        </button>

        <aside className="config-lateral">
          <div className="config-lateral-identidade">
            <Avatar url={avatarUrl} nome={nomeExibicao} cor={cor} tamanho={64} espessura={3} />
            <div>
              <strong>{nomeExibicao || 'Aventureiro'}</strong>
              <span>@{perfil?.nome_usuario}</span>
            </div>
          </div>

          <nav className="config-abas">
            {ABAS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`config-aba ${aba === a.id ? 'active' : ''}`}
                onClick={() => setAba(a.id)}
              >
                <span className="material-symbols-outlined">{a.icone}</span>
                <span>{a.rotulo}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="config-conteudo">
          {aba === 'perfil' && (
            <form onSubmit={salvarAbaPerfil} className="config-form">
              <header className="config-cabecalho">
                <h3>Perfil</h3>
                <p>É assim que você aparece para os outros jogadores da mesa.</p>
              </header>

              <div className="config-avatar-linha">
                <Avatar url={avatarUrl} nome={nomeExibicao} cor={cor} tamanho={92} espessura={3} />
                <div className="config-avatar-acoes">
                  <input
                    ref={inputArquivo}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={escolherArquivo}
                  />
                  <button
                    type="button"
                    className="config-btn-secundario"
                    onClick={() => inputArquivo.current?.click()}
                  >
                    <span className="material-symbols-outlined">upload</span>
                    Enviar imagem
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      className="config-btn-texto"
                      onClick={() => setAvatarUrl('')}
                    >
                      Remover
                    </button>
                  )}
                  <small>PNG, JPG ou WEBP. A imagem é reduzida para 256×256.</small>
                </div>
              </div>

              <div className="config-grid-2">
                <label className="config-campo">
                  <span>Nome de exibição</span>
                  <input
                    type="text"
                    value={nomeExibicao}
                    onChange={(e) => setNomeExibicao(e.target.value)}
                    maxLength={60}
                    required
                  />
                </label>

                <label className="config-campo">
                  <span>
                    Título <em>opcional</em>
                  </span>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={LIMITE_TITULO}
                    placeholder="Mestre, Bardo aposentado, Cronista…"
                  />
                </label>
              </div>

              <label className="config-campo">
                <span>
                  Bio
                  <em>
                    {bio.length}/{LIMITE_BIO}
                  </em>
                </span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, LIMITE_BIO))}
                  rows={4}
                  placeholder="Conte em poucas linhas quem você é na mesa."
                />
              </label>

              <div className="config-campo">
                <span>Cor de destaque</span>
                <div className="config-cores">
                  {CORES_DESTAQUE.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      title={c.nome}
                      className={`config-cor ${cor.toLowerCase() === c.valor ? 'active' : ''}`}
                      style={{ background: c.valor }}
                      onClick={() => setCor(c.valor)}
                    />
                  ))}
                  <label className="config-cor-custom" title="Cor personalizada">
                    <input
                      type="color"
                      value={cor}
                      onChange={(e) => setCor(e.target.value)}
                    />
                    <span className="material-symbols-outlined">colorize</span>
                  </label>
                </div>
              </div>

              <footer className="config-rodape">
                <button type="button" className="config-btn-texto" onClick={onFechar}>
                  Cancelar
                </button>
                <button type="submit" className="gold-gradient-btn config-btn-salvar" disabled={salvando}>
                  {salvando ? 'Salvando…' : 'Salvar perfil'}
                </button>
              </footer>
            </form>
          )}

          {aba === 'conta' && (
            <div className="config-form">
              <header className="config-cabecalho">
                <h3>Conta</h3>
                <p>Dados de acesso. O nome de usuário não pode ser alterado.</p>
              </header>

              <div className="config-grid-2">
                <div className="config-campo">
                  <span>Nome de usuário</span>
                  <input type="text" value={`@${perfil?.nome_usuario || ''}`} disabled />
                </div>
                <div className="config-campo">
                  <span>Na mesa desde</span>
                  <input type="text" value={formatarData(perfil?.criado_em)} disabled />
                </div>
              </div>

              <form onSubmit={submeterSenha} className="config-bloco">
                <h4>Trocar senha</h4>
                <div className="config-grid-2">
                  <label className="config-campo">
                    <span>Senha atual</span>
                    <input
                      type="password"
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  <div />
                  <label className="config-campo">
                    <span>Nova senha</span>
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </label>
                  <label className="config-campo">
                    <span>Confirmar nova senha</span>
                    <input
                      type="password"
                      value={confirmaSenha}
                      onChange={(e) => setConfirmaSenha(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </label>
                </div>

                <footer className="config-rodape">
                  <button
                    type="submit"
                    className="gold-gradient-btn config-btn-salvar"
                    disabled={trocandoSenha}
                  >
                    {trocandoSenha ? 'Trocando…' : 'Trocar senha'}
                  </button>
                </footer>
              </form>
            </div>
          )}

          {aba === 'notificacoes' && (
            <div className="config-form">
              <header className="config-cabecalho">
                <h3>Notificações</h3>
                <p>Escolha o que aparece no sino. Nada é enviado por e-mail.</p>
              </header>

              <div className="config-toggles">
                {OPCOES_NOTIFICACAO.map((o) => (
                  <label key={o.chave} className="config-toggle">
                    <div>
                      <strong>{o.titulo}</strong>
                      <small>{o.desc}</small>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!prefs[o.chave]}
                      onChange={(e) => setPrefs({ ...prefs, [o.chave]: e.target.checked })}
                    />
                    <span className="config-switch" />
                  </label>
                ))}
              </div>

              <footer className="config-rodape">
                <button type="button" className="config-btn-texto" onClick={onFechar}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="gold-gradient-btn config-btn-salvar"
                  onClick={salvarAbaNotificacoes}
                  disabled={salvando}
                >
                  {salvando ? 'Salvando…' : 'Salvar preferências'}
                </button>
              </footer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
