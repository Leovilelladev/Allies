import { useMemo, useState } from 'react';
import { metaNotificacao, tempoRelativo } from '../../shared/notificacoes';

export default function PainelNotificacoes({
  notificacoes = [],
  carregando = false,
  onAbrir,
  onMarcarTodas,
  onExcluir,
  onLimparLidas,
  onFechar,
}) {
  const [filtro, setFiltro] = useState('todas'); // 'todas' | 'nao-lidas'

  const naoLidas = useMemo(() => notificacoes.filter((n) => !n.lida).length, [notificacoes]);
  const lista = useMemo(
    () => (filtro === 'nao-lidas' ? notificacoes.filter((n) => !n.lida) : notificacoes),
    [notificacoes, filtro]
  );

  return (
    <div className="nexus-dropdown nexus-notif-panel" role="dialog" aria-label="Notificações">
      <div className="nexus-dropdown-head">
        <div>
          <h4 className="nexus-dropdown-title">Notificações</h4>
          <span className="nexus-dropdown-sub">
            {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia'}
          </span>
        </div>
        {naoLidas > 0 && (
          <button type="button" className="nexus-dropdown-action" onClick={onMarcarTodas}>
            Marcar todas
          </button>
        )}
      </div>

      <div className="nexus-notif-tabs">
        <button
          type="button"
          className={`nexus-notif-tab ${filtro === 'todas' ? 'active' : ''}`}
          onClick={() => setFiltro('todas')}
        >
          Todas
        </button>
        <button
          type="button"
          className={`nexus-notif-tab ${filtro === 'nao-lidas' ? 'active' : ''}`}
          onClick={() => setFiltro('nao-lidas')}
        >
          Não lidas{naoLidas > 0 ? ` (${naoLidas})` : ''}
        </button>
      </div>

      <div className="nexus-notif-lista">
        {carregando && <div className="nexus-notif-vazio">Carregando…</div>}

        {!carregando && lista.length === 0 && (
          <div className="nexus-notif-vazio">
            <span className="material-symbols-outlined">notifications_off</span>
            <p>
              {filtro === 'nao-lidas'
                ? 'Nenhuma notificação pendente.'
                : 'Nada por aqui ainda. Convites, sessões e novos personagens aparecem nesta lista.'}
            </p>
          </div>
        )}

        {!carregando &&
          lista.map((n) => {
            const meta = metaNotificacao(n.tipo);
            return (
              <div
                key={n.id}
                className={`nexus-notif-item ${n.lida ? '' : 'nao-lida'}`}
                role="button"
                tabIndex={0}
                onClick={() => onAbrir?.(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAbrir?.(n);
                  }
                }}
              >
                <div className="nexus-notif-icone">
                  <span className="material-symbols-outlined">{meta.icone}</span>
                </div>

                <div className="nexus-notif-corpo">
                  <div className="nexus-notif-linha-topo">
                    <span className="nexus-notif-tag">{meta.rotulo}</span>
                    <span className="nexus-notif-tempo">{tempoRelativo(n.criado_em)}</span>
                  </div>
                  <p className="nexus-notif-titulo">{n.titulo}</p>
                  {n.mensagem && <p className="nexus-notif-msg">{n.mensagem}</p>}
                </div>

                <button
                  type="button"
                  className="nexus-notif-excluir"
                  title="Remover notificação"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExcluir?.(n.id);
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            );
          })}
      </div>

      <div className="nexus-dropdown-rodape">
        <button type="button" className="nexus-dropdown-link" onClick={onLimparLidas}>
          Limpar lidas
        </button>
        <button type="button" className="nexus-dropdown-link" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </div>
  );
}
