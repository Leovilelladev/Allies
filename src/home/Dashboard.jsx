import { useMemo } from 'react';
import bgCastelo from '../assets/backgrounds/bg-castelo.jpg';
import bgLaboratorio from '../assets/backgrounds/bg-laboratorio.jpg';

const CARD_BACKGROUNDS = [bgCastelo, bgLaboratorio];

function initials(nome) {
  if (!nome) return '?';
  return nome.trim().slice(0, 2).toUpperCase();
}

export default function Dashboard({
  campanhas = [],
  carregando = false,
  fichasPorCampanha = {},
  proximaSessaoPorCampanha = {},
  perfis = {},
  usuarioAtual,
  termoBusca = '',
  onNovaCampanha,
  onAbrirCampanha,
}) {
  // Filtragem em tempo real pelo termo de busca
  const campanhasFiltradas = useMemo(() => {
    return campanhas.filter((c) => {
      const titulo = c.titulo || c.nome || '';
      const desc = c.descricao || '';
      const sist = c.sistema || '';
      const mestre = perfis[c.mestre_id];
      const mestreNome = mestre?.nome_exibicao || mestre?.nome || mestre?.nome_usuario || '';

      const b = termoBusca.toLowerCase();
      const nomeMatch = titulo.toLowerCase().includes(b);
      const descMatch = desc.toLowerCase().includes(b);
      const sistMatch = sist.toLowerCase().includes(b);
      const mestreMatch = mestreNome.toLowerCase().includes(b);

      return !termoBusca || nomeMatch || descMatch || sistMatch || mestreMatch;
    });
  }, [campanhas, termoBusca, perfis]);

  return (
    <div className="nexus-dashboard-container">
      {/* Header da Seção */}
      <div className="nexus-section-header">
        <div>
          <h2 className="nexus-section-heading">Campanhas Ativas</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', margin: '4px 0 0' }}>
            Acesse seus reinos, gerencie membros e convoque novos heróis.
          </p>
        </div>

        <div className="nexus-actions-bar">
          <button className="gold-gradient-btn nexus-btn-create" onClick={onNovaCampanha}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nova Campanha</span>
          </button>
        </div>
      </div>

      {carregando && campanhas.length === 0 && (
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '15px' }}>
          Carregando campanhas do Supabase…
        </p>
      )}

      {!carregando && campanhasFiltradas.length === 0 && (
        <div
          className="hex-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            borderRadius: '12px',
          }}
        >
          <div className="wizard-sparkle-circle" style={{ margin: '0 auto 20px' }}>
            <span className="material-symbols-outlined text-3xl">castle</span>
          </div>
          <h3 style={{ color: 'var(--color-primary)', margin: '0 0 10px', fontSize: '24px', fontFamily: 'var(--font-serif)' }}>
            {termoBusca ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha ativa'}
          </h3>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: '0 0 24px', fontSize: '15px' }}>
            {termoBusca
              ? `Nenhum resultado para "${termoBusca}".`
              : 'Crie sua primeira campanha para iniciar a jornada com seus amigos.'}
          </p>
          {!termoBusca && (
            <button className="gold-gradient-btn nexus-btn-create" onClick={onNovaCampanha} style={{ margin: '0 auto' }}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Criar Primeira Campanha</span>
            </button>
          )}
        </div>
      )}

      {/* Grid de Cards de Campanha */}
      <div className="nexus-cards-grid">
        {campanhasFiltradas.map((c, index) => {
          const mestre = perfis[c.mestre_id];
          const mestreNome = mestre?.nome_exibicao || mestre?.nome || mestre?.nome_usuario || 'Mestre';
          const nFichas = fichasPorCampanha[c.id] || 0;
          const artBg = c.imagem_capa_url || CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length];
          const souMestre = Number(c.mestre_id) === Number(usuarioAtual?.id);
          const proxSessao = proximaSessaoPorCampanha[c.id];

          return (
            <div
              key={c.id}
              className="hex-card hex-glow nexus-campaign-card group"
              onClick={() => onAbrirCampanha(c.id)}
            >
              {/* Background Art com zoom transition */}
              <div
                className="nexus-card-bg-art"
                style={{ backgroundImage: `url(${artBg})` }}
              />

              {/* Gradients */}
              <div className="nexus-card-gradient-bottom" />
              <div className="nexus-card-gradient-top" />

              {/* Conteúdo do Card */}
              <div className="nexus-card-content">
                {/* Badges do topo */}
                <div className="nexus-card-top-badges">
                  <span className="nexus-badge-system">
                    <span className="material-symbols-outlined text-[16px]">token</span>
                    <span>{c.sistema || 'D&D 5E'}</span>
                  </span>

                  {souMestre ? (
                    <span
                      className="nexus-badge-system"
                      style={{
                        borderColor: 'rgba(229, 197, 135, 0.5)',
                        color: 'var(--color-primary)',
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">crown</span>
                      <span>MESTRE</span>
                    </span>
                  ) : (
                    <span className="nexus-badge-status">
                      <span className="material-symbols-outlined text-[16px]">swords</span>
                      <span>JOGADOR</span>
                    </span>
                  )}
                </div>

                {/* Bloco Inferior do Card */}
                <div className="nexus-card-bottom">
                  <h3 className="nexus-card-title">{c.titulo || c.nome}</h3>
                  <p className="nexus-card-gm">
                    GM: <span>{mestreNome}</span>
                  </p>

                  {proxSessao && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--color-secondary)',
                        marginBottom: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      <span>Próxima Sessão Agendada</span>
                    </div>
                  )}

                  <div className="nexus-card-footer">
                    <div className="nexus-avatars-stack">
                      <div className="nexus-avatar-chip" title={`GM: ${mestreNome}`}>
                        {initials(mestreNome)}
                      </div>
                      {nFichas > 0 && (
                        <div
                          className="nexus-avatar-chip"
                          style={{
                            background: 'var(--color-surface-container-highest)',
                            color: 'var(--color-on-surface)',
                          }}
                        >
                          +{nFichas}
                        </div>
                      )}
                    </div>

                    <button className="gold-gradient-btn nexus-btn-card-hover">
                      <span>Ver Campanha</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

