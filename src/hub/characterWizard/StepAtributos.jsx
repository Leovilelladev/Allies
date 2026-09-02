import { useState, useMemo } from 'react';
import {
  POINT_BUY_COSTS,
  STANDARD_ARRAY,
  calcularModificador,
  formatarMod,
  PERICIAS_INFO,
} from './wizardData';

const ATRIBUTOS_LISTA = [
  { id: 'for', sigla: 'FOR', nome: 'Força', desc: 'Poder físico, atletismo e armas pesadas' },
  { id: 'des', sigla: 'DES', nome: 'Destreza', desc: 'Agilidade, reflexos, iniciativa e esquiva' },
  { id: 'con', sigla: 'CON', nome: 'Constituição', desc: 'Saúde, vigor e pontos de vida' },
  { id: 'int', sigla: 'INT', nome: 'Inteligência', desc: 'Raciocínio, memória, arcanismo e investigação' },
  { id: 'sab', sigla: 'SAB', nome: 'Sabedoria', desc: 'Percepção, intuição e sintonia espiritual' },
  { id: 'car', sigla: 'CAR', nome: 'Carisma', desc: 'Força de personalidade, persuasão e liderança' },
];

export default function StepAtributos({
  metodo,
  onMudarMetodo,
  atributosBase,
  onMudarAtributosBase,
  atributosFlexiveis,
  bonusFlexivel2,
  onChangeFlexivel2,
  bonusFlexivel1,
  onChangeFlexivel1,
  especie,
  classe,
  antecedente,
  periciasProficientes = {},
  onToggleProficiencia,
  periciasExpertise = {},
  onToggleExpertise,
  nivel = 1,
}) {
  const profBonus = Math.floor((nivel - 1) / 4) + 2;
  const [animandoDados, setAnimandoDados] = useState(false);
  const [detalhesRolagens, setDetalhesRolagens] = useState({});

  // Cálculo de Pontos Gastos no Point Buy
  const pontosGastos = useMemo(() => {
    return Object.values(atributosBase).reduce((acc, val) => {
      const custo = POINT_BUY_COSTS[val] ?? 0;
      return acc + custo;
    }, 0);
  }, [atributosBase]);

  const pontosRestantes = 27 - pontosGastos;

  // Modificadores e Totais Finais
  const atributosCalculados = useMemo(() => {
    const res = {};
    ATRIBUTOS_LISTA.forEach((attr) => {
      const base = atributosBase[attr.id] || 10;
      let bonusRaca = 0;

      if (atributosFlexiveis) {
        if (bonusFlexivel2 === attr.id) bonusRaca += 2;
        if (bonusFlexivel1 === attr.id) bonusRaca += 1;
      } else if (especie?.bonusAtributoFixo) {
        bonusRaca = especie.bonusAtributoFixo[attr.id] || 0;
      }

      const total = base + bonusRaca;
      const mod = calcularModificador(total);

      res[attr.id] = {
        base,
        bonusRaca,
        total,
        mod,
        modFmt: formatarMod(mod),
      };
    });
    return res;
  }, [atributosBase, atributosFlexiveis, bonusFlexivel2, bonusFlexivel1, especie]);

  // Handler Point Buy
  const handlePointBuyChange = (attrId, delta) => {
    const atual = atributosBase[attrId] || 8;
    const novo = atual + delta;
    if (novo < 8 || novo > 15) return;

    const custoAtual = POINT_BUY_COSTS[atual] ?? 0;
    const novoCusto = POINT_BUY_COSTS[novo] ?? 0;
    const diferenca = novoCusto - custoAtual;

    if (pontosRestantes - diferenca < 0) return;

    onMudarAtributosBase({
      ...atributosBase,
      [attrId]: novo,
    });
  };

  // Handler Standard Array
  const handleStandardArrayChange = (attrId, valorEscolhido) => {
    const num = Number(valorEscolhido);
    const atualObj = { ...atributosBase };

    // Se outro atributo já tinha esse valor, troca com o atual
    const antigoDono = Object.keys(atualObj).find(
      (k) => k !== attrId && Number(atualObj[k]) === num
    );

    if (antigoDono) {
      atualObj[antigoDono] = atualObj[attrId];
    }
    atualObj[attrId] = num;

    onMudarAtributosBase(atualObj);
  };

  // Handler Rolar 4d6 drop lowest
  const rolar4d6 = () => {
    setAnimandoDados(true);
    const novos = {};
    const det = {};

    setTimeout(() => {
      ATRIBUTOS_LISTA.forEach((attr) => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const d3 = Math.floor(Math.random() * 6) + 1;
        const d4 = Math.floor(Math.random() * 6) + 1;
        const dados = [d1, d2, d3, d4].sort((a, b) => a - b);
        const soma = dados[1] + dados[2] + dados[3]; // descarta o menor
        novos[attr.id] = soma;
        det[attr.id] = { dados, descartado: dados[0], total: soma };
      });

      onMudarAtributosBase(novos);
      setDetalhesRolagens(det);
      setAnimandoDados(false);
    }, 400);
  };

  return (
    <div className="wizard-step-attributes">
      {/* Seletor de Método de Atributos */}
      <div className="wizard-method-selector-card">
        <div className="method-header">
          <span className="material-symbols-outlined text-gold text-2xl">casino</span>
          <div>
            <h3>Método de Distribuição de Atributos</h3>
            <p>Selecione como deseja determinar os 6 valores básicos do seu aventureiro:</p>
          </div>
        </div>

        <div className="wizard-method-tabs">
          {[
            { id: 'pointbuy', label: 'Compra de Pontos (Point Buy)', icon: 'tune', desc: '27 pontos estratégicos (8 a 15)' },
            { id: 'standard', label: 'Conjunto Padrão (Standard Array)', icon: 'format_list_numbered', desc: 'Valores 15, 14, 13, 12, 10, 8' },
            { id: 'roll', label: 'Rolagem de Dados (4d6)', icon: 'casino', desc: 'Rola 4d6 e descarta o menor' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              className={`wizard-method-tab ${metodo === m.id ? 'active' : ''}`}
              onClick={() => onMudarMetodo(m.id)}
            >
              <span className="material-symbols-outlined">{m.icon}</span>
              <div style={{ textAlign: 'left' }}>
                <div className="title">{m.label}</div>
                <div className="sub">{m.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Painel do Método Selecionado */}
        {metodo === 'pointbuy' && (
          <div className="wizard-pointbuy-status">
            <div className="status-top">
              <span>Pontos Restantes:</span>
              <strong className={`points-counter ${pontosRestantes === 0 ? 'perfect' : pontosRestantes < 0 ? 'over' : ''}`}>
                {pontosRestantes} de 27
              </strong>
            </div>
            <div className="wizard-progress-bar-bg">
              <div
                className="wizard-progress-bar-fill"
                style={{ width: `${Math.min(100, Math.max(0, (pontosGastos / 27) * 100))}%` }}
              />
            </div>
            <p className="status-hint">
              {pontosRestantes > 0
                ? 'Distribua todos os 27 pontos entre seus atributos.'
                : pontosRestantes === 0
                ? '✨ Todos os 27 pontos distribuídos perfeitamente!'
                : 'Você ultrapassou o limite de 27 pontos.'}
            </p>
          </div>
        )}

        {metodo === 'roll' && (
          <div className="wizard-roll-action-banner">
            <button
              type="button"
              className="gold-gradient-btn wizard-roll-all-btn"
              onClick={rolar4d6}
              disabled={animandoDados}
            >
              <span className="material-symbols-outlined text-lg">casino</span>
              <span>{animandoDados ? 'Rolando Dados...' : 'Rolar Todos os Atributos (4d6 drop 1)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bônus Raciais Flexíveis (se ativo) */}
      {atributosFlexiveis && (
        <div className="wizard-flex-bonus-picker-card">
          <div className="flex-picker-header">
            <span className="material-symbols-outlined text-gold text-xl">tune</span>
            <div>
              <h4>Alocação de Bônus da Espécie (+2 e +1)</h4>
              <p>Escolha dois atributos diferentes para receber os aumentos ancestrais:</p>
            </div>
          </div>

          <div className="flex-picker-dropdowns">
            <div className="flex-drop-field">
              <label>Bônus +2 no Atributo:</label>
              <select
                className="wizard-select"
                value={bonusFlexivel2}
                onChange={(e) => onChangeFlexivel2(e.target.value)}
              >
                {ATRIBUTOS_LISTA.map((a) => (
                  <option key={a.id} value={a.id} disabled={bonusFlexivel1 === a.id}>
                    {a.sigla} - {a.nome} (+2)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-drop-field">
              <label>Bônus +1 no Atributo:</label>
              <select
                className="wizard-select"
                value={bonusFlexivel1}
                onChange={(e) => onChangeFlexivel1(e.target.value)}
              >
                {ATRIBUTOS_LISTA.map((a) => (
                  <option key={a.id} value={a.id} disabled={bonusFlexivel2 === a.id}>
                    {a.sigla} - {a.nome} (+1)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Grid de Atributos com Controles */}
      <div className="wizard-attributes-controls-grid">
        {ATRIBUTOS_LISTA.map((attr) => {
          const calc = atributosCalculados[attr.id];
          const det = detalhesRolagens[attr.id];

          return (
            <div key={attr.id} className="wizard-attr-control-card">
              <div className="card-top">
                <div className="attr-header-info">
                  <span className="attr-sigla-badge">{attr.sigla}</span>
                  <div>
                    <h4 className="attr-name">{attr.nome}</h4>
                    <p className="attr-desc">{attr.desc}</p>
                  </div>
                </div>

                <div className="attr-big-mod">
                  <span className="mod-val">{calc.modFmt}</span>
                  <span className="mod-lbl">MOD</span>
                </div>
              </div>

              {/* Controles conforme o Método */}
              <div className="card-controls-row">
                <div className="base-adjust">
                  <span className="control-lbl">Valor Base:</span>

                  {metodo === 'pointbuy' && (
                    <div className="pointbuy-buttons">
                      <button
                        type="button"
                        className="btn-step minus"
                        disabled={calc.base <= 8}
                        onClick={() => handlePointBuyChange(attr.id, -1)}
                      >
                        -
                      </button>
                      <span className="base-score">{calc.base}</span>
                      <button
                        type="button"
                        className="btn-step plus"
                        disabled={calc.base >= 15 || pontosRestantes <= 0}
                        onClick={() => handlePointBuyChange(attr.id, 1)}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {metodo === 'standard' && (
                    <select
                      className="wizard-select-score"
                      value={calc.base}
                      onChange={(e) => handleStandardArrayChange(attr.id, e.target.value)}
                    >
                      {STANDARD_ARRAY.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  )}

                  {metodo === 'roll' && (
                    <div className="rolled-score-box">
                      <span className="base-score">{calc.base}</span>
                      {det && (
                        <span className="roll-breakdown" title={`Rolagens: [${det.dados.join(', ')}] descartou ${det.descartado}`}>
                          [{det.dados.slice(1).join('+')}]
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bônus Racial */}
                <div className="racial-bonus-tag">
                  <span>Raça:</span>
                  <strong className={calc.bonusRaca > 0 ? 'bonus-positive' : ''}>
                    {calc.bonusRaca > 0 ? `+${calc.bonusRaca}` : '0'}
                  </strong>
                </div>

                {/* Total Final */}
                <div className="final-score-pill">
                  <span>Total:</span>
                  <strong>{calc.total}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela Interativa de Perícias D&D 5e */}
      <div className="wizard-skills-interactive-section">
        <div className="section-header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined text-crimson text-2xl">psychology</span>
            <div>
              <h3 className="section-title">Tabela de Perícias & Especializações</h3>
              <p className="section-sub">
                Ajuste suas proficiências e especializações (Expertise). O bônus de proficiência atual é <strong>+{profBonus}</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="wizard-skills-table-container">
          <table className="wizard-skills-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Atributo</th>
                <th>Perícia</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Origem</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Proficiência</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Especialização</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {PERICIAS_INFO.map((p) => {
                const attrMod = atributosCalculados[p.attr]?.mod || 0;
                const isProf = Boolean(periciasProficientes[p.id]);
                const isExp = Boolean(periciasExpertise[p.id]);

                let total = attrMod;
                if (isExp) total += profBonus * 2;
                else if (isProf) total += profBonus;

                // Determina origem
                let origem = 'Manual';
                if (antecedente?.pericias?.includes(p.id)) origem = 'Antecedente';
                else if (especie?.periciasConcedidas?.includes(p.id)) origem = 'Espécie';

                return (
                  <tr key={p.id} className={`skill-row ${isProf || isExp ? 'active-skill' : ''}`}>
                    <td>
                      <span className={`attr-pill attr-${p.attr}`}>{p.attr.toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="skill-cell-name">
                        <strong>{p.nome}</strong>
                        <span className="skill-en">({p.nomeEn})</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`origem-badge ${origem.toLowerCase()}`}>{origem}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={`wizard-table-btn-check ${isProf ? 'active' : ''}`}
                        onClick={() => onToggleProficiencia(p.id)}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isProf ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>{isProf ? 'Sim' : 'Não'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className={`wizard-table-btn-exp ${isExp ? 'active' : ''}`}
                        disabled={!isProf}
                        title={!isProf ? 'Marque a proficiência primeiro para ativar especialização' : 'Dobra o bônus de proficiência'}
                        onClick={() => onToggleExpertise(p.id)}
                      >
                        <span className="material-symbols-outlined text-sm">stars</span>
                        <span>{isExp ? 'x2 (Exp)' : 'Normal'}</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`total-bonus-badge ${total > 0 ? 'pos' : total < 0 ? 'neg' : ''}`}>
                        {formatarMod(total)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
