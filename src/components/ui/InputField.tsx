// Reemplaza TODOS los <div className="form-group"> con <label> + <input>
interface InputFieldProps {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  readOnly?: boolean;
  min?: number;
  max?: number;
  step?: number;
  style?: React.CSSProperties;
}

export const InputField: React.FC<InputFieldProps> = ({
  label, value, onChange, type = "text",
  placeholder, readOnly, min, max, step, style,
}) => (
  <div className="form-group">
    <label>{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      min={min}
      max={max}
      step={step}
      style={readOnly ? { background: "#f5f5f5", cursor: "not-allowed", ...style } : style}
    />
  </div>
);
