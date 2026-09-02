import { useState, useMemo } from 'react';
import { CLASSES_DND, PERICIAS_INFO } from './wizardData';

export default function StepClasse({
  classeSelecionada,
  onSelecionarClasse,
  subclasseSelecionada,
  onSelecionarSubclasse,
  periciasClasse = [],
  onTogglePericiaClasse,
  classesCustom = [],
  onAdicionarClasseCustom,
}) {
  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState('todos');
  const [modalCustom, setModalCustom] = useState(false);

  // Form custom class
  const [customNome, setCustomNome] = useState('');
  const [customDadoVida, setCustomDadoVida] = useState('d8');
  const [customPapel, setCustomPapel] = useState('Combatente');
  const [customDesc, setCustomDesc] = useState('');
  const [customSalvaguardas, setCustomSalvaguardas] = useState(['for', 'des']);

  const todasClasses = useMemo(() => {
    return [...CLASSES_DND, ...classesCustom];
  }, [classesCustom]);

  const classesFiltradas = useMemo(() => {
    return todasClasses.filter((c) => {
      if (filtroPapel !== 'todos') {
        const papelNorm = c.papel.toLowerCase();
        if (filtroPapel === 'combatente' && !papelNorm.includes('combatente') && !papelNorm.includes('tanque')) return false;
        if (filtroPapel === 'conjurador' && !papelNorm.includes('conjurador') && !papelNorm.includes('magia')) return false;
        if (filtroPapel === 'suporte' && !papelNorm.includes('suporte') && !papelNorm.includes('curandeiro')) return false;
      }
      if (busca) {
        const b = busca.toLowerCase();
        return c.nome.toLowerCase().includes(b) || (c.nomeEn && c.nomeEn.toLowerCase().includes(b)) || c.descricao.toLowerCase().includes(b);
      }
      return true;
    });
  }, [todasClasses, filtroPapel, busca]);

  const classeAtiva = classeSelecionada || todasClasses[0];

  const handleSalvarCustom = (e) => {
    e.preventDefault();
    if (!customNome.trim()) return;
    const nova = {
      id: 'custom_' + Date.now(),
      nome: customNome.trim(),
      nomeEn: 'Custom Class',
      tag: 'Custom',
      icone: 'extension',
      papel: customPapel,
      dadoVida: customDadoVida,
      dadoVidaMax: parseInt(customDadoVida.replace('d', '')) || 8,
      salvaguardas: customSalvaguardas,
      armaduras: ['Armaduras Leves'],
      armas: ['Armas Simples'],
      ferramentas: 'À escolha',
      qtdPericiasClasse: 2,
      opcoesPericias: PERICIAS_INFO.map((p) => p.id),
      descricao: customDesc.trim() || 'Classe customizada pelo jogador.',
      habilidadesNivel1: [{ nome: 'Habilidade Inicial', desc: 'Característica marcante da classe customizada.' }],
      subclasses: [{ nome: 'Arquétipo Padrão', desc: 'Especialização da classe.' }],
      equipamentoInicial: {
        opcaoA: { nome: 'Pacote Inicial A', itens: ['Arma Simples', 'Armadura de Couro', 'Pacote de Aventureiro'] },
        opcaoB: { nome: 'Pacote Inicial B', itens: ['Duas Armas Leves', 'Pacote de Explorador'] },
        ouroInicial: '4d4 * 10 (100 PO)',
        ouroValor: 100,
      },
    };
    onAdicionarClasseCustom(nova);
    onSelecionarClasse(nova);
    setModalCustom(false);
    setCustomNome('');
    setCustomDesc('');
  };

  const periciasDisponiveis = useMemo(() => {
    if (!classeAtiva?.opcoesPericias) return [];
    return PERICIAS_INFO.filter((p) => classeAtiva.opcoesPericias.includes(p.id));
  }, [classeAtiva]);

  const qtdMaxima = classeAtiva?.qtdPericiasClasse || 2;
  const qtdSelecionada = periciasClasse.length;

  return (
    <div className="wizard-step-container">
      {/* Coluna Esquerda: Lista de Classes Pesquisável */}
      <div className="wizard-col-left">
        <div className="wizard-search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Pesquisar classe..."
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

        {/* Filtros de Papel */}
        <div className="wizard-filter-chips">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'combatente', label: '⚔️ Marcial' },
            { id: 'conjurador', label: '✨ Magia' },
            { id: 'suporte', label: '🛡️ Suporte' },
          ].map((f) => (
            <button
              key={f.id}
              className={`wizard-chip ${filtroPapel === f.id ? 'active' : ''}`}
              onClick={() => setFiltroPapel(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de Cards de Classes */}
        <div className="wizard-items-list">
          {classesFiltradas.map((cl) => {
            const isSelected = classeAtiva?.id === cl.id;
            return (
              <div
                key={cl.id}
                className={`wizard-item-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelecionarClasse(cl)}
              >
                <div className="wizard-item-icon-box">
                  <span className="material-symbols-outlined">{cl.icone || 'shield'}</span>
                </div>
                <div className="wizard-item-info">
                  <div className="wizard-item-title-row">
                    <h4 className="wizard-item-title">{cl.nome}</h4>
                    <span className={`wizard-tag-badge ${cl.tag === '2024' ? 'tag-2024' : cl.tag === 'Custom' ? 'tag-custom' : 'tag-srd'}`}>
                      {cl.tag}
                    </span>
                  </div>
                  <p className="wizard-item-sub">{cl.papel}</p>
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
          <span>+ Adicionar Classe Customizada</span>
        </button>
      </div>

      {/* Coluna Central: Detalhes e Configuração da Classe */}
      <div className="wizard-col-center">
        {classeAtiva && (
          <div className="wizard-details-panel">
            {/* Cabeçalho da Classe */}
            <div className="wizard-detail-header">
              <div className="wizard-detail-badge-icon">
                <span className="material-symbols-outlined text-3xl">{classeAtiva.icone || 'shield'}</span>
              </div>
              <div className="wizard-detail-title-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 className="wizard-detail-title">{classeAtiva.nome}</h2>
                  <span className="wizard-detail-subname">({classeAtiva.nomeEn})</span>
                  <span className="wizard-tag-badge tag-srd">{classeAtiva.tag}</span>
                </div>
                <p className="wizard-detail-desc">{classeAtiva.descricao}</p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="wizard-stats-row">
              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-crimson text-xl">favorite</span>
                <div>
                  <div className="val">{classeAtiva.dadoVida} por nível</div>
                  <div className="lbl">Dado de Vida</div>
                </div>
              </div>

              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-gold text-xl">verified_user</span>
                <div>
                  <div className="val">{classeAtiva.salvaguardas.map((s) => s.toUpperCase()).join(', ')}</div>
                  <div className="lbl">Salvaguardas Principais</div>
                </div>
              </div>

              <div className="wizard-stat-card">
                <span className="material-symbols-outlined text-teal-400 text-xl">shield</span>
                <div>
                  <div className="val">{classeAtiva.armaduras.join(', ')}</div>
                  <div className="lbl">Armaduras</div>
                </div>
              </div>
            </div>

            {/* Subclasse Selector */}
            <div className="wizard-section-box">
              <div className="wizard-box-title">
                <span className="material-symbols-outlined text-gold text-lg">military_tech</span>
                <span>Subclasse / Arquétipo</span>
              </div>
              <p className="wizard-box-desc">
                Escolha o arquétipo de especialização ou deixe para definir conforme evolui de nível.
              </p>

              <div className="wizard-subclasse-grid">
                {classeAtiva.subclasses?.map((sub) => {
                  const isSubSel = subclasseSelecionada === sub.nome;
                  return (
                    <div
                      key={sub.nome}
                      className={`wizard-subclasse-card ${isSubSel ? 'active' : ''}`}
                      onClick={() => onSelecionarSubclasse(isSubSel ? '' : sub.nome)}
                    >
                      <div className="subclasse-top">
                        <strong>{sub.nome}</strong>
                        {isSubSel && <span className="material-symbols-outlined text-xs text-gold">check_circle</span>}
                      </div>
                      <p className="subclasse-desc">{sub.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seleção de Perícias da Classe */}
            <div className="wizard-section-box">
              <div className="wizard-box-title" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined text-crimson text-lg">psychology</span>
                  <span>Proficiências em Perícias de Classe</span>
                </div>
                <span className={`wizard-counter-badge ${qtdSelecionada === qtdMaxima ? 'ready' : ''}`}>
                  {qtdSelecionada} de {qtdMaxima} selecionadas
                </span>
              </div>
              <p className="wizard-box-desc">
                Selecione as {qtdMaxima} perícias que seu personagem dominou durante o treinamento nesta classe.
              </p>

              <div className="wizard-skills-choice-grid">
                {periciasDisponiveis.map((p) => {
                  const isChecked = periciasClasse.includes(p.id);
                  const atingiuLimite = qtdSelecionada >= qtdMaxima && !isChecked;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={atingiuLimite}
                      className={`wizard-skill-choice-btn ${isChecked ? 'checked' : ''} ${atingiuLimite ? 'disabled' : ''}`}
                      onClick={() => onTogglePericiaClasse(p.id)}
                    >
                      <span className="material-symbols-outlined text-sm check-box">
                        {isChecked ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <span className="skill-label">{p.nome}</span>
                      <span className="skill-attr-tag">({p.attr.toUpperCase()})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Habilidades Iniciais do Nível 1 */}
            <div className="wizard-section-box">
              <div className="wizard-box-title">
                <span className="material-symbols-outlined text-gold text-lg">auto_stories</span>
                <span>Habilidades do 1º Nível</span>
              </div>
              <div className="wizard-features-cards-list">
                {classeAtiva.habilidadesNivel1?.map((hab, idx) => (
                  <div key={idx} className="wizard-feature-card">
                    <div className="feat-header">
                      <span className="material-symbols-outlined text-gold text-sm">stars</span>
                      <h4>{hab.nome}</h4>
                    </div>
                    <p>{hab.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação de Classe Customizada */}
      {modalCustom && (
        <div className="wizard-modal-backdrop" onClick={() => setModalCustom(false)}>
          <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wizard-modal-header">
              <h3 className="wizard-modal-title">⚔️ Criar Classe Customizada</h3>
              <button className="wizard-modal-close" onClick={() => setModalCustom(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSalvarCustom} className="wizard-form-body">
              <div className="wizard-field">
                <label>Nome da Classe</label>
                <input
                  type="text"
                  className="wizard-input-highlight"
                  placeholder="Ex: Cavaleiro Rúnico, Alquimista de Batalha..."
                  value={customNome}
                  onChange={(e) => setCustomNome(e.target.value)}
                  required
                />
              </div>

              <div className="wizard-row-split">
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label>Dado de Vida</label>
                  <select
                    className="wizard-select"
                    value={customDadoVida}
                    onChange={(e) => setCustomDadoVida(e.target.value)}
                  >
                    <option value="d6">d6 (Conjurador Frágil)</option>
                    <option value="d8">d8 (Combatente Médio / Suporte)</option>
                    <option value="d10">d10 (Combatente Frontal)</option>
                    <option value="d12">d12 (Tanque Brutal)</option>
                  </select>
                </div>
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label>Papel no Grupo</label>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="Ex: Dano Físico / Arcano"
                    value={customPapel}
                    onChange={(e) => setCustomPapel(e.target.value)}
                  />
                </div>
              </div>

              <div className="wizard-field">
                <label>Descrição & Conceito</label>
                <textarea
                  className="wizard-textarea"
                  rows="3"
                  placeholder="Descreva a origem dos poderes e o estilo de combate da classe..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                />
              </div>

              <div className="wizard-modal-footer">
                <button type="button" className="wizard-btn-cancel" onClick={() => setModalCustom(false)}>
                  Cancelar
                </button>
                <button type="submit" className="gold-gradient-btn wizard-btn-next">
                  Salvar Classe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
