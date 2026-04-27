import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex min-h-[280px] flex-col items-center justify-center gap-2 px-6 py-16 text-center"
    >
      <span aria-hidden="true" className="text-3xl">
        {props.icon ?? '📊'}
      </span>
      <p className="text-sm font-medium text-foreground">{props.title}</p>
      {props.description ? (
        <p className="max-w-xs text-xs text-tertiary">{props.description}</p>
      ) : null}
    </div>
  );
}
