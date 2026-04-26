'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import { KpiCards } from '@/components/calculator/KpiCards';
import { TaxComparisonChart } from '@/components/calculator/TaxComparisonChart';
import { TaxDetailTable } from '@/components/calculator/TaxDetailTable';
import { EmptyState } from '@/components/calculator/ui/EmptyState';

export function DetailView() {
  const { currentProduct, calcOutput } = useCalculatorContext();

  if (!currentProduct) {
    return (
      <EmptyState
        description="商品选定后将自动展示三档税制对比"
        icon="📦"
        title="请先选择或添加商品"
      />
    );
  }

  if (!calcOutput || calcOutput.results.length === 0) {
    return (
      <EmptyState
        description="请检查营收档位或商品参数设置"
        icon="🧮"
        title="暂无可用税制"
      />
    );
  }

  const isTier4 = calcOutput.tier.id === 'tier4';

  return (
    <section
      aria-label="税制对比"
      className="space-y-5"
      role="region"
    >
      {isTier4 ? (
        <p
          className="rounded-md border border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] px-3 py-2 text-xs font-medium text-warning"
          role="note"
        >
          营业额 &gt;4.5 亿，强制适用一般税制 (OSNO)
        </p>
      ) : null}
      <KpiCards />
      <TaxComparisonChart />
      <TaxDetailTable />
    </section>
  );
}

export default DetailView;
