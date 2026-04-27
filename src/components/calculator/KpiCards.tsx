'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import { netProfitColorClass, profitMarginColorClass } from '@/lib/calc/format';
import { formatPercent, formatRUB } from '@/lib/utils';
import { KpiCard } from '@/components/calculator/KpiCard';

export function KpiCards() {
  const { calcOutput } = useCalculatorContext();
  if (!calcOutput) return null;

  const recommended = calcOutput.results.find((r) => r.regime === calcOutput.recommended);
  if (!recommended) return null;

  return (
    <div
      aria-label="关键指标"
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      role="group"
    >
      <KpiCard
        label="利润率"
        value={formatPercent(recommended.profitMargin, 2)}
        valueClassName={profitMarginColorClass(recommended.profitMargin)}
      />
      <KpiCard label="总税额" value={formatRUB(recommended.totalTax)} />
      <KpiCard
        label="净利润"
        value={formatRUB(recommended.netProfit)}
        valueClassName={netProfitColorClass(recommended.netProfit)}
      />
    </div>
  );
}

export default KpiCards;
