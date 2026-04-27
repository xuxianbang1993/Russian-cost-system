import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
}

export function KpiCard(props: KpiCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-semibold uppercase tracking-normal text-tertiary">
        {props.label}
      </p>
      <p
        className={cn(
          'mt-2 truncate font-mono text-3xl font-bold leading-tight tracking-normal tabular-nums',
          props.valueClassName
        )}
      >
        {props.value}
      </p>
      {props.hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{props.hint}</p>
      ) : null}
    </div>
  );
}
