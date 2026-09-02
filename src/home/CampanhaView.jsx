import { useMemo } from 'react';
import { obterRetratoPersonagem } from '../shared';

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

function formatarSessao(ts) {
  if (!ts) return 'A combinar';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'A combinar';
  const min = d.getMinutes();
  const hora = min ? `${d.getHours()}h${String(min).padStart(2, '0')}` : `${d.getHours()}h`;
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hora}`;
}

function initials(nome) {
  if (!nome) return '?';
  return nome.trim().slice(0, 2).toUpperCase();
}

export default function CampanhaView({
  campanha,
  usuarioAtual,
  participantes = [],
  sessoes = [],
  fichas = [],
  perfis = {},
  proximaSessao,
  onVoltar,
  onEditarCampanha,
  onExcluirCampanha,
  onSairCampanha,
  onConvidar,
  onAbrirMesa,
  onNovaFicha,
  onAbrirFicha,
  onExcluirFicha,
  onNovaSessao,
  onEditarSessao,
  onExcluirSessao,
}) {
  const souMestre = Number(campanha.mestre_id) === Number(usuarioAtual?.id);

  const subtitulo = useMemo(() => {
    const partes = [campanha.sistema || 'D&D 5E'];
    if (proximaSessao) {
      partes.push(`Próxima sessão: ${formatarSessao(proximaSessao)}`);
    }
    return partes.join(' · ');
  }, [campanha.sistema, proximaSessao]);

  return (
    <div className="nexus-dashboard-container">
      {/* Barra de Retorno e Ações Superiores */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          type="button"
          className="nexus-btn-back"
          onClick={onVoltar}
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Voltar para Campanhas</span>
        </button>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {souMestre ? (
            <>
              <button
                type="button"
                className="nexus-btn-secondary"
                style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                onClick={onConvidar}
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                <span>Convidar</span>
              </button>
              <button
                type="button"
                className="nexus-btn-secondary"
                style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                onClick={onEditarCampanha}
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>Editar</span>
              </button>
              <button
                type="button"
                className="nexus-btn-danger"
                style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                onClick={onExcluirCampanha}
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Excluir</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="nexus-btn-danger"
              style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
              onClick={onSairCampanha}
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Sair da Campanha</span>
            </button>
          )}

          <button
            type="button"
            className="gold-gradient-btn"
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => onAbrirMesa(campanha.id)}
          >
            <span className="material-symbols-outlined text-[18px]">swords</span>
            <span>Mesa Virtual</span>
          </button>
        </div>
      </div>

      {/* Header da Campanha */}
      <div
        className="hex-card"
        style={{
          padding: '28px',
          borderRadius: '12px',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span className="nexus-badge-system">
            <span className="material-symbols-outlined text-[16px]">token</span>
            <span>{campanha.sistema || 'D&D 5E'}</span>
          </span>
          {souMestre && (
            <span
              className="nexus-badge-system"
              style={{ borderColor: 'rgba(229, 197, 135, 0.5)', color: 'var(--color-primary)' }}
            >
              <span className="material-symbols-outlined text-[16px]">crown</span>
              <span>MESTRE DA CAMPANHA</span>
            </span>
          )}
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '32px',
            color: '#ffffff',
            margin: '0 0 10px',
          }}
        >
          {campanha.titulo || campanha.nome}
        </h1>

        <p style={{ color: 'var(--color-primary)', fontSize: '14px', fontWeight: 600, margin: '0 0 16px' }}>
          {subtitulo}
        </p>

        {campanha.descricao && (
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              fontSize: '15px',
              lineHeight: 1.6,
              maxWidth: '850px',
              margin: '0 0 20px',
            }}
          >
            {campanha.descricao}
          </p>
        )}

        {/* Participantes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 700 }}>
            INTEGRANTES DO REINO:
          </span>
          {participantes.map((m) => {
            const ehMestre = Number(m.usuario_id) === Number(campanha.mestre_id);
            const u = perfis[m.usuario_id];
            const nome = u?.nome_exibicao || u?.nome || u?.nome_usuario || '—';
            return (
              <span
                key={m.usuario_id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                  background: ehMestre ? 'rgba(229, 197, 135, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: ehMestre ? '1px solid rgba(229, 197, 135, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: ehMestre ? 'var(--color-primary)' : 'var(--color-on-surface)',
                }}
              >
                {ehMestre && <span className="material-symbols-outlined text-[14px]">crown</span>}
                <span>{nome}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Sessões da Campanha */}
      <div style={{ marginBottom: '40px' }}>
        <div className="nexus-section-header">
          <h3 className="nexus-section-heading" style={{ fontSize: '22px' }}>
            Sessões da Campanha ({sessoes.length})
          </h3>
          {souMestre && (
            <button className="gold-gradient-btn nexus-btn-create" onClick={onNovaSessao}>
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Nova Sessão</span>
            </button>
          )}
        </div>

        {sessoes.length === 0 ? (
          <div
            className="hex-card"
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              borderRadius: '10px',
            }}
          >
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '15px', margin: 0 }}>
              {souMestre
                ? 'Nenhuma sessão agendada nesta campanha ainda. Crie a S01 para começar a jornada!'
                : 'O mestre ainda não agendou nenhuma sessão nesta campanha.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {sessoes.map((s, idx) => {
              const quando = formatarDataSessao(s.data_agendada || s.data);
              const numSessao = `S${String(idx + 1).padStart(2, '0')}`;
              const st = s.status || 'agendada';

              return (
                <div
                  key={s.id}
                  className="hex-card"
                  style={{
                    padding: '20px',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span className="nexus-badge-system">
                        <span>{numSessao}</span>
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: st === 'ativa' ? 'var(--color-secondary)' : 'var(--color-primary)',
                          fontWeight: 700,
                        }}
                      >
                        {st === 'ativa' ? '⚔️ EM ANDAMENTO' : quando || 'A combinar'}
                      </span>
                    </div>

                    <h4 style={{ color: '#ffffff', fontSize: '18px', margin: '0 0 8px', fontFamily: 'var(--font-serif)' }}>
                      {s.titulo || s.nome || 'Sessão Sem Título'}
                    </h4>

                    {(s.descricao || s.resumo) && (
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-on-surface-variant)',
                          lineHeight: 1.4,
                          margin: '0 0 16px',
                        }}
                      >
                        {s.descricao || s.resumo}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(77, 70, 58, 0.3)',
                      paddingTop: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {souMestre && onEditarSessao && (
                        <button
                          type="button"
                          className="nexus-icon-btn"
                          title="Editar"
                          onClick={() => onEditarSessao(s)}
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                      )}
                      {souMestre && onExcluirSessao && (
                        <button
                          type="button"
                          className="nexus-icon-btn"
                          title="Excluir"
                          onClick={() => onExcluirSessao(s)}
                          style={{ color: 'var(--color-error)' }}
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      className="gold-gradient-btn"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      onClick={() => onAbrirMesa(campanha.id, s.id)}
                    >
                      <span className="material-symbols-outlined text-[16px]">swords</span>
                      <span>Abrir Mesa</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Personagens / Fichas da Campanha */}
      <div>
        <div className="nexus-section-header">
          <h3 className="nexus-section-heading" style={{ fontSize: '22px' }}>
            Personagens da Campanha ({fichas.length})
          </h3>
          <button className="gold-gradient-btn nexus-btn-create" onClick={onNovaFicha}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Personagem</span>
          </button>
        </div>

        {fichas.length === 0 ? (
          <div
            className="hex-card"
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              borderRadius: '10px',
            }}
          >
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '15px', margin: 0 }}>
              Nenhum personagem vinculado a esta campanha ainda.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {fichas.map((f) => {
              const d = f.dados_ficha || f.dados || {};
              const dono = Number(f.usuario_id) === Number(usuarioAtual?.id);
              const u = perfis[f.usuario_id];
              const nomeAutor = u?.nome_exibicao || u?.nome || u?.nome_usuario || '—';
              const nomePersonagem = f.nome || f.nome_personagem || 'Personagem Sem Nome';
              const classe = f.classe || d.classe || 'Aventureiro';
              const nivel = f.nivel || d.nivel || 1;
              const raca = f.raca || d.raca || 'Humano';
              const pvAtual = d.pv_atual ?? d.pv_total ?? 10;
              const pvMax = d.pv_total ?? 10;
              const ca = d.ca ?? 10;
              const portraitUrl = obterRetratoPersonagem(f);

              return (
                <div
                  key={f.id}
                  className="hex-card hex-glow"
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => onAbrirFicha(f.id)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span className="nexus-badge-system">
                        <span>{classe} · Nvl {nivel}</span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                        por {nomeAutor}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          border: '1.5px solid var(--color-surface-tint)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '0 0 8px rgba(229, 197, 135, 0.3)',
                        }}
                      >
                        <img
                          src={portraitUrl}
                          alt={nomePersonagem}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4
                          style={{
                            color: '#ffffff',
                            fontSize: '18px',
                            margin: 0,
                            fontFamily: 'var(--font-serif)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {nomePersonagem}
                        </h4>
                        <p style={{ color: 'var(--color-primary)', fontSize: '12px', margin: '2px 0 0' }}>
                          {raca} · {classe}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '6px 10px',
                        background: 'rgba(4, 14, 34, 0.6)',
                        borderRadius: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                        PV: <span style={{ color: 'var(--color-error)' }}>{pvAtual}</span>/{pvMax}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>
                        CA: <span style={{ color: 'var(--color-secondary)' }}>{ca}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid rgba(77, 70, 58, 0.3)',
                      paddingTop: '10px',
                    }}
                  >
                    <button
                      type="button"
                      className="gold-gradient-btn"
                      style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAbrirFicha(f.id);
                      }}
                    >
                      <span>Abrir Ficha</span>
                    </button>

                    {dono && onExcluirFicha && (
                      <button
                        type="button"
                        className="nexus-icon-btn"
                        style={{ color: 'var(--color-error)', padding: '4px' }}
                        title="Excluir"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExcluirFicha(f.id);
                        }}
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
