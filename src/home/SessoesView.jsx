import { useState, useMemo } from 'react';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function formatarDataSessao(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  const base = `${d.getDate()} ${MESES[d.getMonth()]}`;
  const min = d.getMinutes();
  const hora = `${d.getHours()}h${min ? String(min).padStart(2, '0') : '00'}`;
  return `${base} · ${hora}`;
}

function initials(nome) {
  if (!nome) return '?';
  return nome.trim().slice(0, 2).toUpperCase();
}

export default function SessoesView({
  sessoes = [],
  campanhas = [],
  participantesPorSessao = {},
  perfis = {},
  usuarioAtual,
  termoBusca = '',
  onNovaSessao,
  onEditarSessao,
  onExcluirSessao,
  onAbrirMesa,
  onAlternarPresenca,
}) {
  const [campanhaFiltro, setCampanhaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState('todos'); // 'todos' | 'agendada' | 'ativa' | 'concluida'

  const campanhasMap = useMemo(() => {
    const map = {};
    campanhas.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [campanhas]);

  // Contagens
  const stats = useMemo(() => {
    const total = sessoes.length;
    const agendadas = sessoes.filter((s) => s.status === 'agendada' || (!s.status && s.data_agendada)).length;
    const ativas = sessoes.filter((s) => s.status === 'ativa').length;
    const concluidas = sessoes.filter((s) => s.status === 'concluida').length;
    return { total, agendadas, ativas, concluidas };
  }, [sessoes]);

  // Filtragem
  const sessoesFiltradas = useMemo(() => {
    return sessoes.filter((s) => {
      // Filtro de Campanha
      if (campanhaFiltro !== 'todas' && String(s.campanha_id) !== String(campanhaFiltro)) {
        return false;
      }

      // Filtro de Status
      if (statusFiltro !== 'todos') {
        const st = s.status || 'agendada';
        if (statusFiltro === 'agendada' && st !== 'agendada') return false;
        if (statusFiltro === 'ativa' && st !== 'ativa') return false;
        if (statusFiltro === 'concluida' && st !== 'concluida') return false;
      }

      // Termo de Busca
      if (termoBusca) {
        const b = termoBusca.toLowerCase();
        const camp = campanhasMap[s.campanha_id];
        const tituloMatch = (s.titulo || '').toLowerCase().includes(b);
        const descMatch = (s.descricao || '').toLowerCase().includes(b);
        const campMatch = (camp?.titulo || camp?.nome || '').toLowerCase().includes(b);
        if (!tituloMatch && !descMatch && !campMatch) return false;
      }

      return true;
    });
  }, [sessoes, campanhaFiltro, statusFiltro, termoBusca, campanhasMap]);

  return (
    <div className="nexus-dashboard-container">
      {/* Header da Seção */}
      <div className="nexus-section-header">
        <div>
          <h2 className="nexus-section-heading">Sessões de Jogo</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', margin: '4px 0 0' }}>
            Acompanhe episódios agendados, presenças de aventureiros e abra mesas de batalha.
          </p>
        </div>

        <div className="nexus-actions-bar">
          <button className="gold-gradient-btn nexus-btn-create" onClick={onNovaSessao}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nova Sessão</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas / Resumo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div
          className="hex-card"
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(229, 197, 135, 0.15)',
              border: '1px solid rgba(229, 197, 135, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
            }}
          >
            <span className="material-symbols-outlined">swords</span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-primary)' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
              TOTAL DE SESSÕES
            </div>
          </div>
        </div>

        <div
          className="hex-card"
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(67, 226, 210, 0.15)',
              border: '1px solid rgba(67, 226, 210, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-secondary)',
            }}
          >
            <span className="material-symbols-outlined">event</span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-secondary)' }}>
              {stats.agendadas}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
              AGENDADAS / PRÓXIMAS
            </div>
          </div>
        </div>

        <div
          className="hex-card"
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(145, 209, 254, 0.15)',
              border: '1px solid rgba(145, 209, 254, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-tertiary)',
            }}
          >
            <span className="material-symbols-outlined">play_circle</span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-tertiary)' }}>
              {stats.ativas}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
              EM ANDAMENTO
            </div>
          </div>
        </div>

        <div
          className="hex-card"
          style={{
            padding: '16px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-on-surface)',
            }}
          >
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-on-surface)' }}>
              {stats.concluidas}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
              CONCLUÍDAS
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '14px 18px',
          background: 'rgba(21, 31, 52, 0.6)',
          border: '1px solid rgba(77, 70, 58, 0.3)',
          borderRadius: '10px',
        }}
      >
        {/* Filtro por Status */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'agendada', label: 'Agendadas' },
            { id: 'ativa', label: 'Ativas' },
            { id: 'concluida', label: 'Concluídas' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFiltro(st.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border:
                  statusFiltro === st.id
                    ? '1px solid var(--color-primary)'
                    : '1px solid rgba(77, 70, 58, 0.3)',
                background:
                  statusFiltro === st.id
                    ? 'rgba(229, 197, 135, 0.2)'
                    : 'transparent',
                color:
                  statusFiltro === st.id
                    ? 'var(--color-primary)'
                    : 'var(--color-on-surface-variant)',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Filtro por Campanha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            Campanha:
          </span>
          <select
            className="wizard-select"
            style={{ padding: '6px 12px', fontSize: '13px', width: 'auto', minWidth: '180px' }}
            value={campanhaFiltro}
            onChange={(e) => setCampanhaFiltro(e.target.value)}
          >
            <option value="todas">Todas as Campanhas</option>
            {campanhas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titulo || c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista Vazia */}
      {sessoesFiltradas.length === 0 && (
        <div
          className="hex-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            borderRadius: '12px',
          }}
        >
          <div className="wizard-sparkle-circle" style={{ margin: '0 auto 20px' }}>
            <span className="material-symbols-outlined text-3xl">event_available</span>
          </div>
          <h3
            style={{
              color: 'var(--color-primary)',
              margin: '0 0 10px',
              fontSize: '24px',
              fontFamily: 'var(--font-serif)',
            }}
          >
            {termoBusca || campanhaFiltro !== 'todas' || statusFiltro !== 'todos'
              ? 'Nenhuma sessão encontrada'
              : 'Nenhuma sessão registrada'}
          </h3>
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              margin: '0 0 24px',
              fontSize: '15px',
            }}
          >
            {termoBusca || campanhaFiltro !== 'todas' || statusFiltro !== 'todos'
              ? 'Tente alterar os filtros ou o termo de busca.'
              : 'Agende o primeiro encontro da sua campanha com data, horário e preparação dos mapas.'}
          </p>
          <button
            className="gold-gradient-btn nexus-btn-create"
            onClick={onNovaSessao}
            style={{ margin: '0 auto' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Agendar Primeira Sessão</span>
          </button>
        </div>
      )}

      {/* Grid de Cards de Sessões */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {sessoesFiltradas.map((s) => {
          const camp = campanhasMap[s.campanha_id];
          const dataFmt = formatarDataSessao(s.data_agendada || s.data);
          const st = s.status || 'agendada';
          const souMestre = camp?.mestre_id === usuarioAtual?.id;
          const participantesSessao = participantesPorSessao[s.id] || [];
          const estouPresente = participantesSessao.some(
            (p) => p.usuario_id === usuarioAtual?.id && p.presente !== false
          );

          return (
            <div
              key={s.id}
              className="hex-card hex-glow"
              style={{
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div>
                {/* Badges do Topo */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="nexus-badge-system">
                      <span className="material-symbols-outlined text-[16px]">castle</span>
                      <span>{camp ? (camp.titulo || camp.nome) : 'Campanha'}</span>
                    </span>

                    {st === 'ativa' && (
                      <span
                        className="nexus-badge-system"
                        style={{
                          borderColor: 'rgba(67, 226, 210, 0.6)',
                          background: 'rgba(67, 226, 210, 0.15)',
                          color: 'var(--color-secondary)',
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">play_circle</span>
                        <span>EM ANDAMENTO</span>
                      </span>
                    )}

                    {st === 'concluida' && (
                      <span
                        className="nexus-badge-system"
                        style={{
                          borderColor: 'rgba(145, 209, 254, 0.4)',
                          color: 'var(--color-tertiary)',
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>CONCLUÍDA</span>
                      </span>
                    )}

                    {st === 'agendada' && (
                      <span
                        className="nexus-badge-system"
                        style={{
                          borderColor: 'rgba(229, 197, 135, 0.4)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        <span>AGENDADA</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Título da Sessão */}
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '22px',
                    color: '#ffffff',
                    margin: '0 0 10px',
                    lineHeight: 1.3,
                  }}
                >
                  {s.titulo || s.nome || 'Sessão Sem Título'}
                </h3>

                {/* Data e Horário */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: dataFmt ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '14px',
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                  <span>{dataFmt ? dataFmt : 'Data a combinar com o mestre'}</span>
                </div>

                {/* Descrição / Lore / Resumo */}
                {(s.descricao || s.resumo) && (
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-on-surface-variant)',
                      lineHeight: 1.5,
                      margin: '0 0 18px',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {s.descricao || s.resumo}
                  </p>
                )}

                {/* Participantes da Sessão */}
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '10px 14px',
                    background: 'rgba(4, 14, 34, 0.6)',
                    borderRadius: '8px',
                    border: '1px solid rgba(77, 70, 58, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
                      Confirmados ({participantesSessao.length}):
                    </span>
                    <div className="nexus-avatars-stack">
                      {participantesSessao.slice(0, 5).map((p) => {
                        const u = perfis[p.usuario_id];
                        const uNome = u?.nome_exibicao || u?.nome || u?.nome_usuario || 'Aventureiro';
                        return (
                          <div key={p.usuario_id} className="nexus-avatar-chip" title={uNome}>
                            {initials(uNome)}
                          </div>
                        );
                      })}
                      {participantesSessao.length === 0 && (
                        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                          Nenhum ainda
                        </span>
                      )}
                    </div>
                  </div>

                  {onAlternarPresenca && (
                    <button
                      type="button"
                      onClick={() => onAlternarPresenca(s.id, !estouPresente)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: estouPresente ? 'rgba(67, 226, 210, 0.2)' : 'rgba(229, 197, 135, 0.1)',
                        border: estouPresente ? '1px solid var(--color-secondary)' : '1px solid rgba(229, 197, 135, 0.4)',
                        color: estouPresente ? 'var(--color-secondary)' : 'var(--color-primary)',
                      }}
                    >
                      {estouPresente ? '✓ Presente' : '+ Confirmar'}
                    </button>
                  )}
                </div>
              </div>

              {/* Rodapé de Ações */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  borderTop: '1px solid rgba(77, 70, 58, 0.3)',
                  paddingTop: '16px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  {souMestre && onEditarSessao && (
                    <button
                      type="button"
                      className="nexus-icon-btn"
                      title="Editar Sessão"
                      onClick={() => onEditarSessao(s)}
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  )}

                  {souMestre && onExcluirSessao && (
                    <button
                      type="button"
                      className="nexus-icon-btn"
                      title="Excluir Sessão"
                      onClick={() => onExcluirSessao(s)}
                      style={{ color: 'var(--color-error)' }}
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="gold-gradient-btn"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onClick={() => onAbrirMesa(s.campanha_id, s.id)}
                >
                  <span className="material-symbols-outlined text-[18px]">swords</span>
                  <span>Abrir Mesa</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
