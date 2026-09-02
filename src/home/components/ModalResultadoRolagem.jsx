// Allies RPG — Modal de Resultado de Rolagem de Ação

export default function ModalResultadoRolagem({ resultado, onRolarNovamente, onFechar }) {
  if (!resultado) return null;

  const ehCritico = resultado.acerto?.ehCritico;
  const ehFalha = resultado.acerto?.ehFalhaCritica;

  return (
    <div
      className="wizard-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
      style={{ zIndex: 100 }}
    >
      <div
        className="wizard-modal-container hex-card"
        style={{
          maxWidth: '520px',
          textAlign: 'center',
          animation: 'rollPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          border: ehCritico
            ? '2px solid #e5c587'
            : ehFalha
            ? '2px solid #ff5364'
            : '1px solid rgba(226, 195, 132, 0.35)',
          boxShadow: ehCritico
            ? '0 0 30px rgba(229, 197, 135, 0.6)'
            : '0 12px 40px rgba(0, 0, 0, 0.7)',
        }}
      >
        {/* Cabeçalho da Habilidade */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
          {resultado.icone_url && (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundImage: `url(${resultado.icone_url})`,
                backgroundSize: 'cover',
                border: '1.5px solid var(--color-surface-tint)',
              }}
            />
          )}
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: '#ffffff', margin: 0 }}>
            {resultado.nomeAcao}
          </h3>
        </div>

        {/* Bloco de Acerto (Attack Roll) */}
        {resultado.temAtaque && resultado.acerto && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(4, 14, 34, 0.65)',
              borderRadius: '10px',
              border: '1px solid rgba(77, 70, 58, 0.35)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Rolagem de Ataque
            </div>

            <div style={{ fontSize: '42px', fontWeight: 900, color: ehCritico ? '#e5c587' : ehFalha ? '#ff5364' : 'var(--color-secondary)', margin: '4px 0' }}>
              {resultado.acerto.total}
            </div>

            <div style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
              d20 (<strong>{resultado.acerto.d20}</strong>) + Modificador ({resultado.acerto.modificador >= 0 ? `+${resultado.acerto.modificador}` : resultado.acerto.modificador})
            </div>

            {ehCritico && (
              <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 800, color: '#e5c587' }}>
                ⭐ ACERTO CRÍTICO! (DADOS DOBRADOS) ⭐
              </div>
            )}

            {ehFalha && (
              <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 800, color: '#ff5364' }}>
                💀 FALHA CRÍTICA (1 NATURAL) 💀
              </div>
            )}
          </div>
        )}

        {/* Bloco de Dano / Efeito */}
        {resultado.dano && (
          <div
            style={{
              padding: '16px',
              background: 'rgba(4, 14, 34, 0.65)',
              borderRadius: '10px',
              border: '1px solid rgba(77, 70, 58, 0.35)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {resultado.dano.tipoDano === 'healing' ? 'Cura Realizada' : 'Dano Causado'}
            </div>

            <div style={{ fontSize: '42px', fontWeight: 900, color: resultado.dano.tipoDano === 'healing' ? '#43e2d2' : 'var(--color-error)', margin: '4px 0' }}>
              {resultado.dano.total}
            </div>

            <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>
              Fórmula: <span style={{ color: 'var(--color-primary)' }}>{resultado.dano.formulaResolvida}</span>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
              Rolagens: {resultado.dano.detalhes} ({resultado.dano.tipoDano})
            </div>
          </div>
        )}

        {/* Bloco de CD de Salvaguarda */}
        {resultado.saveDC && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(21, 31, 52, 0.6)',
              borderRadius: '8px',
              border: '1px solid rgba(229, 197, 135, 0.3)',
              marginBottom: '16px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--color-primary)',
            }}
          >
            🛡️ O alvo deve fazer uma Salvaguarda de <strong>{resultado.saveDC.atributo}</strong> CD <strong>{resultado.saveDC.dc}</strong>
          </div>
        )}

        {/* Rodapé de Ações */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
          {onRolarNovamente && (
            <button
              type="button"
              className="nexus-btn-secondary"
              style={{ padding: '8px 16px', borderRadius: '8px' }}
              onClick={onRolarNovamente}
            >
              <span className="material-symbols-outlined text-[16px]">casino</span>
              <span>Rolar Novamente</span>
            </button>
          )}

          <button
            type="button"
            className="gold-gradient-btn"
            style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: 700 }}
            onClick={onFechar}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
