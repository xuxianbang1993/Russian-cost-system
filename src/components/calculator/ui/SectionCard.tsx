import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SectionCard(props: SectionCardProps) {
  return (
    <section className="rounded-[14px] border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{props.title}</p>
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
      {props.children}
    </section>
  );
}
