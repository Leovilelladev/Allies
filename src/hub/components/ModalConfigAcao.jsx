import { useState, useMemo, useRef } from 'react';
import {
  resolverFormulaDinamica,
  calcularBonusAtaque,
  calcularCDSalvaguarda,
  ACOES_PRESETS,
  fmtMod,
  redimensionarImagem,
} from '../../shared';

const TIPOS_ACAO = [
  { id: 'action', nome: 'Ação Padrão (Action)', badge: 'Ação' },
  { id: 'bonus_action', nome: 'Ação Bônus (Bonus Action)', badge: 'Bônus' },
  { id: 'reaction', nome: 'Reação (Reaction)', badge: 'Reação' },
  { id: 'free', nome: 'Ação Livre (Free Action)', badge: 'Livre' },
  { id: 'special', nome: 'Especial / Passiva', badge: 'Especial' },
];

const ATRIBUTOS_OPCOES = [
  { id: 'for', nome: 'FOR (Força)' },
  { id: 'des', nome: 'DES (Destreza)' },
  { id: 'con', nome: 'CON (Constituição)' },
  { id: 'int', nome: 'INT (Inteligência)' },
  { id: 'sab', nome: 'SAB (Sabedoria)' },
  { id: 'car', nome: 'CAR (Carisma)' },
];

const TIPOS_DANO = [
  { id: 'slashing', nome: 'Cortante (Slashing)' },
  { id: 'piercing', nome: 'Perfurante (Piercing)' },
  { id: 'bludgeoning', nome: 'Contundente (Bludgeoning)' },
  { id: 'fire', nome: 'Fogo (Fire)' },
  { id: 'cold', nome: 'Gelo (Cold)' },
  { id: 'lightning', nome: 'Elétrico (Lightning)' },
  { id: 'acid', nome: 'Ácido (Acid)' },
  { id: 'poison', nome: 'Veneno (Poison)' },
  { id: 'necrotic', nome: 'Necrótico (Necrotic)' },
  { id: 'radiant', nome: 'Radiante (Radiant)' },
  { id: 'psychic', nome: 'Psíquico (Psychic)' },
  { id: 'force', nome: 'Força (Force)' },
  { id: 'healing', nome: 'Cura / Restauração (Healing)' },
  { id: 'utility', nome: 'Utilidade / Buff' },
];

const VARIAVEIS_CHIPS = [
  { tag: '@mod_for', desc: 'Mod Força' },
  { tag: '@mod_des', desc: 'Mod Destreza' },
  { tag: '@mod_con', desc: 'Mod Const.' },
  { tag: '@mod_int', desc: 'Mod Intel.' },
  { tag: '@mod_sab', desc: 'Mod Sabed.' },
  { tag: '@mod_car', desc: 'Mod Carisma' },
  { tag: '@prof', desc: 'Proficiência' },
  { tag: '@lvl', desc: 'Nível' },
];


