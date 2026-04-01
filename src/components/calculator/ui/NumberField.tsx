import type { ChangeEvent } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  name: string;
  onChange: (value: number) => void;
  hint?: string;
}

const INPUT_CLASS_NAME =
  'w-full border-b border-border bg-transparent px-0 py-3 text-sm text-foreground outline-none transition-[border-color,color] duration-200 placeholder:text-placeholder focus:border-primary';

function parseNumericInput(event: ChangeEvent<HTMLInputElement>) {
  const value = Number(event.target.value);
  return Number.isFinite(value) ? value : 0;
}

export function NumberField(props: NumberFieldProps) {
  return (
    <label className="block space-y-2" htmlFor={props.name}>
      <span className="text-sm font-medium text-foreground">{props.label}</span>
      <input
        className={`${INPUT_CLASS_NAME} text-right font-mono font-semibold`}
        id={props.name}
        name={props.name}
        onChange={(event) => props.onChange(parseNumericInput(event))}
        type="number"
        value={props.value}
      />
      {props.hint ? <p className="text-xs text-tertiary">{props.hint}</p> : null}
    </label>
  );
}
