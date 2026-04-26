import { useCalculatorContext } from '@/contexts/calculator';
import { round, TAX_REGIMES } from '@/lib/calc/engine';
import type { TaxCalcResult } from '@/lib/calc/types';
import { cn, formatPercent, formatRUB } from '@/lib/utils';

type RowKey =
  | 'customsVat'
  | 'incomeTax'
  | 'additionalVat'
  | 'totalTax'
  | 'taxRate'
  | 'netProfit'
  | 'profitMargin';

interface RowDef {
  key: RowKey;
  label: string;
  format: 'rub' | 'percent';
  isTotal?: boolean;
}

const ROWS: RowDef[] = [
  { key: 'customsVat', label: '海关增值税', format: 'rub' },
  { key: 'incomeTax', label: '收入/利润/所得税', format: 'rub' },
  { key: 'additionalVat', label: '附加增值税', format: 'rub' },
  { key: 'totalTax', label: '总税', format: 'rub', isTotal: true },
  { key: 'taxRate', label: '税负率', format: 'percent' },
  { key: 'netProfit', label: '净利润', format: 'rub' },
  { key: 'profitMargin', label: '利润率', format: 'percent' },
];

function getCellValue(result: TaxCalcResult, row: RowDef): number {
  if (row.key === 'totalTax') {
    return round(result.customsVat + result.incomeTax + result.additionalVat);
  }
  return result[row.key];
}

function formatCellValue(value: number, row: RowDef): string {
  return row.format === 'percent' ? formatPercent(value) : formatRUB(value);
}

export function TaxDetailTable() {
  const { calcOutput } = useCalculatorContext();
  if (!calcOutput || calcOutput.results.length === 0) return null;

  const { results, recommended } = calcOutput;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">税制对比明细表</caption>
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-tertiary">
            <th className="px-4 py-3 text-left font-semibold">税种</th>
            {results.map((result) => {
              const isRec = result.regime === recommended;
              return (
                <th
                  key={result.regime}
                  className={cn(
                    'px-4 py-3 text-right font-semibold whitespace-nowrap',
                    isRec && 'bg-success-light text-success'
                  )}
                  scope="col"
                >
                  {isRec ? '⭐ ' : ''}
                  {TAX_REGIMES[result.regime].name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr
              key={row.key}
              className={cn(
                'border-t border-border-light',
                row.isTotal && 'border-t-2 border-border'
              )}
            >
              <th
                className={cn(
                  'px-4 py-3 text-left font-medium text-foreground',
                  row.isTotal && 'font-bold'
                )}
                scope="row"
              >
                {row.label}
              </th>
              {results.map((result) => {
                const isRec = result.regime === recommended;
                return (
                  <td
                    key={result.regime}
                    className={cn(
                      'px-4 py-3 text-right font-mono tabular-nums',
                      isRec && 'bg-success-light text-success',
                      row.isTotal && 'font-bold'
                    )}
                  >
                    {formatCellValue(getCellValue(result, row), row)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TaxDetailTable;
