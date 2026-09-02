// Allies RPG — Indicador Visual de Cargas (ChargeTracker)

export default function ChargeTracker({
  maxCharges = 0,
  currentCharges = 0,
  onToggleCharge,
  readOnly = false,
}) {
  if (!maxCharges || maxCharges <= 0) return null;

  const total = Math.min(10, Math.max(1, Number(maxCharges)));
  const atuais = Math.max(0, Math.min(total, Number(currentCharges ?? total)));

  return (
    <div
      className="moba-charge-tracker"
      title={`Cargas: ${atuais}/${total} (Clique no slot para usar ou clique nos marcadores para ajustar)`}
      onClick={(e) => e.stopPropagation()}
    >
      {Array.from({ length: total }).map((_, idx) => {
        const disponivel = idx < atuais;
        return (
          <div
            key={idx}
            className={`moba-charge-gem ${disponivel ? 'active' : 'spent'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly && onToggleCharge) {
                // Se clicou em uma gema ativa, define para este índice; se gasta, ativa até ela
                const novo = disponivel ? idx : idx + 1;
                onToggleCharge(novo);
              }
            }}
          />
        );
      })}
    </div>
  );
}
