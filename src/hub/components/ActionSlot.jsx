import { useState, useRef, useEffect } from 'react';
import ChargeTracker from './ChargeTracker';
import {
  calcularBonusAtaque,
  calcularCDSalvaguarda,
  resolverFormulaDinamica,
  fmtMod,
} from '../../shared';

const ACTION_TYPE_LABELS = {
  action: { label: 'Ação', cor: '#43e2d2', bg: 'rgba(0, 198, 183, 0.2)' },
  bonus_action: { label: 'Bônus', cor: '#ffdfa0', bg: 'rgba(229, 197, 135, 0.25)' },
  reaction: { label: 'Reação', cor: '#ffb4ab', bg: 'rgba(255, 83, 100, 0.2)' },
  free: { label: 'Livre', cor: '#91d1fe', bg: 'rgba(145, 209, 254, 0.2)' },
  special: { label: 'Especial', cor: '#b388ff', bg: 'rgba(179, 136, 255, 0.2)' },
};

function obterIconeAcaoMaterial(tipo, tipoDano) {
  const d = String(tipoDano || '').toLowerCase();
  if (d.includes('heal') || d.includes('cura')) return 'favorite';
  if (d.includes('fire') || d.includes('fogo')) return 'local_fire_department';
  if (d.includes('cold') || d.includes('gelo')) return 'ac_unit';
  if (d.includes('light') || d.includes('elet') || d.includes('raio')) return 'bolt';
  if (d.includes('poison') || d.includes('ven')) return 'science';
  if (d.includes('acid') || d.includes('aci')) return 'water_drop';
  if (d.includes('necro')) return 'skull';
  if (d.includes('rad')) return 'light_mode';
  if (d.includes('psy') || d.includes('psi')) return 'psychology';
  if (d.includes('force') || d.includes('forc')) return 'flare';
  if (d.includes('pierc') || d.includes('perf')) return 'arrow_forward';
  if (d.includes('bludg') || d.includes('cont')) return 'fitness_center';
  if (d.includes('util')) return 'auto_fix_high';
  if (tipo === 'reaction') return 'shield';
  if (tipo === 'bonus_action') return 'speed';
  return 'swords';
}

