import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  valueClassName?: string;
  hint?: string;
}

export function KpiCard(props: KpiCardProps) {
  return (
    <div className="rounded-[14px] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">
        {props.label}
      </p>
      <p
        className={cn(
          'mt-2 truncate font-mono font-bold tabular-nums tracking-[-0.02em]',
          'text-[clamp(20px,4vw,32px)] leading-tight',
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
