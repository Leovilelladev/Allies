import { useRef } from 'react';
import { redimensionarImagem } from '../../shared';
import { formatarMod } from './wizardData';

const ALINHAMENTOS_LISTA = [
  'Leal e Bom (Lawful Good)',
  'Neutro e Bom (Neutral Good)',
  'Caótico e Bom (Chaotic Good)',
  'Leal e Neutro (Lawful Neutral)',
  'Neutro Puro (True Neutral)',
  'Caótico e Neutro (Chaotic Neutral)',
  'Leal e Mau (Lawful Evil)',
  'Neutro e Mau (Neutral Evil)',
  'Caótico e Mau (Chaotic Evil)',
];

export default function StepEquipamentoSumario({
  opcaoEquipamento,
  onMudarOpcaoEquipamento,
  ouroManual,
  onMudarOuroManual,
  nome,
  onMudarNome,
  avatarUrl,
  onMudarAvatarUrl,
  alinhamento,
  onMudarAlinhamento,
  campanhas = [],
  campanhaId,
  onMudarCampanhaId,
  classe,
  subclasse,
  especie,
  antecedente,
  atributosFinais,
  periciasProficientes = {},
  onFinalizar,
  podeFinalizar = false,
}) {
  const fileInputRef = useRef(null);

  const handleUploadFoto = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await redimensionarImagem(file, 500, 500, 0.88);
        onMudarAvatarUrl(dataUrl);
      } catch (err) {
        console.error('Erro ao redimensionar avatar:', err);
      }
    }
  };

  const equipA = classe?.equipamentoInicial?.opcaoA;
  const equipB = classe?.equipamentoInicial?.opcaoB;
  const ouroSugerido = classe?.equipamentoInicial?.ouroInicial || '100 PO';

  return (
    <div className="wizard-step-summary-container">
      {/* 1. Escolha de Equipamento Inicial */}
      <div className="wizard-section-box">
        <div className="wizard-box-title">
          <span className="material-symbols-outlined text-gold text-2xl">backpack</span>
          <div>
            <h3>Equipamento Inicial de Aventura</h3>
            <p>Escolha um dos pacotes de equipamentos balanceados da classe ou comece com ouro:</p>
          </div>
        </div>

        <div className="wizard-equipment-options-grid">
          {equipA && (
            <div
              className={`wizard-equip-card ${opcaoEquipamento === 'A' ? 'active' : ''}`}
              onClick={() => onMudarOpcaoEquipamento('A')}
            >
              <div className="equip-top">
                <span className="equip-badge">Opção A</span>
                <h4>{equipA.nome}</h4>
                {opcaoEquipamento === 'A' && (
                  <span className="material-symbols-outlined text-gold text-lg check-icon">check_circle</span>
                )}
              </div>
              <ul className="equip-items-list">
                {equipA.itens.map((it, idx) => (
                  <li key={idx}>
                    <span className="material-symbols-outlined text-xs text-gold">fiber_manual_record</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              {equipA.ataque && (
                <div className="equip-weapon-tag">
                  ⚔️ Arma Principal: <strong>{equipA.ataque.nome}</strong> ({equipA.ataque.dano} {equipA.ataque.tipoDano})
                </div>
              )}
            </div>
          )}

          {equipB && (
            <div
              className={`wizard-equip-card ${opcaoEquipamento === 'B' ? 'active' : ''}`}
              onClick={() => onMudarOpcaoEquipamento('B')}
            >
              <div className="equip-top">
                <span className="equip-badge">Opção B</span>
                <h4>{equipB.nome}</h4>
                {opcaoEquipamento === 'B' && (
                  <span className="material-symbols-outlined text-gold text-lg check-icon">check_circle</span>
                )}
              </div>
              <ul className="equip-items-list">
                {equipB.itens.map((it, idx) => (
                  <li key={idx}>
                    <span className="material-symbols-outlined text-xs text-gold">fiber_manual_record</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              {equipB.ataque && (
                <div className="equip-weapon-tag">
                  ⚔️ Arma Principal: <strong>{equipB.ataque.nome}</strong> ({equipB.ataque.dano} {equipB.ataque.tipoDano})
                </div>
              )}
            </div>
          )}

          {/* Opção Ouro Inicial */}
          <div
            className={`wizard-equip-card ${opcaoEquipamento === 'ouro' ? 'active' : ''}`}
            onClick={() => onMudarOpcaoEquipamento('ouro')}
          >
            <div className="equip-top">
              <span className="equip-badge ouro">Opção Ouro</span>
              <h4>Receber Ouro Inicial</h4>
              {opcaoEquipamento === 'ouro' && (
                <span className="material-symbols-outlined text-gold text-lg check-icon">check_circle</span>
              )}
            </div>
            <p className="equip-desc">
              Compre seus próprios itens na loja ou durante a primeira sessão com a reserva inicial de ouro da classe.
            </p>
            <div className="equip-gold-input-box" onClick={(e) => e.stopPropagation()}>
              <label>Ouro Inicial (PO):</label>
              <input
                type="number"
                min="0"
                className="wizard-input"
                style={{ width: '100px', textAlign: 'center' }}
                value={ouroManual}
                onChange={(e) => onMudarOuroManual(Number(e.target.value) || 0)}
              />
              <span className="gold-hint">Padrão da classe: {ouroSugerido}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Identidade do Personagem */}
      <div className="wizard-section-box">
        <div className="wizard-box-title">
          <span className="material-symbols-outlined text-crimson text-2xl">person_pin</span>
          <div>
            <h3>Identidade & Retrato do Herói</h3>
            <p>Defina o nome definitivo, alinhamento moral e personalize o retrato de batalha:</p>
          </div>
        </div>

        {/* Upload de Retrato */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleUploadFoto}
        />

        <div className="wizard-portrait-custom-row">
          <div className="wizard-portrait-preview-ring">
            <img src={avatarUrl} alt="Retrato do Herói" />
          </div>

          <div className="wizard-portrait-controls">
            <h4>Retrato de Batalha & Token</h4>
            <p>Esta arte será usada na sua ficha, nos cards de combate e como token no mapa virtual.</p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="nexus-btn-secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-sm">add_a_photo</span>
                <span>Carregar Foto do Computador</span>
              </button>
            </div>
          </div>
        </div>

        {/* Campos de Identidade */}
        <div className="wizard-identity-fields-grid">
          <div className="wizard-field" style={{ gridColumn: 'span 2' }}>
            <label>Nome do Personagem *</label>
            <input
              type="text"
              className="wizard-input-highlight"
              placeholder="Ex: Alistair Ironheart, Valerius Starfall..."
              value={nome}
              onChange={(e) => onMudarNome(e.target.value)}
              required
            />
          </div>

          <div className="wizard-field">
            <label>Alinhamento Moral</label>
            <select
              className="wizard-select"
              value={alinhamento}
              onChange={(e) => onMudarAlinhamento(e.target.value)}
            >
              {ALINHAMENTOS_LISTA.map((al) => (
                <option key={al} value={al}>
                  {al}
                </option>
              ))}
            </select>
          </div>

          {campanhas.length > 0 && (
            <div className="wizard-field">
              <label>Vincular à Campanha</label>
              <select
                className="wizard-select"
                value={campanhaId}
                onChange={(e) => onMudarCampanhaId(e.target.value)}
              >
                {campanhas.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏰 {c.titulo || c.nome} ({c.sistema || 'D&D 5E'})
                  </option>
                ))}
                <option value="">⚔️ Herói Avulso (Sem campanha vinculada)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. Sumário Final & Confirmação */}
      <div className="wizard-section-box">
        <div className="wizard-box-title">
          <span className="material-symbols-outlined text-gold text-2xl">receipt_long</span>
          <div>
            <h3>Sumário Final do Personagem</h3>
            <p>Revise todas as opções antes de gerar a ficha no Supabase:</p>
          </div>
        </div>

        <div className="wizard-summary-cards-grid">
          <div className="wizard-summary-card">
            <span className="summary-lbl">Herói & Origem</span>
            <h4>{nome || 'Sem Nome Definido'}</h4>
            <p>{especie?.nome} · {classe?.nome} {subclasse ? `(${subclasse})` : ''}</p>
            <span className="summary-tag">Antecedente: {antecedente?.nome}</span>
          </div>

          <div className="wizard-summary-card">
            <span className="summary-lbl">Atributos Finais</span>
            <div className="summary-attrs-row">
              {['for', 'des', 'con', 'int', 'sab', 'car'].map((a) => (
                <div key={a} className="attr-micro">
                  <span className="micro-sigla">{a.toUpperCase()}</span>
                  <span className="micro-val">{atributosFinais[a] || 10}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="wizard-summary-card">
            <span className="summary-lbl">Equipamento Selecionado</span>
            <h4>
              {opcaoEquipamento === 'ouro'
                ? `${ouroManual} Peças de Ouro (PO)`
                : opcaoEquipamento === 'A'
                ? equipA?.nome
                : equipB?.nome}
            </h4>
            <p>
              {opcaoEquipamento === 'ouro'
                ? 'Pronto para compras personalizadas.'
                : (opcaoEquipamento === 'A' ? equipA?.itens : equipB?.itens)?.slice(0, 3).join(', ') + '...'}
            </p>
          </div>
        </div>

        {/* Botão de Conclusão Final */}
        <div className="wizard-final-submit-box">
          <button
            type="button"
            className="gold-gradient-btn wizard-btn-submit-big"
            disabled={!podeFinalizar}
            onClick={onFinalizar}
          >
            <span className="material-symbols-outlined text-2xl">auto_awesome</span>
            <span>FINALIZAR E CRIAR FICHA DE PERSONAGEM</span>
          </button>
          {!nome.trim() && (
            <p className="wizard-validation-warning">
              ⚠️ Por favor, preencha o <strong>Nome do Personagem</strong> acima para concluir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
