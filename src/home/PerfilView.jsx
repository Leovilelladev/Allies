import { useMemo } from 'react';
import Avatar from '../shared/Avatar';
import { obterRetratoPersonagem } from '../shared';

function formatarMesAno(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function PerfilView({
  perfil,
  ehProprio = false,
  usuarioAtual,
  campanhas = [],
  todasFichas = [],
  campanhaPersonagens = [],
  onVoltar,
  onEditar,
  onAbrirCampanha,
  onAbrirFicha,
}) {
  const idPerfil = Number(perfil?.id);
  const idAtual = Number(usuarioAtual?.id);

  const idsCampanhasDoPerfil = useMemo(() => {
    const set = new Set();
    campanhas.forEach((c) => {
      if (Number(c.mestre_id) === idPerfil) set.add(Number(c.id));
    });
    campanhaPersonagens.forEach((cp) => {
      if (Number(cp.usuario_id) === idPerfil) set.add(Number(cp.campanha_id));
    });
    return set;
  }, [campanhas, campanhaPersonagens, idPerfil]);

  const idsCampanhasDoVisitante = useMemo(() => {
    const set = new Set();
    campanhas.forEach((c) => {
      if (Number(c.mestre_id) === idAtual) set.add(Number(c.id));
    });
    campanhaPersonagens.forEach((cp) => {
      if (Number(cp.usuario_id) === idAtual) set.add(Number(cp.campanha_id));
    });
    return set;
  }, [campanhas, campanhaPersonagens, idAtual]);

  const campanhasVisiveis = useMemo(() => {
    return campanhas.filter((c) => {
      const id = Number(c.id);
      if (!idsCampanhasDoPerfil.has(id)) return false;
      return ehProprio || idsCampanhasDoVisitante.has(id);
    });
  }, [campanhas, idsCampanhasDoPerfil, idsCampanhasDoVisitante, ehProprio]);

  const idsVisiveis = useMemo(
    () => new Set(campanhasVisiveis.map((c) => Number(c.id))),
    [campanhasVisiveis]
  );

  const fichasVisiveis = useMemo(() => {
    return todasFichas.filter((f) => {
      if (Number(f.usuario_id) !== idPerfil) return false;
      if (ehProprio) return true;
      return f.campanha_id && idsVisiveis.has(Number(f.campanha_id));
    });
  }, [todasFichas, idPerfil, ehProprio, idsVisiveis]);

  const mestradas = useMemo(
    () => campanhas.filter((c) => Number(c.mestre_id) === idPerfil).length,
    [campanhas, idPerfil]
  );

  const cor = perfil?.cor_destaque || 'var(--color-primary)';

  if (!perfil) {
    return (
      <div className="hex-card" style={{ padding: '60px 24px', textAlign: 'center', borderRadius: '12px' }}>
        <p style={{ color: 'var(--color-on-surface-variant)' }}>Carregando perfil…</p>
      </div>
    );
  }

  return (
    <div className="perfil-container">
      <div style={{ marginBottom: '18px' }}>
        <button type="button" className="nexus-btn-back" onClick={onVoltar}>
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Voltar</span>
        </button>
      </div>

      {/* Cabeçalho do perfil */}
      <div className="perfil-hero hex-card" style={{ '--perfil-cor': cor }}>
        <div className="perfil-hero-brilho" />

        <div className="perfil-hero-conteudo">
          <Avatar
            url={perfil.avatar_url}
            nome={perfil.nome_exibicao}
            cor={cor}
            tamanho={116}
            espessura={3}
          />

          <div className="perfil-hero-txt">
            <div className="perfil-hero-nome-linha">
              <h2 className="perfil-nome">{perfil.nome_exibicao}</h2>
              {perfil.titulo && <span className="perfil-titulo-chip">{perfil.titulo}</span>}
            </div>
            <p className="perfil-usuario">@{perfil.nome_usuario}</p>
            {perfil.bio ? (
              <p className="perfil-bio">{perfil.bio}</p>
            ) : (
              ehProprio && (
                <p className="perfil-bio vazia">
                  Sua bio está vazia — conte quem você é na mesa.
                </p>
              )
            )}
          </div>

          {ehProprio && (
            <button type="button" className="perfil-btn-editar" onClick={onEditar}>
              <span className="material-symbols-outlined text-[18px]">edit</span>
              <span>Editar perfil</span>
            </button>
          )}
        </div>

        <div className="perfil-stats">
          <div className="perfil-stat">
            <strong>{campanhasVisiveis.length}</strong>
            <span>{ehProprio ? 'Campanhas' : 'Mesas em comum'}</span>
          </div>
          <div className="perfil-stat">
            <strong>{fichasVisiveis.length}</strong>
            <span>Personagens</span>
          </div>
          <div className="perfil-stat">
            <strong>{mestradas}</strong>
            <span>Mesas mestradas</span>
          </div>
          <div className="perfil-stat">
            <strong>{formatarMesAno(perfil.criado_em)}</strong>
            <span>Na mesa desde</span>
          </div>
        </div>
      </div>

      {/* Campanhas */}
      <section className="perfil-secao">
        <div className="nexus-section-header">
          <h3 className="nexus-section-heading" style={{ fontSize: '20px' }}>
            {ehProprio ? 'Campanhas' : 'Campanhas em comum'} ({campanhasVisiveis.length})
          </h3>
        </div>

        {campanhasVisiveis.length === 0 ? (
          <div className="perfil-vazio hex-card">
            {ehProprio
              ? 'Você ainda não participa de nenhuma campanha.'
              : 'Vocês ainda não dividem nenhuma mesa.'}
          </div>
        ) : (
          <div className="perfil-lista-campanhas">
            {campanhasVisiveis.map((c) => (
              <button
                key={c.id}
                type="button"
                className="perfil-item-campanha hex-card"
                onClick={() => onAbrirCampanha?.(c.id)}
              >
                <div
                  className="perfil-item-capa"
                  style={
                    c.imagem_capa_url
                      ? { backgroundImage: `url(${c.imagem_capa_url})` }
                      : undefined
                  }
                >
                  {!c.imagem_capa_url && <span className="material-symbols-outlined">castle</span>}
                </div>
                <div className="perfil-item-txt">
                  <strong>{c.titulo || c.nome}</strong>
                  <span>
                    {Number(c.mestre_id) === idPerfil ? 'Mestre' : 'Jogador'} · {c.sistema || 'D&D 5E'}
                  </span>
                </div>
                <span className="material-symbols-outlined perfil-item-seta">chevron_right</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Personagens */}
      <section className="perfil-secao">
        <div className="nexus-section-header">
          <h3 className="nexus-section-heading" style={{ fontSize: '20px' }}>
            Personagens ({fichasVisiveis.length})
          </h3>
        </div>

        {fichasVisiveis.length === 0 ? (
          <div className="perfil-vazio hex-card">
            {ehProprio
              ? 'Nenhum personagem criado ainda.'
              : 'Nenhum personagem visível nas mesas que vocês dividem.'}
          </div>
        ) : (
          <div className="perfil-lista-personagens">
            {fichasVisiveis.map((f) => (
              <button
                key={f.id}
                type="button"
                className="perfil-item-personagem hex-card"
                onClick={() => onAbrirFicha?.(f)}
              >
                <img
                  src={obterRetratoPersonagem(f)}
                  alt={f.nome || f.nome_personagem}
                  className="perfil-token"
                  style={{ borderColor: cor }}
                />
                <div className="perfil-item-txt">
                  <strong>{f.nome || f.nome_personagem}</strong>
                  <span>
                    {f.raca || '—'} · {f.classe || '—'} · Nível {f.nivel || 1}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
