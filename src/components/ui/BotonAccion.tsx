// src/components/ui/BotonAccion.tsx
import React, { useState } from "react";

interface BotonAccionProps {
  onClick: () => void;
  children: React.ReactNode;
  variante?: "primario" | "secundario" | "peligro";
  fullWidth?: boolean;
  className?: string;
}

const estilosBase = {
  primario:   { background: "#1461a1", color: "#fff",    border: "none" },
  secundario: { background: "transparent", color: "#64748b", border: "2px solid #cbd5e1" },
  peligro:    { background: "#ef4444", color: "#fff",    border: "none" },
};

const estilosHover = {
  primario:   { background: "#1051881", color: "#fff",    border: "none" },
  secundario: { background: "#f1f5f9",  color: "#334155", border: "2px solid #94a3b8" },
  peligro:    { background: "#dc2626",  color: "#fff",    border: "none" },
};

export const BotonAccion: React.FC<BotonAccionProps> = ({
  onClick,
  children,
  variante = "primario",
  fullWidth = false,
  className,
}) => {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={onClick}
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        marginTop: "16px",
        width: fullWidth ? "100%" : "auto",
        padding: "10px 20px",
        borderRadius: "8px",
        fontWeight: 600,
        fontSize: "0.95em",
        cursor: "pointer",
        transition: "all 0.2s",
        ...(hover ? estilosHover[variante] : estilosBase[variante]),
      }}
    >
      {children}
    </button>
  );
};
