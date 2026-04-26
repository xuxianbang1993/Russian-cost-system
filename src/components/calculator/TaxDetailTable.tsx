import { useCalculatorContext } from '@/contexts/calculator';
import { TAX_REGIMES } from '@/lib/calc/engine';
import type { TaxCalcResult } from '@/lib/calc/types';
import { cn, formatRUB } from '@/lib/utils';

interface RowDef {
  key: 'customsVat' | 'incomeTax' | 'additionalVat' | 'totalTax';
  label: string;
  isTotal?: boolean;
}

const ROWS: RowDef[] = [
  { key: 'customsVat', label: '海关增值税' },
  { key: 'incomeTax', label: '收入/利润税' },
  { key: 'additionalVat', label: '附加增值税' },
  { key: 'totalTax', label: '总计', isTotal: true },
];

function getCellValue(result: TaxCalcResult, key: RowDef['key']): number {
  return result[key];
}

export function TaxDetailTable() {
  const { calcOutput } = useCalculatorContext();
  if (!calcOutput || calcOutput.results.length === 0) return null;

  const { results, recommended } = calcOutput;

  return (
    <div className="overflow-x-auto rounded-[14px] border border-border bg-surface">
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
                    {formatRUB(getCellValue(result, row.key))}
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
