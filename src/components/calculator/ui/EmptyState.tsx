import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
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
      {props.actionLabel && props.onAction ? (
        <button
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          onClick={props.onAction}
          type="button"
        >
          {props.actionLabel}
        </button>
      ) : null}
    </div>
  );
}
