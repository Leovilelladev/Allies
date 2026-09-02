import { useMemo, useState } from 'react';
import { obterRetratoPersonagem } from '../shared';

function initials(nome) {
  if (!nome) return '?';
  return String(nome).trim().slice(0, 2).toUpperCase();
}

export default function PersonagensView({
  fichas = [],
  campanhas = [],
  perfis = {},
  usuarioAtual = {},
  termoBusca = '',
  onNovaFicha,
  onAbrirFicha,
  onExcluirFicha,
}) {
  const [campanhaFiltro, setCampanhaFiltro] = useState('todas');

  const campanhasMap = useMemo(() => {
    const map = {};
    if (Array.isArray(campanhas)) {
      campanhas.forEach((c) => {
        if (c && c.id) map[c.id] = c;
      });
    }
    return map;
  }, [campanhas]);

  // Filtragem por busca e campanha
  const fichasFiltradas = useMemo(() => {
    if (!Array.isArray(fichas)) return [];

    return fichas.filter((f) => {
      if (!f) return false;

      if (campanhaFiltro !== 'todas') {
        if (campanhaFiltro === 'avulso') {
          if (f.campanha_id) return false;
        } else if (String(f.campanha_id) !== String(campanhaFiltro)) {
          return false;
        }
      }

      if (termoBusca) {
        const b = String(termoBusca).toLowerCase();
        let dados = {};
        if (f.dados_ficha && typeof f.dados_ficha === 'object') {
          dados = f.dados_ficha;
        } else if (f.dados && typeof f.dados === 'object') {
          dados = f.dados;
        }

        const nomePersonagem = String(f.nome || f.nome_personagem || '').toLowerCase();
        const classe = String(f.classe || dados?.classe || '').toLowerCase();
        const raca = String(f.raca || dados?.raca || '').toLowerCase();
        const camp = f.campanha_id ? campanhasMap[f.campanha_id] : null;
        const campNome = String(camp?.titulo || camp?.nome || '').toLowerCase();
        
        const dono = perfis && typeof perfis === 'object' && f.usuario_id ? perfis[f.usuario_id] : null;
        const autorNome = String(
          dono?.nome_exibicao ||
          dono?.nome ||
          dono?.nome_usuario ||
          ''
        ).toLowerCase();

        return (
          nomePersonagem.includes(b) ||
          classe.includes(b) ||
          raca.includes(b) ||
          campNome.includes(b) ||
          autorNome.includes(b)
        );
      }

      return true;
    });
  }, [fichas, campanhaFiltro, termoBusca, campanhasMap, perfis]);

  return (
    <div className="nexus-dashboard-container">
      {/* Header da Seção */}
      <div className="nexus-section-header">
        <div>
          <h2 className="nexus-section-heading">Meus Personagens</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', margin: '4px 0 0' }}>
            Gerencie seus heróis, atributos de D&D 5e e fichas vinculadas ao Supabase.
          </p>
        </div>

        <div className="nexus-actions-bar">
          <button className="gold-gradient-btn nexus-btn-create" onClick={onNovaFicha}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Personagem</span>
          </button>
        </div>
      </div>

      {/* Filtro por Campanha */}
      {Array.isArray(campanhas) && campanhas.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            padding: '10px 16px',
            background: 'rgba(21, 31, 52, 0.6)',
            borderRadius: '8px',
            border: '1px solid rgba(77, 70, 58, 0.3)',
            width: 'fit-content',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            Filtrar por Campanha:
          </span>
          <select
            className="wizard-select"
            style={{ padding: '4px 10px', fontSize: '13px', width: 'auto', minWidth: '160px' }}
            value={campanhaFiltro}
            onChange={(e) => setCampanhaFiltro(e.target.value)}
          >
            <option value="todas">Todos os Personagens</option>
            <option value="avulso">⚔️ Aventureiros Avulsos</option>
            {campanhas.map((c) => (
              <option key={c.id} value={c.id}>
                🏰 {c.titulo || c.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {fichasFiltradas.length === 0 && (
        <div
          className="hex-card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            borderRadius: '12px',
          }}
        >
          <div className="wizard-sparkle-circle" style={{ margin: '0 auto 20px' }}>
            <span className="material-symbols-outlined text-3xl">person_add</span>
          </div>
          <h3
            style={{
              color: 'var(--color-primary)',
              margin: '0 0 10px',
              fontSize: '24px',
              fontFamily: 'var(--font-serif)',
            }}
          >
            {termoBusca || campanhaFiltro !== 'todas'
              ? 'Nenhum herói encontrado'
              : 'Nenhum personagem criado ainda'}
          </h3>
          <p
            style={{
              color: 'var(--color-on-surface-variant)',
              margin: '0 0 24px',
              fontSize: '15px',
            }}
          >
            {termoBusca || campanhaFiltro !== 'todas'
              ? 'Nenhum personagem corresponde aos filtros selecionados.'
              : 'Invoque seu primeiro aventureiro com atributos, magias e equipamentos completos.'}
          </p>
          <button
            className="gold-gradient-btn nexus-btn-create"
            onClick={onNovaFicha}
            style={{ margin: '0 auto' }}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Criar Primeiro Personagem</span>
          </button>
        </div>
      )}

      {/* Grid de Cards Compactos de Personagens */}
      <div className="nexus-character-cards-grid">
        {fichasFiltradas.map((f, index) => {
          if (!f) return null;

          const camp = f.campanha_id ? campanhasMap[f.campanha_id] : null;
          const dono = perfis && typeof perfis === 'object' && f.usuario_id ? perfis[f.usuario_id] : null;
          const donoNome = dono?.nome_exibicao || dono?.nome || dono?.nome_usuario || 'Jogador';
          const eMeu = Number(f.usuario_id) === Number(usuarioAtual?.id);
          const portraitUrl = obterRetratoPersonagem(f);

          let dados = {};
          if (f.dados_ficha && typeof f.dados_ficha === 'object') {
            dados = f.dados_ficha;
          } else if (f.dados && typeof f.dados === 'object') {
            dados = f.dados;
          } else if (typeof f.dados_ficha === 'string') {
            try { dados = JSON.parse(f.dados_ficha); } catch (e) { dados = {}; }
          } else if (typeof f.dados === 'string') {
            try { dados = JSON.parse(f.dados); } catch (e) { dados = {}; }
          }

          const nomePersonagem = f.nome || f.nome_personagem || 'Personagem Sem Nome';
          const classe = f.classe || dados?.classe || 'Aventureiro';
          const nivelNum = f.nivel || dados?.nivel || 1;
          const nivel = `Nvl ${nivelNum}`;
          const raca = f.raca || dados?.raca || 'Humano';
          const antecedente = f.antecedente || dados?.antecedente || '';
          const pvAtual = dados?.pv_atual ?? dados?.pv_total ?? 10;
          const pvMax = dados?.pv_total ?? 10;
          const ca = dados?.ca ?? 10;
          const iniciativa = dados?.iniciativa !== undefined ? dados.iniciativa : 0;

          return (
            <div
              key={f.id || index}
              className="nexus-character-card hex-glow group"
              onClick={() => onAbrirFicha && onAbrirFicha(f)}
            >
              {/* Imagem do Personagem como Arte de Fundo */}
              <div
                className="nexus-card-bg-art"
                style={{ backgroundImage: `url(${portraitUrl})` }}
              />

              {/* Gradientes Hextech para legibilidade */}
              <div className="nexus-card-gradient-bottom" />
              <div className="nexus-card-gradient-top" />

              {/* Conteúdo do Card Compacto */}
              <div className="nexus-character-content">
                {/* Linha Superior: Badges e Retrato/Token Ring */}
                <div className="nexus-character-top-row">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                    <span className="nexus-character-badge">
                      <span className="material-symbols-outlined text-[14px]">shield</span>
                      <span>{classe} · {nivel}</span>
                    </span>

                    {camp ? (
                      <span className="nexus-character-badge badge-campanha" title={camp.titulo || camp.nome}>
                        <span className="material-symbols-outlined text-[14px]">castle</span>
                        <span>{camp.titulo || camp.nome}</span>
                      </span>
                    ) : (
                      <span className="nexus-character-badge badge-avulso">
                        <span className="material-symbols-outlined text-[14px]">swords</span>
                        <span>Herói Avulso</span>
                      </span>
                    )}
                  </div>

                  {/* Token Ring do Personagem com borda dourada */}
                  <div className="nexus-character-token-ring" title={nomePersonagem}>
                    <img
                      src={portraitUrl}
                      alt={nomePersonagem}
                      className="nexus-character-token-img"
                      loading="lazy"
                    />
                  </div>
                </div>

                {/* Linha Inferior: Identidade, Atributos de Combate e Ações */}
                <div className="nexus-character-bottom">
                  <h3 className="nexus-character-title">{nomePersonagem}</h3>
                  <p className="nexus-character-sub">
                    {raca} · {classe} {antecedente ? `· ${antecedente}` : ''}
                  </p>

                  {/* Resumo de Combate Compacto */}
                  <div className="nexus-character-stats-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined text-[14px] text-error">favorite</span>
                      <span>PV: <strong style={{ color: 'var(--color-error)' }}>{pvAtual}</strong>/{pvMax}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined text-[14px] text-secondary">shield</span>
                      <span>CA: <strong style={{ color: 'var(--color-secondary)' }}>{ca}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span className="material-symbols-outlined text-[14px] text-primary">speed</span>
                      <span>Inic: <strong style={{ color: 'var(--color-primary)' }}>{Number(iniciativa) >= 0 ? `+${iniciativa}` : iniciativa}</strong></span>
                    </div>
                  </div>

                  {/* Rodapé: Jogador & Botões de Ação */}
                  <div className="nexus-character-footer">
                    <div className="nexus-avatars-stack">
                      <div className="nexus-avatar-chip" style={{ width: '28px', height: '28px', fontSize: '10px' }} title={`Jogador: ${donoNome}`}>
                        {initials(donoNome)}
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-on-surface-variant)',
                          marginLeft: '6px',
                          fontWeight: 600,
                        }}
                      >
                        {eMeu ? 'Seu Personagem' : donoNome}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {eMeu && onExcluirFicha && (
                        <button
                          type="button"
                          className="nexus-icon-btn"
                          title="Excluir Personagem"
                          onClick={(e) => {
                            e.stopPropagation();
                            onExcluirFicha(f.id);
                          }}
                          style={{ color: 'var(--color-error)', padding: '4px' }}
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="gold-gradient-btn nexus-btn-card-hover"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAbrirFicha) onAbrirFicha(f);
                        }}
                      >
                        <span>Abrir Ficha</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>
                    </div>
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

