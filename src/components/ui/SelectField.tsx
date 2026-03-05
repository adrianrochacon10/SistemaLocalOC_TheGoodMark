interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  onChange,
  options,
  className,
  style,
  placeholder
}) => (
  <div className="form-group">
    <label>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={style}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
