import { useMemo } from 'react';
import { calcularModificador, formatarMod, PERICIAS_INFO } from './wizardData';

export default function LivePreviewSheet({
  nome,
  classe,
  subclasse,
  especie,
  antecedente,
  nivel = 1,
  atributosFinais,
  periciasProficientes = {},
  periciasExpertise = {},
  avatarUrl,
  equipamentoEscolhido,
  salvaguardasClasse = [],
  onFinalizar,
  podeFinalizar = false,
}) {
  const profBonus = Math.floor((nivel - 1) / 4) + 2;

  // Modificadores de Atributos
  const mods = useMemo(() => ({
    for: calcularModificador(atributosFinais.for),
    des: calcularModificador(atributosFinais.des),
    con: calcularModificador(atributosFinais.con),
    int: calcularModificador(atributosFinais.int),
    sab: calcularModificador(atributosFinais.sab),
    car: calcularModificador(atributosFinais.car),
  }), [atributosFinais]);

  // Cálculo de PV
  const pvTotal = useMemo(() => {
    const dVidaMax = classe?.dadoVidaMax || 8;
    const conMod = mods.con;
    return dVidaMax + conMod + (nivel - 1) * (Math.floor(dVidaMax / 2) + 1 + conMod);
  }, [classe, mods.con, nivel]);

  // Cálculo de CA base
  const ca = useMemo(() => {
    if (classe?.id === 'barbaro') {
      return 10 + mods.des + mods.con;
    }
    if (classe?.id === 'monge') {
      return 10 + mods.des + mods.sab;
    }
    if (classe?.id === 'feiticeiro' && subclasse === 'Linhagem Dracônica') {
      return 13 + mods.des;
    }
    if (equipamentoEscolhido?.tipo === 'pesada') return 16;
    if (equipamentoEscolhido?.tipo === 'media') return 14 + Math.min(2, Math.max(0, mods.des));
    if (equipamentoEscolhido?.tipo === 'leve') return 11 + mods.des;
    return 10 + mods.des;
  }, [classe, subclasse, mods, equipamentoEscolhido]);

  const deslocamento = especie?.deslocamento || '30ft';
  const iniciativa = formatarMod(mods.des);

  // Perícias calculadas
  const periciasComBonus = useMemo(() => {
    return PERICIAS_INFO.map((p) => {
      const isProf = Boolean(periciasProficientes[p.id]);
      const isExp = Boolean(periciasExpertise[p.id]);
      const attrMod = mods[p.attr] || 0;
      let total = attrMod;
      if (isExp) total += profBonus * 2;
      else if (isProf) total += profBonus;

      return {
        ...p,
        isProf,
        isExp,
        total,
        totalFmt: formatarMod(total),
      };
    });
  }, [mods, periciasProficientes, periciasExpertise, profBonus]);

  const periciasAtivas = periciasComBonus.filter((p) => p.isProf || p.isExp);

  return (
    <div className="wizard-live-sheet">
      {/* Botão Superior Destacado de Conclusão */}
      <div className="wizard-live-sheet-top">
        <button
          type="button"
          className="wizard-finish-btn"
          disabled={!podeFinalizar}
          onClick={onFinalizar}
        >
          <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
          <span>Finalizar e Criar Ficha</span>
        </button>
      </div>

      {/* Header do Personagem */}
      <div className="wizard-sheet-hero">
        <div className="wizard-sheet-portrait-ring">
          <img
            src={avatarUrl || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=400&auto=format&fit=crop'}
            alt="Retrato"
            className="wizard-sheet-portrait-img"
          />
        </div>
        <div className="wizard-sheet-hero-info">
          <h3 className="wizard-sheet-name">
            {nome || <span className="text-placeholder">Nome do Herói</span>}
          </h3>
          <p className="wizard-sheet-sub">
            {especie?.nome || 'Espécie'} · {classe?.nome || 'Classe'} {subclasse ? `(${subclasse})` : ''} · Nvl {nivel}
          </p>
          <span className="wizard-sheet-bg-tag">
            {antecedente?.nome ? `Antecedente: ${antecedente.nome}` : 'Antecedente não definido'}
          </span>
        </div>
      </div>

      {/* Tira Rápida de Combate */}
      <div className="wizard-sheet-combat-strip">
        <div className="wizard-combat-box pv">
          <span className="material-symbols-outlined icon">favorite</span>
          <div className="val">{pvTotal}</div>
          <div className="lbl">PV Máx ({classe?.dadoVida || 'd8'})</div>
        </div>
        <div className="wizard-combat-box ca">
          <span className="material-symbols-outlined icon">shield</span>
          <div className="val">{ca}</div>
          <div className="lbl">Classe Armadura</div>
        </div>
        <div className="wizard-combat-box vel">
          <span className="material-symbols-outlined icon">speed</span>
          <div className="val">{deslocamento}</div>
          <div className="lbl">Deslocamento</div>
        </div>
        <div className="wizard-combat-box inic">
          <span className="material-symbols-outlined icon">bolt</span>
          <div className="val">{iniciativa}</div>
          <div className="lbl">Iniciativa</div>
        </div>
        <div className="wizard-combat-box prof">
          <span className="material-symbols-outlined icon">star</span>
          <div className="val">+{profBonus}</div>
          <div className="lbl">Proficiência</div>
        </div>
      </div>

      {/* Grid de Atributos com Modificadores */}
      <div className="wizard-sheet-section-title">
        <span className="material-symbols-outlined text-[16px]">sports_martial_arts</span>
        <span>Atributos & Salvaguardas</span>
      </div>

      <div className="wizard-sheet-attrs-grid">
        {[
          { id: 'for', sigla: 'FOR', nome: 'Força' },
          { id: 'des', sigla: 'DES', nome: 'Destreza' },
          { id: 'con', sigla: 'CON', nome: 'Constituição' },
          { id: 'int', sigla: 'INT', nome: 'Inteligência' },
          { id: 'sab', sigla: 'SAB', nome: 'Sabedoria' },
          { id: 'car', sigla: 'CAR', nome: 'Carisma' },
        ].map((attr) => {
          const val = atributosFinais[attr.id] || 10;
          const m = mods[attr.id];
          const isSaveProf = salvaguardasClasse.includes(attr.id);
          const saveBonus = isSaveProf ? m + profBonus : m;

          return (
            <div key={attr.id} className="wizard-sheet-attr-card">
              <span className="attr-sigla">{attr.sigla}</span>
              <span className="attr-mod">{formatarMod(m)}</span>
              <span className="attr-score">{val}</span>
              <div className={`attr-save ${isSaveProf ? 'save-prof' : ''}`} title={`Salvaguarda: ${formatarMod(saveBonus)}`}>
                <span className="material-symbols-outlined text-[11px]">
                  {isSaveProf ? 'check_circle' : 'radio_button_unchecked'}
                </span>
                <span>Save: {formatarMod(saveBonus)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Perícias Proficientes */}
      <div className="wizard-sheet-section-title">
        <span className="material-symbols-outlined text-[16px]">psychology</span>
        <span>Perícias Selecionadas ({periciasAtivas.length})</span>
      </div>

      {periciasAtivas.length === 0 ? (
        <p className="wizard-sheet-empty">Nenhuma perícia selecionada ainda.</p>
      ) : (
        <div className="wizard-sheet-skills-list">
          {periciasAtivas.map((p) => (
            <div key={p.id} className="wizard-sheet-skill-pill">
              <span className="skill-name">{p.nome}</span>
              <span className="skill-attr">({p.attr.toUpperCase()})</span>
              {p.isExp && <span className="skill-exp-badge">x2</span>}
              <span className="skill-mod">{p.totalFmt}</span>
            </div>
          ))}
        </div>
      )}

      {/* Características & Habilidades Chave */}
      <div className="wizard-sheet-section-title">
        <span className="material-symbols-outlined text-[16px]">auto_stories</span>
        <span>Traços & Habilidades Iniciais</span>
      </div>

      <div className="wizard-sheet-features-list">
        {classe?.habilidadesNivel1?.map((h, i) => (
          <div key={i} className="wizard-sheet-feature-item">
            <span className="feat-badge classe">Classe</span>
            <strong>{h.nome}:</strong> <span>{h.desc}</span>
          </div>
        ))}

        {especie?.traços?.slice(0, 2).map((t, i) => (
          <div key={i} className="wizard-sheet-feature-item">
            <span className="feat-badge raca">Espécie</span>
            <strong>{t.nome}:</strong> <span>{t.desc}</span>
          </div>
        ))}

        {antecedente?.caracteristica && (
          <div className="wizard-sheet-feature-item">
            <span className="feat-badge bg">Antecedente</span>
            <strong>{antecedente.caracteristica.nome}:</strong> <span>{antecedente.caracteristica.desc}</span>
          </div>
        )}
      </div>

      {/* Idiomas */}
      {especie?.idiomas && (
        <div className="wizard-sheet-lang-box">
          <span className="material-symbols-outlined text-[14px]">translate</span>
          <span><strong>Idiomas:</strong> {especie.idiomas.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
