import React from "react";
import "./BrandFooter.css";

/** Logo de marca en `public/assets/logo.png` (misma ruta que en el build: `/assets/logo.png`). */
export const BRAND_LOGO_PNG = "/assets/logo.png";

export const BrandFooter: React.FC<{ variant?: "dashboard" | "login" }> = ({
  variant = "dashboard",
}) => (
  <footer
    className={`brand-footer brand-footer--${variant}`}
    aria-label="Marca"
  >
    <img src={BRAND_LOGO_PNG} alt="The Good Mark" decoding="async" />
  </footer>
);
