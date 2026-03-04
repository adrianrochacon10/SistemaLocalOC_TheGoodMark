import React from "react";

const COLORS = [
  "#FFFFFF", "#FFCCCC", "#FFE5CC", "#FFFFCC", "#CCFFCC", "#CCFFFF", "#CCCCFF", "#FFCCFF",
  "#CCCCCC", "#FF9999", "#FFCC99", "#FFFF99", "#99FF99", "#99FFFF", "#9999FF", "#FF99FF",
  "#999999", "#FF6666", "#FF9966", "#FFFF66", "#66FF66", "#66FFFF", "#6666FF", "#FF66FF",
  "#666666", "#FF3333", "#FF6633", "#FFFF33", "#33FF33", "#33FFFF", "#3333FF", "#FF33FF",
  "#333333", "#FF0000", "#FF6600", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#FF00FF",
  "#000000", "#990000", "#996600", "#999900", "#009900", "#009999", "#000099", "#990099",
  "#660000", "#663300", "#666600", "#006600", "#006666", "#000066", "#660066",
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
