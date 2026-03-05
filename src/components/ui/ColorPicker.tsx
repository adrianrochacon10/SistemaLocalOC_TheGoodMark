import React, { useState } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const COLORES = [
  // Neutros
  "#FFFFFF", "#F5F5F5", "#E0E0E0", "#BDBDBD", "#9E9E9E",
  "#757575", "#616161", "#424242", "#212121", "#000000",
  // Rojos / Rosas
  "#FFCDD2", "#EF9A9A", "#E57373", "#EF5350", "#F44336",
  "#E53935", "#C62828", "#B71C1C", "#880E4F", "#AD1457",
  // Naranjas / Ambar
  "#FFE0B2", "#FFCC80", "#FFA726", "#FB8C00", "#F57C00",
  "#E65100", "#BF360C", "#D84315", "#FF6D00", "#E64A19",
  // Amarillos (apagados)
  "#FFF9C4", "#FFF176", "#F9A825", "#F57F17", "#FF8F00",
  "#FF6F00", "#795548", "#6D4C41", "#5D4037", "#4E342E",
  // Verdes
  "#C8E6C9", "#A5D6A7", "#66BB6A", "#43A047", "#2E7D32",
  "#1B5E20", "#33691E", "#558B2F", "#827717", "#004D40",
  // Azules / Cyan
  "#BBDEFB", "#90CAF9", "#42A5F5", "#1E88E5", "#1565C0",
  "#0D47A1", "#01579B", "#006064", "#00838F", "#00695C",
  // Morados
  "#E1BEE7", "#CE93D8", "#AB47BC", "#8E24AA", "#6A1B9A",
  "#4A148C", "#311B92", "#4527A0", "#283593", "#1A237E",
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const [abierto, setAbierto] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Botón que muestra el color actual */}
      <div
        onClick={() => setAbierto(!abierto)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: value || "#E0E0E0",
          border: "2px solid #ccc",
          cursor: "pointer",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
        title="Seleccionar color"
      />

      {/* Paleta de colores */}
      {abierto && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            zIndex: 999,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 10,
            padding: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            display: "grid",
            gridTemplateColumns: "repeat(10, 24px)",
            gap: 4,
          }}
        >
          {COLORES.map((color) => (
            <div
              key={color}
              onClick={() => {
                onChange(color);
                setAbierto(false);
              }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: color,
                cursor: "pointer",
                border: value === color
                  ? "2px solid #1461a1"
                  : "1px solid rgba(0,0,0,0.1)",
                transform: value === color ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.1s ease",
              }}
              title={color}
            />
          ))}

          {/* Botón limpiar */}
          <div
            onClick={() => { onChange(""); setAbierto(false); }}
            style={{
              gridColumn: "span 10",
              marginTop: 6,
              padding: "4px 8px",
              textAlign: "center",
              fontSize: 12,
              color: "#666",
              cursor: "pointer",
              borderTop: "1px solid #eee",
              paddingTop: 8,
            }}
          >
            ✕ Sin color
          </div>
        </div>
      )}
    </div>
  );
};
