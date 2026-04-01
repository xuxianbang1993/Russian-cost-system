'use client';

import { REVENUE_TIERS } from '@/lib/calc/engine';
import { useCalculatorContext } from '@/contexts/calculator';
import { cn } from '@/lib/utils';

export function TierSelector() {
  const { state, dispatch } = useCalculatorContext();
  const activeTier = REVENUE_TIERS.find((tier) => tier.id === state.tierId);

  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">营收档位</p>
        <p className="text-xs text-muted-foreground">按年度营业额选择当前阶段，决定可适用税制。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {REVENUE_TIERS.map((tier) => {
          const isActive = tier.id === state.tierId;

          return (
            <button
              aria-label={tier.label}
              key={tier.id}
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium',
                isActive
                  ? 'border-primary bg-primary text-white shadow-[var(--shadow-sm)]'
                  : 'border-border bg-surface text-tertiary hover:border-primary hover:text-primary'
              )}
              onClick={() => dispatch({ type: 'SET_TIER', tierId: tier.id })}
              type="button"
            >
              {tier.label}
              {tier.id === 'tier4' ? (
                <span aria-hidden="true" className="ml-1 text-[11px] opacity-80">
                  一般税制
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {activeTier?.subtitle}
        {state.tierId === 'tier4' ? ' - 一般税制 (OSNO)' : null}
      </p>
    </section>
  );
}

export default TierSelector;
