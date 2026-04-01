import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-[400px] rounded-[14px] border border-border bg-surface p-6 shadow-[var(--shadow-lg)] animate-[fadeUp_0.4s_cubic-bezier(0.4,0,0.2,1)]">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-tertiary [font-family:var(--font-dm-sans)]">
            ELSCBSSXT
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground [font-family:var(--font-dm-sans)]">
            {title}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
        <div className="mt-6 border-t border-border-light pt-4 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      </section>
    </div>
  );
}
