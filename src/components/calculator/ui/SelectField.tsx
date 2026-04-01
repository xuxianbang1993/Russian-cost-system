interface SelectFieldProps {
  label: string;
  value: 'standard' | 'east';
  onChange: (value: 'standard' | 'east') => void;
}

const INPUT_CLASS_NAME =
  'w-full border-b border-border bg-transparent px-0 py-3 text-sm text-foreground outline-none transition-[border-color,color] duration-200 placeholder:text-placeholder focus:border-primary';

export function SelectField(props: SelectFieldProps) {
  return (
    <label className="block space-y-2" htmlFor="shippingMethod">
      <span className="text-sm font-medium text-foreground">{props.label}</span>
      <select
        className={`${INPUT_CLASS_NAME} font-medium`}
        id="shippingMethod"
        name="shippingMethod"
        onChange={(event) => props.onChange(event.target.value as 'standard' | 'east')}
        value={props.value}
      >
        <option value="standard">标准头程</option>
        <option value="east">东方快线</option>
      </select>
    </label>
  );
}
