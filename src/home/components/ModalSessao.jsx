import { useState, useEffect } from 'react';

function tsParaInputLocal(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ModalSessao({
  sessao,
  campanhas = [],
  campanhaPadraoId,
  onSalvar,
  onCancelar,
}) {
  const [campanhaId, setCampanhaId] = useState(
    sessao?.campanha_id || campanhaPadraoId || (campanhas[0]?.id || '')
  );
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [status, setStatus] = useState('agendada'); // 'agendada' | 'ativa' | 'concluida'
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (sessao) {
      setCampanhaId(sessao.campanha_id || campanhaPadraoId || (campanhas[0]?.id || ''));
      setTitulo(sessao.titulo || sessao.nome || '');
      setData(tsParaInputLocal(sessao.data_agendada || sessao.data));
      setStatus(sessao.status || 'agendada');
      setDescricao(sessao.descricao || sessao.resumo || '');
    } else {
      setCampanhaId(campanhaPadraoId || (campanhas[0]?.id || ''));
      setTitulo('');
      setData('');
      setStatus('agendada');
      setDescricao('');
    }
  }, [sessao, campanhas, campanhaPadraoId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    onSalvar({
      id: sessao?.id,
      campanha_id: Number(campanhaId) || Number(campanhaPadraoId) || null,
      titulo: titulo.trim(),
      data_agendada: data ? new Date(data).toISOString() : null,
      status,
      descricao: descricao.trim(),
    });
  };

  return (
    <div
      className="wizard-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div className="wizard-modal-container" style={{ maxWidth: '580px' }}>
        <div className="hextech-corner-accent top-left" />
        <div className="hextech-corner-accent top-right" />
        <div className="hextech-corner-accent bottom-left" />
        <div className="hextech-corner-accent bottom-right" />

        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="wizard-sparkle-circle">
            <span className="material-symbols-outlined text-2xl">event</span>
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '26px',
              color: 'var(--color-primary)',
              margin: '0 0 6px',
            }}
          >
            {sessao ? 'Editar Sessão' : 'Agendar Nova Sessão'}
          </h3>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', margin: 0 }}>
            {sessao
              ? 'Atualize as informações do episódio no Supabase.'
              : 'Defina a campanha, data de início e os objetivos do novo capítulo.'}
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="wizard-form-body">
          {campanhas.length > 0 && (
            <div className="wizard-field">
              <label htmlFor="sessao-campanha">Campanha</label>
              <select
                id="sessao-campanha"
                className="wizard-select"
                value={campanhaId}
                onChange={(e) => setCampanhaId(e.target.value)}
                required
              >
                {campanhas.map((c) => (
                  <option key={c.id} value={c.id}>
                    🏰 {c.titulo || c.nome} ({c.sistema || 'D&D 5E'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="wizard-field">
            <label htmlFor="sessao-titulo">Título / Nome do Episódio</label>
            <input
              type="text"
              id="sessao-titulo"
              className="wizard-input-highlight"
              placeholder="Ex: O Chamado de Vhalor, As Cinzas da Muralha..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="wizard-row-split">
            <div className="wizard-field" style={{ flex: 1.2 }}>
              <label htmlFor="sessao-data">Data & Hora (Opcional)</label>
              <input
                type="datetime-local"
                id="sessao-data"
                className="wizard-input"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>

            <div className="wizard-field" style={{ flex: 0.8 }}>
              <label htmlFor="sessao-status">Status</label>
              <select
                id="sessao-status"
                className="wizard-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="agendada">📅 Agendada</option>
                <option value="ativa">⚔️ Em Andamento</option>
                <option value="concluida">✓ Concluída</option>
              </select>
            </div>
          </div>

          <div className="wizard-field">
            <label htmlFor="sessao-desc">Resumo / Notas da Sessão</label>
            <textarea
              id="sessao-desc"
              className="wizard-textarea"
              rows={3}
              placeholder="O que os aventureiros enfrentarão ou o que aconteceu no último episódio..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {/* Rodapé de Ações */}
          <div className="wizard-modal-footer">
            <button type="button" className="wizard-btn-cancel" onClick={onCancelar}>
              CANCELAR
            </button>

            <button type="submit" className="gold-gradient-btn wizard-btn-next">
              <span className="material-symbols-outlined text-base">save</span>
              <span>{sessao ? 'SALVAR ALTERAÇÕES' : 'AGENDAR SESSÃO'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

