'use client';

import {
  findBestRegime,
  type CompareRow,
  type CompareSortDirection,
  type CompareSortKey,
  type CompareSortMode,
} from '@/lib/calc/compare';
import type { TaxRegimeId } from '@/lib/calc/types';
import { cn } from '@/lib/utils';

import { CompareCell } from './CompareCell';

interface CompareTableProps {
  rows: CompareRow[];
  sortKey: CompareSortKey;
  direction: CompareSortDirection;
  sortMode: CompareSortMode;
  onSort: (key: CompareSortKey) => void;
  onGroupSort: () => void;
  onRowClick: (productId: string) => void;
}

// PRD-06 §3.1：tier1-3 普通表只显示 USN-6% / USN-15% / 推荐（不含 OSNO 主列）；tier4 单 OSNO 列。
const DEFAULT_REGIMES: readonly TaxRegimeId[] = ['usn6', 'usn15'];
const TIER4_REGIMES: readonly TaxRegimeId[] = ['osno'];

const REGIME_LABELS: Record<TaxRegimeId, string> = {
  usn6: 'USN-6%',
  usn15: 'USN-15%',
  osno: 'OSNO',
};

function ariaSortFor(
  key: CompareSortKey,
  sortKey: CompareSortKey,
  direction: CompareSortDirection,
  sortMode: CompareSortMode
): 'ascending' | 'descending' | 'none' {
  if (sortMode !== 'column' || sortKey !== key) return 'none';
  if (direction === 'asc') return 'ascending';
  if (direction === 'desc') return 'descending';
  return 'none';
}

function isAllTier4(rows: CompareRow[]): boolean {
  return rows.length > 0 && rows.every((row) => row.tier === 'tier4');
}

export function CompareTable(props: CompareTableProps) {
  const regimes = isAllTier4(props.rows) ? [...TIER4_REGIMES] : [...DEFAULT_REGIMES];

  const handleRowKey = (productId: string) => (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onRowClick(productId);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th
              aria-sort={ariaSortFor('name', props.sortKey, props.direction, props.sortMode)}
              className="sticky left-0 bg-muted px-3 py-2 text-left text-xs font-medium text-tertiary"
              scope="col"
            >
              <button
                type="button"
                className="hover:text-foreground"
                onClick={() => props.onSort('name')}
              >
                商品
              </button>
            </th>
            {regimes.map((regime) => (
              <th
                key={regime}
                aria-sort={ariaSortFor(regime, props.sortKey, props.direction, props.sortMode)}
                className="px-3 py-2 text-right text-xs font-medium text-tertiary"
                scope="col"
              >
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => props.onSort(regime)}
                >
                  {REGIME_LABELS[regime]}
                </button>
              </th>
            ))}
            <th
              aria-pressed={props.sortMode === 'group'}
              className="px-3 py-2 text-right text-xs font-medium text-tertiary"
              scope="col"
            >
              <button
                type="button"
                className={cn(
                  'hover:text-foreground',
                  props.sortMode === 'group' && 'font-semibold text-primary'
                )}
                onClick={props.onGroupSort}
              >
                推荐
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row) => {
            const best = findBestRegime(row);
            const filledCount = Object.keys(row.results).length;
            const isTie = best === null && filledCount > 1;
            return (
              <tr
                key={row.productId}
                className="cursor-pointer border-t border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => props.onRowClick(row.productId)}
                onKeyDown={handleRowKey(row.productId)}
                tabIndex={0}
              >
                <td className="sticky left-0 bg-background px-3 py-2 text-left">
                  <span aria-hidden className="mr-1">{row.productEmoji}</span>
                  {row.productName}
                </td>
                {regimes.map((regime) => (
                  <CompareCell
                    key={regime}
                    isBest={best === regime}
                    isTie={isTie}
                    value={row.results[regime] ?? null}
                  />
                ))}
                <td className="px-3 py-2 text-right text-xs font-medium text-tertiary">
                  {REGIME_LABELS[row.recommended]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CompareTable;
