/**
 * Allies — Avatar de usuário com anel hextech.
 * Mostra a foto quando existe, senão as iniciais do nome.
 */

export function iniciaisDe(nome) {
  if (!nome) return '?';
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return String(nome).trim().slice(0, 2).toUpperCase();
}

export default function Avatar({
  url,
  nome,
  tamanho = 40,
  cor,
  espessura = 2,
  className = '',
  style = {},
  onClick,
  titulo,
}) {
  const corAnel = cor || 'var(--color-surface-tint)';
  const fonte = Math.max(10, Math.round(tamanho * 0.36));

  return (
    <div
      className={`allies-avatar ${onClick ? 'is-clicavel' : ''} ${className}`}
      title={titulo || nome || undefined}
      onClick={onClick}
      style={{
        width: tamanho,
        height: tamanho,
        borderWidth: espessura,
        borderColor: corAnel,
        fontSize: fonte,
        ...style,
      }}
    >
      {url ? (
        <img src={url} alt={nome || 'Avatar'} className="allies-avatar-img" />
      ) : (
        <span className="allies-avatar-iniciais" style={{ color: corAnel }}>
          {iniciaisDe(nome)}
        </span>
      )}
    </div>
  );
}
