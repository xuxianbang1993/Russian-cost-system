import type {
  CalcOutput,
  Product,
  TaxCalcResult,
  TaxRegimeId,
  TierId,
} from './types';

export type CompareSortKey = 'name' | TaxRegimeId | 'recommended';
export type CompareSortDirection = 'asc' | 'desc' | 'default';
export type CompareSortMode = 'column' | 'group';

export interface CompareRow {
  productId: string;
  productName: string;
  productEmoji: string;
  tier: TierId;
  recommended: TaxRegimeId;
  results: Partial<Record<TaxRegimeId, TaxCalcResult>>;
}

const GROUP_ORDER: readonly TaxRegimeId[] = ['usn6', 'usn15', 'osno'];

export function buildCompareRows(
  products: Product[],
  allProductsCalc: Map<string, CalcOutput>
): CompareRow[] {
  const rows: CompareRow[] = [];
  for (const product of products) {
    const calc = allProductsCalc.get(product.id);
    if (!calc) continue;
    const results: Partial<Record<TaxRegimeId, TaxCalcResult>> = {};
    for (const result of calc.results) {
      results[result.regime] = result;
    }
    rows.push({
      productId: product.id,
      productName: product.name,
      productEmoji: product.emoji,
      tier: calc.tier.id,
      recommended: calc.recommended,
      results,
    });
  }
  return rows;
}

export function findBestRegime(
  row: CompareRow,
  tieEpsilon: number = 0.01
): TaxRegimeId | null {
  const entries = Object.entries(row.results) as Array<[TaxRegimeId, TaxCalcResult]>;
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0][0];

  const sorted = [...entries].sort((a, b) => b[1].netProfit - a[1].netProfit);
  const [best, second] = sorted;
  if (Math.abs(best[1].netProfit - second[1].netProfit) < tieEpsilon) return null;
  return best[0];
}

function getSortValue(row: CompareRow, sortKey: CompareSortKey): number | string {
  if (sortKey === 'name') return row.productName;
  if (sortKey === 'recommended') return row.recommended;
  return row.results[sortKey]?.netProfit ?? Number.NEGATIVE_INFINITY;
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

export function sortRows(
  rows: CompareRow[],
  sortKey: CompareSortKey,
  direction: CompareSortDirection
): CompareRow[] {
  if (direction === 'default') return [...rows];
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort(
    (a, b) => sign * compareValues(getSortValue(a, sortKey), getSortValue(b, sortKey))
  );
}

export function groupSortByRecommended(
  rows: CompareRow[],
  sortKey: CompareSortKey,
  direction: CompareSortDirection
): CompareRow[] {
  const grouped: CompareRow[] = [];
  for (const regime of GROUP_ORDER) {
    const inGroup = rows.filter((row) => row.recommended === regime);
    grouped.push(...sortRows(inGroup, sortKey, direction));
  }
  return grouped;
}
