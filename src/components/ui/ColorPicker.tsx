import React from "react";

const COLORS = [
  "#FFFFFF",
  "#F8F9FA", "#E9ECEF", "#DEE2E6", "#ADB5BD", "#6C757D", "#495057", "#343A40", "#212529",
  "#FFEBEE", "#FFCDD2", "#EF9A9A", "#E57373", "#EF5350", "#F44336", "#D32F2F", "#B71C1C",
  "#FCE4EC", "#F8BBD0", "#F48FB1", "#F06292", "#EC407A", "#E91E63", "#C2185B", "#880E4F",
  "#F3E5F5", "#E1BEE7", "#CE93D8", "#BA68C8", "#AB47BC", "#9C27B0", "#7B1FA2", "#4A148C",
  "#E8EAF6", "#C5CAE9", "#9FA8DA", "#7986CB", "#5C6BC0", "#3F51B5", "#303F9F", "#1A237E",
  "#E3F2FD", "#BBDEFB", "#90CAF9", "#64B5F6", "#42A5F5", "#2196F3", "#1976D2", "#0D47A1",
  "#E0F7FA", "#B2EBF2", "#80DEEA", "#4DD0E1", "#26C6DA", "#00BCD4", "#0097A7", "#006064",
  "#E8F5E9", "#C8E6C9", "#A5D6A7", "#81C784", "#66BB6A", "#4CAF50", "#388E3C", "#1B5E20",
  "#FFF8E1", "#FFECB3", "#FFE082", "#FFD54F", "#FFCA28", "#FFC107", "#FFA000", "#FF6F00",
  "#FFF3E0", "#FFE0B2", "#FFCC80", "#FFB74D", "#FFA726", "#FF9800", "#F57C00", "#E65100",
  "#ECEFF1", "#CFD8DC", "#B0BEC5", "#90A4AE", "#78909C", "#607D8B", "#455A64", "#263238",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          width: 32,
          height: 32,
          border: "2px solid #888",
          borderRadius: 4,
          background: value,
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
        title="Seleccionar color"
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 0,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: 8,
            zIndex: 100,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            display: "grid",
            gridTemplateColumns: "repeat(8, 24px)",
            gap: 4,
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {COLORS.map((color) => (
            <div
              key={color}
              style={{
                width: 24,
                height: 24,
                background: color,
                border: value === color ? "2px solid #333" : "1px solid #ccc",
                borderRadius: 3,
                cursor: "pointer",
              }}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
};
