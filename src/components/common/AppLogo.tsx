import React from "react";
import "./AppLogo.css";

/** Ruta pública del logo (Vite / Tauri sirven `public/logo.svg`). */
export const APP_LOGO_SRC = "/logo.svg";

type AppLogoSize = "sm" | "md" | "lg" | "xl";

export interface AppLogoProps {
  size?: AppLogoSize;
  className?: string;
  /** Si true, el bloque ocupa todo el ancho disponible (p. ej. login). */
  block?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = "md",
  className = "",
  block = false,
}) => (
  <span
    className={`app-logo app-logo--${size}${block ? " app-logo--block" : ""} ${className}`.trim()}
    role="img"
    aria-label="The Good Mark"
  >
    <img src={APP_LOGO_SRC} alt="" decoding="async" />
  </span>
);
