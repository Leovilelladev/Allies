import Avatar from '../../shared/Avatar';

export default function MenuConfiguracoes({ perfil, onMeuPerfil, onConfiguracoes, onSair }) {
  return (
    <div className="nexus-dropdown nexus-menu-config" role="menu">
      <div className="nexus-menu-identidade">
        <Avatar
          url={perfil?.avatar_url}
          nome={perfil?.nome_exibicao}
          cor={perfil?.cor_destaque}
          tamanho={44}
        />
        <div className="nexus-menu-identidade-txt">
          <strong>{perfil?.nome_exibicao || 'Aventureiro'}</strong>
          <span>@{perfil?.nome_usuario || '—'}</span>
        </div>
      </div>

      <button type="button" className="nexus-menu-item" role="menuitem" onClick={onMeuPerfil}>
        <span className="material-symbols-outlined">account_circle</span>
        <div>
          <strong>Meu perfil</strong>
          <small>Ver como os outros te enxergam</small>
        </div>
      </button>

      <button
        type="button"
        className="nexus-menu-item"
        role="menuitem"
        onClick={() => onConfiguracoes('perfil')}
      >
        <span className="material-symbols-outlined">manage_accounts</span>
        <div>
          <strong>Editar perfil</strong>
          <small>Avatar, título, bio e cor</small>
        </div>
      </button>

      <button
        type="button"
        className="nexus-menu-item"
        role="menuitem"
        onClick={() => onConfiguracoes('conta')}
      >
        <span className="material-symbols-outlined">key</span>
        <div>
          <strong>Conta e senha</strong>
          <small>Credenciais de acesso</small>
        </div>
      </button>

      <button
        type="button"
        className="nexus-menu-item"
        role="menuitem"
        onClick={() => onConfiguracoes('notificacoes')}
      >
        <span className="material-symbols-outlined">tune</span>
        <div>
          <strong>Notificações</strong>
          <small>Escolha o que te avisa</small>
        </div>
      </button>

      <div className="nexus-menu-sep" />

      <button type="button" className="nexus-menu-item perigo" role="menuitem" onClick={onSair}>
        <span className="material-symbols-outlined">logout</span>
        <div>
          <strong>Sair da conta</strong>
        </div>
      </button>
    </div>
  );
}
