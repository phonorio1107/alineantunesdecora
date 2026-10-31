// Símbolo Degrau da marca Pedro Hoffman (mesmo desenho de marca/pedro-hoffman/simbolo-tinta.svg).
export const Simbolo: React.FC<{ tamanho: number; cor?: string }> = ({ tamanho, cor = "#0E0E10" }) => (
  <svg viewBox="0 0 48 48" width={tamanho} height={tamanho}>
    <rect x="5" y="18" width="11" height="24" rx="2" fill={cor} />
    <rect x="32" y="6" width="11" height="36" rx="2" fill={cor} />
    <rect x="14" y="25" width="20" height="9" fill={cor} />
  </svg>
);
