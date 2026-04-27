'use client';

import { netProfitColorClass, profitMarginColorClass } from '@/lib/calc/format';
import type { TaxCalcResult } from '@/lib/calc/types';
import { cn, formatPercent, formatRUB } from '@/lib/utils';

interface CompareCellProps {
  value: TaxCalcResult | null;
  isBest: boolean;
  isTie: boolean;
}

export function CompareCell({ value, isBest, isTie }: CompareCellProps) {
  if (!value) {
    return <td className="px-3 py-2 text-center text-tertiary">—</td>;
  }

  if (isTie) {
    return (
      <td className="px-3 py-2 text-center font-mono tabular-nums text-tertiary">
        =
      </td>
    );
  }

  const cellClass = cn(
    'px-3 py-2 text-right font-mono tabular-nums',
    isBest && 'bg-success-light font-semibold text-success'
  );

  return (
    <td className={cellClass}>
      <div className={cn('text-sm', !isBest && netProfitColorClass(value.netProfit))}>
        {isBest ? <span aria-hidden className="mr-1">⭐</span> : null}
        {formatRUB(value.netProfit)}
      </div>
      <div
        className={cn(
          'text-xs',
          isBest ? 'text-success/80' : profitMarginColorClass(value.profitMargin)
        )}
      >
        {formatPercent(value.profitMargin, 2)}
      </div>
    </td>
  );
}

export default CompareCell;
