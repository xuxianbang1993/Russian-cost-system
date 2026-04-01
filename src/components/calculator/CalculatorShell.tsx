'use client';

import type { ExchangeRates, Product } from '@/lib/calc/types';
import { CalculatorProvider } from '@/contexts/calculator';
import { CostInputPanel } from '@/components/calculator/CostInputPanel';
import { TierSelector } from '@/components/calculator/TierSelector';

interface CalculatorShellProps {
  initialProducts: Product[];
  initialRates: ExchangeRates;
}

export default function CalculatorShell(props: CalculatorShellProps) {
  return (
    <CalculatorProvider initialProducts={props.initialProducts} initialRates={props.initialRates}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 flex h-14 items-center border-b border-border bg-surface px-6">
          <h1 className="text-sm font-semibold">跨境电商成本计算器</h1>
        </header>
        <div className="flex flex-1 flex-col lg:flex-row">
          <aside className="w-full overflow-y-auto border-b border-border bg-surface p-5 lg:sticky lg:top-14 lg:max-h-[calc(100vh-3.5rem)] lg:w-80 lg:border-r lg:border-b-0">
            <div className="space-y-5">
              <TierSelector />
              <CostInputPanel />
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto p-6 lg:max-h-[calc(100vh-3.5rem)]">
            <p className="text-sm text-muted-foreground">Right Panel — Phase 5.4</p>
          </main>
        </div>
      </div>
    </CalculatorProvider>
  );
}
