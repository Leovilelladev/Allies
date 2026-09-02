import { useState, useMemo } from 'react';
import { ANTECEDENTES_DND, PERICIAS_INFO } from './wizardData';

export default function StepAntecedente({
  antecedenteSelecionado,
  onSelecionarAntecedente,
  antecedentesCustom = [],
  onAdicionarAntecedenteCustom,
}) {
  const [busca, setBusca] = useState('');
  const [modalCustom, setModalCustom] = useState(false);

  // Form custom background
  const [customNome, setCustomNome] = useState('');
  const [customPericias, setCustomPericias] = useState(['atletismo', 'percepcao']);
  const [customFerramentas, setCustomFerramentas] = useState('À escolha');
  const [customIdiomas, setCustomIdiomas] = useState('Um idioma extra');
  const [customFeatNome, setCustomFeatNome] = useState('Característica Única');
  const [customFeatDesc, setCustomFeatDesc] = useState('');
  const [customDesc, setCustomDesc] = useState('');

  const todosAntecedentes = useMemo(() => {
    return [...ANTECEDENTES_DND, ...antecedentesCustom];
  }, [antecedentesCustom]);

  const antecedentesFiltrados = useMemo(() => {
    if (!busca) return todosAntecedentes;
    const b = busca.toLowerCase();
    return todosAntecedentes.filter((a) => {
      return a.nome.toLowerCase().includes(b) || (a.nomeEn && a.nomeEn.toLowerCase().includes(b)) || a.descricao.toLowerCase().includes(b);
    });
  }, [todosAntecedentes, busca]);

  const antecedenteAtivo = antecedenteSelecionado || todosAntecedentes[0];

  const handleSalvarCustom = (e) => {
    e.preventDefault();
    if (!customNome.trim()) return;
    const novo = {
      id: 'custom_bg_' + Date.now(),
      nome: customNome.trim(),
      nomeEn: 'Custom Background',
      tag: 'Custom',
      icone: 'history_edu',
      pericias: customPericias,
      ferramentas: customFerramentas,
      idiomas: customIdiomas,
      caracteristica: {
        nome: customFeatNome.trim() || 'Habilidade de Antecedente',
        desc: customFeatDesc.trim() || 'Privilégio especial obtido pelo seu passado.',
      },
      equipamento: 'Vestimentas de viagem, lembrança do passado e 15 PO.',
      descricao: customDesc.trim() || 'História de origem personalizada.',
    };
    onAdicionarAntecedenteCustom(novo);
    onSelecionarAntecedente(novo);
    setModalCustom(false);
    setCustomNome('');
    setCustomDesc('');
  };

  const toggleCustomPericia = (id) => {
    setCustomPericias((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  return (
    <div className="wizard-step-container">
      {/* Coluna Esquerda: Lista de Antecedentes */}
      <div className="wizard-col-left">
        <div className="wizard-search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Pesquisar antecedente..."
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

        {/* Lista de Antecedentes */}
        <div className="wizard-items-list">
          {antecedentesFiltrados.map((ant) => {
            const isSelected = antecedenteAtivo?.id === ant.id;
            return (
              <div
                key={ant.id}
                className={`wizard-item-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelecionarAntecedente(ant)}
              >
                <div className="wizard-item-icon-box">
                  <span className="material-symbols-outlined">{ant.icone || 'history_edu'}</span>
                </div>
                <div className="wizard-item-info">
                  <div className="wizard-item-title-row">
                    <h4 className="wizard-item-title">{ant.nome}</h4>
                    <span className={`wizard-tag-badge ${ant.tag === 'Custom' ? 'tag-custom' : 'tag-srd'}`}>
                      {ant.tag || 'SRD'}
                    </span>
                  </div>
                  <p className="wizard-item-sub">
                    {ant.pericias?.map((p) => {
                      const found = PERICIAS_INFO.find((x) => x.id === p);
                      return found?.nome || p;
                    }).join(', ')}
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
          <span>+ Adicionar Antecedente Customizado</span>
        </button>
      </div>

      {/* Coluna Central: Detalhes do Antecedente */}
      <div className="wizard-col-center">
        {antecedenteAtivo && (
          <div className="wizard-details-panel">
            {/* Header */}
            <div className="wizard-detail-header">
              <div className="wizard-detail-badge-icon">
                <span className="material-symbols-outlined text-3xl">{antecedenteAtivo.icone || 'history_edu'}</span>
              </div>
              <div className="wizard-detail-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="wizard-detail-title">{antecedenteAtivo.nome}</h2>
                  <span className="wizard-detail-subname">({antecedenteAtivo.nomeEn})</span>
                  <span className="wizard-tag-badge tag-srd">{antecedenteAtivo.tag || 'SRD'}</span>
                </div>
                <p className="wizard-detail-desc">{antecedenteAtivo.descricao}</p>
              </div>
            </div>

            {/* Perícias Automáticas Concedidas */}
            <div className="wizard-section-box">
              <div className="wizard-box-title">
                <span className="material-symbols-outlined text-gold text-lg">psychology</span>
                <span>Perícias Concedidas pelo Passado</span>
              </div>
              <p className="wizard-box-desc">
                Este antecedente concede proficiência automática nas seguintes perícias:
              </p>
              <div className="wizard-tags-row">
                {antecedenteAtivo.pericias?.map((pid) => {
                  const pInfo = PERICIAS_INFO.find((x) => x.id === pid);
                  return (
                    <div key={pid} className="wizard-prof-tag-card">
                      <span className="material-symbols-outlined text-gold text-sm">verified</span>
                      <strong>{pInfo?.nome || pid}</strong>
                      <span className="tag-attr">({pInfo?.attr.toUpperCase()})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Característica Especial de Antecedente */}
            {antecedenteAtivo.caracteristica && (
              <div className="wizard-section-box">
                <div className="wizard-box-title">
                  <span className="material-symbols-outlined text-crimson text-lg">hotel_class</span>
                  <span>Característica: {antecedenteAtivo.caracteristica.nome}</span>
                </div>
                <div className="wizard-feat-detail-card">
                  <p>{antecedenteAtivo.caracteristica.desc}</p>
                </div>
              </div>
            )}

            {/* Ferramentas e Idiomas */}
            <div className="wizard-stats-row">
              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-teal-400 text-xl">handyman</span>
                <div>
                  <div className="val">{antecedenteAtivo.ferramentas || 'Nenhuma'}</div>
                  <div className="lbl">Ferramentas & Kits</div>
                </div>
              </div>

              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-purple-400 text-xl">translate</span>
                <div>
                  <div className="val">{antecedenteAtivo.idiomas || 'Nenhum'}</div>
                  <div className="lbl">Idiomas Adicionais</div>
                </div>
              </div>
            </div>

            {/* Equipamento Inicial do Antecedente */}
            {antecedenteAtivo.equipamento && (
              <div className="wizard-section-box">
                <div className="wizard-box-title">
                  <span className="material-symbols-outlined text-gold text-lg">backpack</span>
                  <span>Equipamento Inicial do Antecedente</span>
                </div>
                <p className="wizard-box-desc" style={{ color: 'var(--color-on-surface)' }}>
                  {antecedenteAtivo.equipamento}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Custom Antecedente */}
      {modalCustom && (
        <div className="wizard-modal-backdrop" onClick={() => setModalCustom(false)}>
          <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wizard-modal-header">
              <h3 className="wizard-modal-title">📜 Criar Antecedente Customizado</h3>
              <button className="wizard-modal-close" onClick={() => setModalCustom(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSalvarCustom} className="wizard-form-body">
              <div className="wizard-field">
                <label>Nome do Antecedente</label>
                <input
                  type="text"
                  className="wizard-input-highlight"
                  placeholder="Ex: Caçador de Recompensas, Gladiador..."
                  value={customNome}
                  onChange={(e) => setCustomNome(e.target.value)}
                  required
                />
              </div>

              <div className="wizard-field">
                <label>Escolha 2 Perícias Concedidas</label>
                <div className="wizard-skills-choice-grid" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                  {PERICIAS_INFO.map((p) => {
                    const isChecked = customPericias.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`wizard-skill-choice-btn ${isChecked ? 'checked' : ''}`}
                        onClick={() => toggleCustomPericia(p.id)}
                      >
                        <span className="material-symbols-outlined text-sm check-box">
                          {isChecked ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span>{p.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="wizard-row-split">
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label>Ferramentas</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={customFerramentas}
                    onChange={(e) => setCustomFerramentas(e.target.value)}
                  />
                </div>
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label>Idiomas</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={customIdiomas}
                    onChange={(e) => setCustomIdiomas(e.target.value)}
                  />
                </div>
              </div>

              <div className="wizard-field">
                <label>Nome da Característica Especial</label>
                <input
                  type="text"
                  className="wizard-input"
                  placeholder="Ex: Contato com a Nobreza"
                  value={customFeatNome}
                  onChange={(e) => setCustomFeatNome(e.target.value)}
                />
              </div>

              <div className="wizard-field">
                <label>Descrição da Característica</label>
                <textarea
                  className="wizard-textarea"
                  rows="2"
                  value={customFeatDesc}
                  onChange={(e) => setCustomFeatDesc(e.target.value)}
                />
              </div>

              <div className="wizard-modal-footer">
                <button type="button" className="wizard-btn-cancel" onClick={() => setModalCustom(false)}>
                  Cancelar
                </button>
                <button type="submit" className="gold-gradient-btn wizard-btn-next">
                  Salvar Antecedente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