export default function ModalConfigAcao({
  acaoInicial = null,
  characterStats = {},
  onSalvar,
  onCancelar,
}) {
  const [tabAtiva, setTabAtiva] = useState('detalhes'); // 'detalhes' | 'mecanicas' | 'custos'
  const fileInputRef = useRef(null);
  const [carregandoImg, setCarregandoImg] = useState(false);

  // Aba 1: Detalhes
  const [nome, setNome] = useState(acaoInicial?.nome || '');
  const [iconeUrl, setIconeUrl] = useState(acaoInicial?.icone_url || '');
  const [descricao, setDescricao] = useState(acaoInicial?.descricao || acaoInicial?.desc || '');
  const [alcance, setAlcance] = useState(acaoInicial?.alcance || '1.5m / Corpo a corpo');
  const [alvo, setAlvo] = useState(acaoInicial?.alvo || '1 criatura');

  const handleUploadImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCarregandoImg(true);
      // Redimensiona a imagem para no máximo 500x500px preservando a proporção
      const dataUrl = await redimensionarImagem(file, 500, 500, 0.88);
      setIconeUrl(dataUrl);
    } catch (err) {
      console.error('Erro ao redimensionar imagem:', err);
    } finally {
      setCarregandoImg(false);
      if (e.target) e.target.value = '';
    }
  };

  // Aba 2: Mecânicas
  const [tipo, setTipo] = useState(acaoInicial?.tipo || 'action');
  const [temAtaque, setTemAtaque] = useState(acaoInicial?.tem_ataque !== false);
  const [atributoBase, setAtributoBase] = useState(acaoInicial?.atributo_base || 'for');
  const [proficiente, setProficiente] = useState(acaoInicial?.proficiente !== false);
  const [bonusFixo, setBonusFixo] = useState(acaoInicial?.bonus_adicional_acerto ?? 0);
  const [formulaDano, setFormulaDano] = useState(acaoInicial?.formula_dano || acaoInicial?.dano || '1d8 + @mod_for');
  const [tipoDano, setTipoDano] = useState(acaoInicial?.tipo_dano || acaoInicial?.tipoDano || 'slashing');
  const [temSalvaguarda, setTemSalvaguarda] = useState(!!acaoInicial?.tem_salvaguarda);
  const [salvaguardaAtributo, setSalvaguardaAtributo] = useState(acaoInicial?.salvaguarda_atributo || 'des');
  const [salvaguardaDcCustom, setSalvaguardaDcCustom] = useState(acaoInicial?.salvaguarda_dc_custom || '');

  // Aba 3: Custos / Cargas
  const [temCargas, setTemCargas] = useState(!!acaoInicial?.tem_cargas);
  const [maxCargas, setMaxCargas] = useState(acaoInicial?.max_cargas ?? 3);
  const [cargasAtuais, setCargasAtuais] = useState(acaoInicial?.cargas_atuais ?? (acaoInicial?.max_cargas ?? 3));
  const [tipoRecarga, setTipoRecarga] = useState(acaoInicial?.tipo_recarga || 'long_rest');

  // Prévia dinâmica
  const acaoTemp = useMemo(
    () => ({
      atributo_base: atributoBase,
      proficiente,
      bonus_adicional_acerto: bonusFixo,
      formula_dano: formulaDano,
      tem_salvaguarda: temSalvaguarda,
      salvaguarda_atributo: salvaguardaAtributo,
      salvaguarda_dc_custom: salvaguardaDcCustom,
    }),
    [atributoBase, proficiente, bonusFixo, formulaDano, temSalvaguarda, salvaguardaAtributo, salvaguardaDcCustom]
  );

  const bonusAcertoPrevisto = calcularBonusAtaque(acaoTemp, characterStats);
  const formulaResolvidaPrevia = resolverFormulaDinamica(formulaDano, characterStats);
  const cdPrevista = calcularCDSalvaguarda(acaoTemp, characterStats);

  const handleInserirChip = (tag) => {
    setFormulaDano((prev) => (prev ? `${prev} + ${tag}` : tag));
  };

  const handleCarregarPreset = (p) => {
    setNome(p.nome);
    setIconeUrl(p.icone_url);
    setDescricao(p.descricao || '');
    setAlcance(p.alcance || '1.5m / Corpo a corpo');
    setAlvo(p.alvo || '1 criatura');
    setTipo(p.tipo || 'action');
    setTemAtaque(p.tem_ataque !== false);
    setAtributoBase(p.atributo_base || 'for');
    setProficiente(p.proficiente !== false);
    setFormulaDano(p.formula_dano || '');
    setTipoDano(p.tipo_dano || 'slashing');
    setTemSalvaguarda(!!p.tem_salvaguarda);
    setSalvaguardaAtributo(p.salvaguarda_atributo || 'des');
    setTemCargas(!!p.tem_cargas);
    setMaxCargas(p.max_cargas || 3);
    setCargasAtuais(p.cargas_atuais || (p.max_cargas || 3));
    setTipoRecarga(p.tipo_recarga || 'long_rest');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSalvar({
      id: acaoInicial?.id || Date.now(),
      nome: nome.trim(),
      icone_url: iconeUrl,
      descricao: descricao.trim(),
      alcance: alcance.trim(),
      alvo: alvo.trim(),
      tipo,
      tem_ataque: temAtaque,
      atributo_base: atributoBase,
      proficiente,
      bonus_adicional_acerto: Number(bonusFixo) || 0,
      formula_dano: formulaDano.trim(),
      dano: formulaDano.trim(), // Retrocompatibilidade
      tipo_dano: tipoDano,
      tipoDano: tipoDano, // Retrocompatibilidade
      tem_salvaguarda: temSalvaguarda,
      salvaguarda_atributo: salvaguardaAtributo,
      salvaguarda_dc_custom: salvaguardaDcCustom ? Number(salvaguardaDcCustom) : null,
      tem_cargas: temCargas,
      max_cargas: temCargas ? Math.max(1, Number(maxCargas) || 1) : null,
      cargas_atuais: temCargas ? Math.max(0, Number(cargasAtuais) || 0) : null,
      tipo_recarga: temCargas ? tipoRecarga : 'none',
    });
  };

  return (
    <div
      className="wizard-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div className="wizard-modal-container" style={{ maxWidth: '720px' }}>
        {/* Header do Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--color-primary)', margin: 0 }}>
              {acaoInicial ? 'Editar Habilidade / Ação' : 'Nova Habilidade / Ação'}
            </h3>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', margin: '4px 0 0' }}>
              Configure mecânicas D&D 5e, fórmulas dinâmicas e sistema de cargas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              className="wizard-select"
              style={{ fontSize: '12px', padding: '4px 8px', width: 'auto' }}
              onChange={(e) => {
                const sel = ACOES_PRESETS.find((x) => x.id === e.target.value);
                if (sel) handleCarregarPreset(sel);
              }}
              defaultValue=""
            >
              <option value="" disabled>⚡ Carregar Modelo...</option>
              {ACOES_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Abas de Configuração */}
        <div className="sheet-tabs-header" style={{ marginBottom: '20px' }}>
          <button
            type="button"
            className={`sheet-tab-btn ${tabAtiva === 'detalhes' ? 'active' : ''}`}
            onClick={() => setTabAtiva('detalhes')}
          >
            1. Detalhes & Ícone
          </button>
          <button
            type="button"
            className={`sheet-tab-btn ${tabAtiva === 'mecanicas' ? 'active' : ''}`}
            onClick={() => setTabAtiva('mecanicas')}
          >
            2. Mecânicas & Fórmulas
          </button>
          <button
            type="button"
            className={`sheet-tab-btn ${tabAtiva === 'custos' ? 'active' : ''}`}
            onClick={() => setTabAtiva('custos')}
          >
            3. Cargas & Recursos
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          {/* ================= ABA 1: DETALHES ================= */}
          {tabAtiva === 'detalhes' && (
            <div className="wizard-form-body">
              <div className="wizard-field">
                <label htmlFor="act-nome">Nome da Habilidade / Ação</label>
                <input
                  type="text"
                  id="act-nome"
                  className="wizard-input-highlight"
                  placeholder="Ex: Ataque com Espada Vorpal, Rajada Mística, Cura Divina..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              {/* Seletor de Ícones e Upload de Imagem */}
              <div className="wizard-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>
                    Ícone / Imagem da Habilidade
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--color-secondary)', fontWeight: 700 }}>
                    Tamanho Máx: 500x500px (Redimensionamento Automático)
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleUploadImagem}
                />

                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      backgroundImage: iconeUrl ? `url(${iconeUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      background: iconeUrl
                        ? undefined
                        : 'radial-gradient(circle at center, rgba(13, 27, 54, 0.9) 0%, rgba(4, 14, 34, 0.98) 100%)',
                      border: '2px solid var(--color-surface-tint)',
                      boxShadow: '0 0 14px rgba(229, 197, 135, 0.4)',
                      flexShrink: 0,
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {carregandoImg ? (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0, 0, 0, 0.75)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined text-base animate-spin text-primary">sync</span>
                      </div>
                    ) : !iconeUrl ? (
                      <span className="material-symbols-outlined text-2xl text-amber-200/50">auto_fix_high</span>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="nexus-btn-secondary"
                        style={{
                          padding: '7px 12px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={carregandoImg}
                        title="Carregar imagem do seu computador (máx 500x500px)"
                      >
                        <span className="material-symbols-outlined text-[17px]">upload_file</span>
                        <span>{carregandoImg ? 'Redimensionando...' : 'Carregar Imagem (Máx 500x500)'}</span>
                      </button>

                      {iconeUrl && (
                        <button
                          type="button"
                          className="nexus-btn-secondary"
                          style={{
                            padding: '7px 10px',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--color-error)',
                            borderColor: 'rgba(255, 83, 100, 0.3)',
                          }}
                          onClick={() => setIconeUrl('')}
                          title="Remover imagem e usar o ícone padrão Hextech"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          <span>Remover Foto</span>
                        </button>
                      )}

                      <input
                        type="url"
                        className="wizard-input"
                        style={{ fontSize: '12px', padding: '6px 10px', flex: 1, minWidth: '160px' }}
                        placeholder="Ou cole a URL da Imagem (opcional)..."
                        value={iconeUrl}
                        onChange={(e) => setIconeUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="wizard-row-split">
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label htmlFor="act-alcance">Alcance</label>
                  <input
                    type="text"
                    id="act-alcance"
                    className="wizard-input"
                    placeholder="Ex: 1.5m, 18m, Toque, Pessoal..."
                    value={alcance}
                    onChange={(e) => setAlcance(e.target.value)}
                  />
                </div>

                <div className="wizard-field" style={{ flex: 1 }}>
                  <label htmlFor="act-alvo">Alvo / Área</label>
                  <input
                    type="text"
                    id="act-alvo"
                    className="wizard-input"
                    placeholder="Ex: 1 criatura, Esfera de 6m..."
                    value={alvo}
                    onChange={(e) => setAlvo(e.target.value)}
                  />
                </div>
              </div>

              <div className="wizard-field">
                <label htmlFor="act-desc">Descrição / Efeito Detalhado</label>
                <textarea
                  id="act-desc"
                  className="wizard-textarea"
                  rows={4}
                  placeholder="Descreva as regras, efeitos mágicos, condições ou requisitos..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ================= ABA 2: MECÂNICAS & FÓRMULAS ================= */}
          {tabAtiva === 'mecanicas' && (
            <div className="wizard-form-body">
              <div className="wizard-row-split">
                <div className="wizard-field" style={{ flex: 1.2 }}>
                  <label htmlFor="act-tipo">Custo de Ação (Economia de Ações)</label>
                  <select
                    id="act-tipo"
                    className="wizard-select"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    {TIPOS_ACAO.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="wizard-field" style={{ flex: 1 }}>
                  <label htmlFor="act-attr">Atributo Base</label>
                  <select
                    id="act-attr"
                    className="wizard-select"
                    value={atributoBase}
                    onChange={(e) => setAtributoBase(e.target.value)}
                  >
                    {ATRIBUTOS_OPCOES.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rolagem de Ataque */}
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(4, 14, 34, 0.55)',
                  borderRadius: '8px',
                  border: '1px solid rgba(77, 70, 58, 0.3)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ margin: 0, fontWeight: 700, color: 'var(--color-secondary)' }}>
                    Rolagem de Ataque (d20 + Bônus)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                      type="checkbox"
                      checked={temAtaque}
                      onChange={(e) => setTemAtaque(e.target.checked)}
                    />
                    <span>Requer Ataque</span>
                  </label>
                </div>

                {temAtaque && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={proficiente}
                        onChange={(e) => setProficiente(e.target.checked)}
                      />
                      <span>Somar Bônus de Proficiência (+{characterStats?.proficiencia || 2})</span>
                    </label>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Bônus Adicional:</span>
                      <input
                        type="number"
                        className="wizard-input"
                        style={{ width: '60px', padding: '4px 8px', textAlign: 'center' }}
                        value={bonusFixo}
                        onChange={(e) => setBonusFixo(e.target.value)}
                      />
                    </div>

                    <div style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                      Acerto Total Previsto: <span className="text-secondary">{fmtMod(bonusAcertoPrevisto)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Fórmula Dinâmica de Dano / Cura */}
              <div className="wizard-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label htmlFor="act-formula" style={{ margin: 0 }}>Fórmula Dinâmica de Dano / Efeito</label>
                  <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 600 }}>
                    Prévia: <strong>{formulaResolvidaPrevia || '0'}</strong>
                  </span>
                </div>

                <input
                  type="text"
                  id="act-formula"
                  className="wizard-input-highlight"
                  placeholder="Ex: 1d8 + @mod_for, 2d6 + @mod_int, 1d10 + @lvl..."
                  value={formulaDano}
                  onChange={(e) => setFormulaDano(e.target.value)}
                />

                {/* Chips de Inserção Rápida */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', alignSelf: 'center' }}>
                    Variáveis dinâmicas:
                  </span>
                  {VARIAVEIS_CHIPS.map((chip) => (
                    <button
                      key={chip.tag}
                      type="button"
                      className="moba-chip-var"
                      onClick={() => handleInserirChip(chip.tag)}
                      title={`Insere ${chip.desc} na fórmula`}
                    >
                      {chip.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wizard-row-split">
                <div className="wizard-field" style={{ flex: 1.2 }}>
                  <label htmlFor="act-tipodano">Tipo de Dano / Efeito</label>
                  <select
                    id="act-tipodano"
                    className="wizard-select"
                    value={tipoDano}
                    onChange={(e) => setTipoDano(e.target.value)}
                  >
                    {TIPOS_DANO.map((td) => (
                      <option key={td.id} value={td.id}>
                        {td.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salvaguarda */}
                <div className="wizard-field" style={{ flex: 1 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={temSalvaguarda}
                      onChange={(e) => setTemSalvaguarda(e.target.checked)}
                    />
                    <span>Exige Salvaguarda (Save DC)</span>
                  </label>

                  {temSalvaguarda && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <select
                        className="wizard-select"
                        style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }}
                        value={salvaguardaAtributo}
                        onChange={(e) => setSalvaguardaAtributo(e.target.value)}
                      >
                        {ATRIBUTOS_OPCOES.map((a) => (
                          <option key={a.id} value={a.id}>
                            Salvar com {a.id.toUpperCase()}
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--color-primary)' }}>
                        CD: {cdPrevista}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= ABA 3: CARGAS & RECURSOS ================= */}
          {tabAtiva === 'custos' && (
            <div className="wizard-form-body">
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(4, 14, 34, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid rgba(226, 195, 132, 0.3)',
                  marginBottom: '16px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  <input
                    type="checkbox"
                    checked={temCargas}
                    onChange={(e) => setTemCargas(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Habilidade com Cargas / Usos Limitados (Charges)</span>
                </label>
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', margin: '4px 0 0 28px' }}>
                  Ativa marcadores visuais de cargas estilo MOBA e dedução automática ao utilizar.
                </p>
              </div>

              {temCargas && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="wizard-row-split">
                    <div className="wizard-field" style={{ flex: 1 }}>
                      <label htmlFor="act-maxcargas">Cargas Máximas (Max Charges)</label>
                      <input
                        type="number"
                        id="act-maxcargas"
                        className="wizard-input"
                        min="1"
                        max="20"
                        value={maxCargas}
                        onChange={(e) => setMaxCargas(e.target.value)}
                      />
                    </div>

                    <div className="wizard-field" style={{ flex: 1 }}>
                      <label htmlFor="act-cargasatuais">Cargas Atuais (Disponíveis)</label>
                      <input
                        type="number"
                        id="act-cargasatuais"
                        className="wizard-input"
                        min="0"
                        max={maxCargas}
                        value={cargasAtuais}
                        onChange={(e) => setCargasAtuais(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="wizard-field">
                    <label htmlFor="act-recarga">Regra de Recuperação (Recharge Trigger)</label>
                    <select
                      id="act-recarga"
                      className="wizard-select"
                      value={tipoRecarga}
                      onChange={(e) => setTipoRecarga(e.target.value)}
                    >
                      <option value="short_rest">☕ Descanso Curto (Short Rest) & Longo</option>
                      <option value="long_rest">⛺ Descanso Longo (Long Rest)</option>
                      <option value="dawn">🌅 Ao Amanhecer (Dawn / 1x por dia)</option>
                      <option value="none">🔒 Sem Recarga Automática (Itens Consumíveis)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="wizard-modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="wizard-btn-cancel" onClick={onCancelar}>
              CANCELAR
            </button>

            <button type="submit" className="gold-gradient-btn wizard-btn-next">
              <span className="material-symbols-outlined text-base">save</span>
              <span>{acaoInicial ? 'SALVAR ALTERAÇÕES' : 'CRIAR HABILIDADE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
