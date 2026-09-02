import { useState, useMemo } from 'react';
import { ESPECIES_DND } from './wizardData';

export default function StepEspecie({
  especieSelecionada,
  onSelecionarEspecie,
  atributosFlexiveis,
  onToggleAtributosFlexiveis,
  especiesCustom = [],
  onAdicionarEspecieCustom,
}) {
  const [busca, setBusca] = useState('');
  const [modalCustom, setModalCustom] = useState(false);

  // Form custom species
  const [customNome, setCustomNome] = useState('');
  const [customTamanho, setCustomTamanho] = useState('Médio');
  const [customDeslocamento, setCustomDeslocamento] = useState('30ft (9m)');
  const [customVisaoEscuro, setCustomVisaoEscuro] = useState(true);
  const [customDesc, setCustomDesc] = useState('');

  const todasEspecies = useMemo(() => {
    return [...ESPECIES_DND, ...especiesCustom];
  }, [especiesCustom]);

  const especiesFiltradas = useMemo(() => {
    if (!busca) return todasEspecies;
    const b = busca.toLowerCase();
    return todasEspecies.filter((e) => {
      return e.nome.toLowerCase().includes(b) || (e.nomeEn && e.nomeEn.toLowerCase().includes(b));
    });
  }, [todasEspecies, busca]);

  const especieAtiva = especieSelecionada || todasEspecies[0];

  const handleSalvarCustom = (e) => {
    e.preventDefault();
    if (!customNome.trim()) return;
    const nova = {
      id: 'custom_sp_' + Date.now(),
      nome: customNome.trim(),
      nomeEn: 'Custom Species',
      tag: 'Custom',
      icone: 'fingerprint',
      tamanho: customTamanho,
      deslocamento: customDeslocamento,
      deslocamentoNum: parseInt(customDeslocamento) || 30,
      visaoEscuro: customVisaoEscuro,
      bonusAtributoFixo: { for: 1, des: 1, con: 1 },
      bonusDesc: '+2 / +1 flexíveis à escolha',
      idiomas: ['Comum', 'Idioma regional'],
      traços: [{ nome: 'Traço Ancestral Único', desc: customDesc.trim() || 'Habilidade especial da espécie criada.' }],
      periciasConcedidas: [],
    };
    onAdicionarEspecieCustom(nova);
    onSelecionarEspecie(nova);
    setModalCustom(false);
    setCustomNome('');
    setCustomDesc('');
  };

  return (
    <div className="wizard-step-container">
      {/* Coluna Esquerda: Lista de Espécies */}
      <div className="wizard-col-left">
        <div className="wizard-search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Pesquisar espécie / raça..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="wizard-search-input"
          />
          {busca && (
            <button className="wizard-search-clear" onClick={() => setBusca('')}>
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Lista de Espécies */}
        <div className="wizard-items-list">
          {especiesFiltradas.map((esp) => {
            const isSelected = especieAtiva?.id === esp.id;
            return (
              <div
                key={esp.id}
                className={`wizard-item-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelecionarEspecie(esp)}
              >
                <div className="wizard-item-icon-box">
                  <span className="material-symbols-outlined">{esp.icone || 'person'}</span>
                </div>
                <div className="wizard-item-info">
                  <div className="wizard-item-title-row">
                    <h4 className="wizard-item-title">{esp.nome}</h4>
                    <span className={`wizard-tag-badge ${esp.tag === '2024' ? 'tag-2024' : esp.tag === 'Custom' ? 'tag-custom' : 'tag-srd'}`}>
                      {esp.tag}
                    </span>
                  </div>
                  <p className="wizard-item-sub">
                    {esp.tamanho} · {esp.deslocamento} {esp.visaoEscuro ? '· Visão Escuro' : ''}
                  </p>
                </div>
                {isSelected && (
                  <span className="material-symbols-outlined text-gold select-check">check_circle</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Botão de Adicionar Custom */}
        <button
          type="button"
          className="wizard-btn-custom-add"
          onClick={() => setModalCustom(true)}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>+ Adicionar Espécie Customizada</span>
        </button>
      </div>

      {/* Coluna Central: Detalhes da Espécie e Traços */}
      <div className="wizard-col-center">
        {especieAtiva && (
          <div className="wizard-details-panel">
            {/* Header da Espécie */}
            <div className="wizard-detail-header">
              <div className="wizard-detail-badge-icon">
                <span className="material-symbols-outlined text-3xl">{especieAtiva.icone || 'person'}</span>
              </div>
              <div className="wizard-detail-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="wizard-detail-title">{especieAtiva.nome}</h2>
                  <span className="wizard-detail-subname">({especieAtiva.nomeEn})</span>
                  <span className="wizard-tag-badge tag-srd">{especieAtiva.tag}</span>
                </div>
                <p className="wizard-detail-desc">
                  Linhagem ancestral lendária com características biológicas e culturais distintas.
                </p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="wizard-stats-row">
              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-gold text-xl">straighten</span>
                <div>
                  <div className="val">{especieAtiva.tamanho}</div>
                  <div className="lbl">Porte / Tamanho</div>
                </div>
              </div>

              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-teal-400 text-xl">speed</span>
                <div>
                  <div className="val">{especieAtiva.deslocamento}</div>
                  <div className="lbl">Velocidade Base</div>
                </div>
              </div>

              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-purple-400 text-xl">visibility</span>
                <div>
                  <div className="val">{especieAtiva.visaoEscuro ? 'Sim (60ft / 18m)' : 'Não'}</div>
                  <div className="lbl">Visão no Escuro</div>
                </div>
              </div>
            </div>

            {/* Toggle de Pontos Flexíveis (One D&D / Tasha) */}
            <div className="wizard-flexible-toggle-card">
              <div className="toggle-info">
                <div className="toggle-title">
                  <span className="material-symbols-outlined text-gold text-lg">tune</span>
                  <span>Pontos de Atributo Flexíveis (Regra One D&D / Tasha)</span>
                </div>
                <p className="toggle-desc">
                  Mova os bônus de atributo (+2 e +1) para serem escolhidos livremente no <strong>Passo 4</strong> em qualquer atributo, permitindo liberdade criativa total para seu personagem.
                </p>
              </div>
              <label className="wizard-switch">
                <input
                  type="checkbox"
                  checked={atributosFlexiveis}
                  onChange={(e) => onToggleAtributosFlexiveis(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Bônus de Atributos fixos vs flexíveis */}
            <div className="wizard-section-box">
              <div className="wizard-box-title">
                <span className="material-symbols-outlined text-crimson text-lg">fitness_center</span>
                <span>Bônus de Atributo da Espécie</span>
              </div>
              <div className="wizard-bonus-banner">
                {atributosFlexiveis ? (
                  <div className="bonus-active-flex">
                    <span className="material-symbols-outlined text-gold text-xl">check_circle</span>
                    <div>
                      <strong>Modo Flexível Ativo:</strong>
                      <p>Você escolherá onde alocar +2 e +1 livremente no Passo 4 (Atributos).</p>
                    </div>
                  </div>
                ) : (
                  <div className="bonus-fixed">
                    <span className="material-symbols-outlined text-crimson text-xl">lock</span>
                    <div>
                      <strong>Bônus Tradicionais da Espécie:</strong>
                      <p>{especieAtiva.bonusDesc}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Traços Raciais Detalhados */}
            <div className="wizard-section-box">
              <div className="wizard-box-title">
                <span className="material-symbols-outlined text-gold text-lg">auto_awesome</span>
                <span>Traços & Habilidades Raciais</span>
              </div>
              <div className="wizard-features-cards-list">
                {especieAtiva.traços?.map((traco, idx) => (
                  <div key={idx} className="wizard-feature-card">
                    <div className="feat-header">
                      <span className="material-symbols-outlined text-gold text-sm">stars</span>
                      <h4>{traco.nome}</h4>
                    </div>
                    <p>{traco.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Idiomas Concedidos */}
            <div className="wizard-section-box">
              <div className="wizard-box-title">
                <span className="material-symbols-outlined text-teal-400 text-lg">translate</span>
                <span>Idiomas Nativos</span>
              </div>
              <div className="wizard-tags-row">
                {especieAtiva.idiomas?.map((idm, i) => (
                  <span key={i} className="wizard-lang-chip">
                    🗣️ {idm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação de Espécie Customizada */}
      {modalCustom && (
        <div className="wizard-modal-backdrop" onClick={() => setModalCustom(false)}>
          <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wizard-modal-header">
              <h3 className="wizard-modal-title">🧬 Criar Espécie Customizada</h3>
              <button className="wizard-modal-close" onClick={() => setModalCustom(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSalvarCustom} className="wizard-form-body">
              <div className="wizard-field">
                <label>Nome da Espécie / Raça</label>
                <input
                  type="text"
                  className="wizard-input-highlight"
                  placeholder="Ex: Tabaxi, Tritão, Meio-Dragão..."
                  value={customNome}
                  onChange={(e) => setCustomNome(e.target.value)}
                  required
                />
              </div>

              <div className="wizard-row-split">
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label>Porte / Tamanho</label>
                  <select
                    className="wizard-select"
                    value={customTamanho}
                    onChange={(e) => setCustomTamanho(e.target.value)}
                  >
                    <option value="Médio">Médio (Humano, Elfo, Orc)</option>
                    <option value="Pequeno">Pequeno (Halfling, Gnomo)</option>
                    <option value="Grande">Grande (Goliath variante)</option>
                  </select>
                </div>
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label>Deslocamento Base</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={customDeslocamento}
                    onChange={(e) => setCustomDeslocamento(e.target.value)}
                  />
                </div>
              </div>

              <div className="wizard-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customVisaoEscuro}
                    onChange={(e) => setCustomVisaoEscuro(e.target.checked)}
                  />
                  <span>Possui Visão no Escuro (60ft)</span>
                </label>
              </div>

              <div className="wizard-field">
                <label>Habilidade ou Traço Especial</label>
                <textarea
                  className="wizard-textarea"
                  rows="3"
                  placeholder="Descreva as características biológicas e mecânicas da espécie..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                />
              </div>

              <div className="wizard-modal-footer">
                <button type="button" className="wizard-btn-cancel" onClick={() => setModalCustom(false)}>
                  Cancelar
                </button>
                <button type="submit" className="gold-gradient-btn wizard-btn-next">
                  Salvar Espécie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