export default function ActionSlot({
  action,
  characterStats,
  onRoll,
  onEdit,
  onDuplicate,
  onDelete,
  onUpdateCharges,
  readOnly = false,
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [tooltipVisivel, setTooltipVisivel] = useState(false);
  const [executandoAnim, setExecutandoAnim] = useState(false);
  const menuRef = useRef(null);

  // Fecha o menu de contexto ao clicar fora
  useEffect(() => {
    const handleFora = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAberto(false);
      }
    };
    if (menuAberto) {
      document.addEventListener('mousedown', handleFora);
    }
    return () => document.removeEventListener('mousedown', handleFora);
  }, [menuAberto]);

  const tipoInfo = ACTION_TYPE_LABELS[action.tipo] || ACTION_TYPE_LABELS.action;
  const temIcone = !!action.icone_url;
  const iconeMaterial = obterIconeAcaoMaterial(action.tipo, action.tipo_dano || action.tipoDano);

  const temCargas = !!action.tem_cargas;
  const maxCargas = Number(action.max_cargas || 0);
  const cargasAtuais = Number(action.cargas_atuais ?? maxCargas);
  const estaEsgotado = temCargas && maxCargas > 0 && cargasAtuais <= 0;

  // Resolução dinâmica de valores
  const bonusAcerto = calcularBonusAtaque(action, characterStats);
  const cdSalvaguarda = calcularCDSalvaguarda(action, characterStats);
  const formulaResolvida = resolverFormulaDinamica(action.formula_dano || action.dano || '', characterStats);

  const handleClickSlot = (e) => {
    e.stopPropagation();
    if (menuAberto) {
      setMenuAberto(false);
      return;
    }

    if (estaEsgotado) {
      setExecutandoAnim(true);
      setTimeout(() => setExecutandoAnim(false), 500);
      return;
    }

    setExecutandoAnim(true);
    setTimeout(() => setExecutandoAnim(false), 300);

    if (temCargas && cargasAtuais > 0 && onUpdateCharges) {
      onUpdateCharges(action.id, cargasAtuais - 1);
    }

    if (onRoll) {
      onRoll(action);
    }
  };

  const handleRecarregarCargas = (e) => {
    e.stopPropagation();
    setMenuAberto(false);
    if (onUpdateCharges && maxCargas > 0) {
      onUpdateCharges(action.id, maxCargas);
    }
  };

  return (
    <div
      className={`moba-action-slot hex-card ${estaEsgotado ? 'depleted' : ''} ${
        executandoAnim ? 'action-cast-pulse' : ''
      }`}
      onClick={handleClickSlot}
      onMouseEnter={() => setTooltipVisivel(true)}
      onMouseLeave={() => {
        setTooltipVisivel(false);
        setMenuAberto(false);
      }}
    >
      {/* Container Interno com overflow:hidden para corte perfeito sem vazar no hover */}
      <div className="moba-slot-inner">
        {/* Background com imagem personalizada ou fundo arcano com ícone temático */}
        {temIcone ? (
          <div
            className="moba-slot-bg"
            style={{ backgroundImage: `url(${action.icone_url})` }}
          />
        ) : (
          <div className="moba-slot-bg-fallback">
            <span className="material-symbols-outlined moba-fallback-icon">
              {iconeMaterial}
            </span>
          </div>
        )}
        <div className="moba-slot-overlay" />

        {/* Badge do Tipo de Ação (Ação, Bônus, Reação) */}
        <div
          className="moba-slot-type-badge"
          style={{ color: tipoInfo.cor, background: tipoInfo.bg, borderColor: tipoInfo.cor }}
        >
          {tipoInfo.label}
        </div>

        {/* Centro / Nome da Ação */}
        <div className="moba-slot-center">
          <span className="moba-slot-name">{action.nome}</span>
          {action.tem_ataque !== false && (
            <span className="moba-slot-hit-bonus">
              {fmtMod(bonusAcerto)}
            </span>
          )}
        </div>

        {/* Overlay de Esgotado / Cooldown */}
        {estaEsgotado && (
          <div className="moba-slot-cooldown-overlay">
            <span className="material-symbols-outlined text-2xl text-amber-200/80">hourglass_empty</span>
            <span className="moba-cooldown-text">Esgotado</span>
          </div>
        )}

        {/* Indicador de Cargas na Borda Inferior */}
        {temCargas && maxCargas > 0 && (
          <div className="moba-slot-charges-bar">
            <ChargeTracker
              maxCharges={maxCargas}
              currentCharges={cargasAtuais}
              onToggleCharge={(qtd) => onUpdateCharges && onUpdateCharges(action.id, qtd)}
              readOnly={readOnly}
            />
          </div>
        )}
      </div>

      {/* Botão de Três Pontinhos (...) para Menu de Contexto (Fora do inner para o dropdown não ser cortado) */}
      {!readOnly && (
        <div className="moba-slot-menu-wrap" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="moba-slot-more-btn"
            title="Opções da Ação"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAberto(!menuAberto);
            }}
          >
            <span className="material-symbols-outlined text-[16px]">more_horiz</span>
          </button>

          {menuAberto && (
            <div className="moba-context-dropdown">
              <button
                type="button"
                className="moba-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAberto(false);
                  onEdit && onEdit(action);
                }}
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                <span>Editar</span>
              </button>

              <button
                type="button"
                className="moba-dropdown-item"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAberto(false);
                  onDuplicate && onDuplicate(action);
                }}
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
                <span>Duplicar</span>
              </button>

              {temCargas && (
                <button
                  type="button"
                  className="moba-dropdown-item"
                  onClick={handleRecarregarCargas}
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  <span>Restaurar Cargas</span>
                </button>
              )}

              <button
                type="button"
                className="moba-dropdown-item text-error"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAberto(false);
                  onDelete && onDelete(action.id);
                }}
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TOOLTIP RICO FLUTUANTE NO HOVER */}
      {tooltipVisivel && !menuAberto && (
        <div className="moba-action-tooltip" onClick={(e) => e.stopPropagation()}>
          <div className="moba-tooltip-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {temIcone ? (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundImage: `url(${action.icone_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '1px solid var(--color-surface-tint)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: 'rgba(229, 197, 135, 0.15)',
                    border: '1px solid var(--color-surface-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-primary)',
                  }}
                >
                  <span className="material-symbols-outlined text-sm">{iconeMaterial}</span>
                </div>
              )}
              <span className="moba-tooltip-title">{action.nome}</span>
            </div>
            <span
              className="moba-tooltip-badge"
              style={{ color: tipoInfo.cor, background: tipoInfo.bg, borderColor: tipoInfo.cor }}
            >
              {tipoInfo.label}
            </span>
          </div>

          <div className="moba-tooltip-stats-grid">
            {action.tem_ataque !== false && (
              <div className="moba-tooltip-stat">
                <span className="moba-tt-lbl">Acerto</span>
                <span className="moba-tt-val text-secondary">{fmtMod(bonusAcerto)}</span>
              </div>
            )}

            {formulaResolvida && (
              <div className="moba-tooltip-stat">
                <span className="moba-tt-lbl">Dano / Efeito</span>
                <span className="moba-tt-val text-error">
                  {formulaResolvida}{' '}
                  <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)' }}>
                    ({action.tipo_dano || action.tipoDano || 'normal'})
                  </span>
                </span>
              </div>
            )}

            {(action.tem_salvaguarda || action.salvaguarda_atributo) && (
              <div className="moba-tooltip-stat">
                <span className="moba-tt-lbl">CD Salvaguarda</span>
                <span className="moba-tt-val text-primary">
                  CD {cdSalvaguarda} ({(action.salvaguarda_atributo || 'DES').toUpperCase()})
                </span>
              </div>
            )}

            {action.alcance && (
              <div className="moba-tooltip-stat">
                <span className="moba-tt-lbl">Alcance</span>
                <span className="moba-tt-val">{action.alcance}</span>
              </div>
            )}

            {temCargas && (
              <div className="moba-tooltip-stat">
                <span className="moba-tt-lbl">Cargas</span>
                <span className="moba-tt-val text-primary">
                  {cargasAtuais}/{maxCargas} ({action.tipo_recarga === 'short_rest' ? 'Descanso Curto' : 'Descanso Longo'})
                </span>
              </div>
            )}
          </div>

          {action.descricao && (
            <p className="moba-tooltip-desc">{action.descricao || action.desc}</p>
          )}

          <div className="moba-tooltip-footer">
            <span className="material-symbols-outlined text-[14px]">touch_app</span>
            <span>Clique no slot para rolar a habilidade</span>
          </div>
        </div>
      )}
    </div>
  );
}

