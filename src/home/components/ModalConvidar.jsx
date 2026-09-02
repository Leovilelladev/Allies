import { useState } from 'react';

export default function ModalConvidar({ onConvidar, onCancelar }) {
  const [usuario, setUsuario] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const usuarioLimpo = usuario.trim().replace(/^@/, '').toLowerCase();
    if (!usuarioLimpo) return;
    onConvidar(usuarioLimpo);
  };

  return (
    <div
      className="wizard-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancelar();
      }}
    >
      <div className="wizard-modal-container" style={{ maxWidth: '480px' }}>
        <div className="hextech-corner-accent top-left" />
        <div className="hextech-corner-accent top-right" />
        <div className="hextech-corner-accent bottom-left" />
        <div className="hextech-corner-accent bottom-right" />

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="wizard-sparkle-circle">
            <span className="material-symbols-outlined text-2xl">person_add</span>
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '24px',
              color: 'var(--color-primary)',
              margin: '0 0 6px',
            }}
          >
            Convidar Jogador
          </h3>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '14px', margin: 0 }}>
            Digite o nome de usuário do aventureiro para integrá-lo ao reino.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="wizard-form-body">
          <div className="wizard-field">
            <label htmlFor="convidar-usuario">Nome de Usuário</label>
            <div className="wizard-input-wrap">
              <span className="material-symbols-outlined">alternate_email</span>
              <input
                type="text"
                id="convidar-usuario"
                className="wizard-input"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
                pattern="[a-zA-Z0-9_]{3,20}"
                placeholder="ex: gandalf42, thorgar..."
                autoFocus
              />
            </div>
          </div>

          <div className="wizard-modal-footer">
            <button type="button" className="wizard-btn-cancel" onClick={onCancelar}>
              CANCELAR
            </button>
            <button type="submit" className="gold-gradient-btn wizard-btn-next">
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>CONVOCAR</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

