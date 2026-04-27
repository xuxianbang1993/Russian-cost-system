import { describe, expect, it } from 'vitest';

import {
  buildCompareRows,
  findBestRegime,
  groupSortByRecommended,
  sortRows,
  type CompareRow,
} from '@/lib/calc/compare';
import type { CalcOutput, Product, TaxCalcResult, TaxRegimeId } from '@/lib/calc/types';

function makeResult(regime: TaxRegimeId, netProfit: number): TaxCalcResult {
  return {
    regime,
    customsVat: 0,
    incomeTax: 0,
    additionalVat: 0,
    totalTax: 0,
    taxRate: 0,
    netProfit,
    profitMargin: 0,
  };
}

function makeProduct(id: string, name: string = `Product ${id}`): Product {
  return {
    id,
    name,
    emoji: '📦',
    platformPrice: 100,
    declaredCost: 10,
    purchaseCost: 20,
    volume: 0.2,
    weight: 1,
    dutyRate: 0.1,
    platformFeeRate: 0.2,
    shippingMethod: 'standard',
  };
}

function makeCalc(
  recommended: TaxRegimeId,
  netProfits: Partial<Record<TaxRegimeId, number>>
): CalcOutput {
  return {
    tier: {
      id: 'tier1',
      label: '',
      subtitle: '',
      min: 0,
      max: 0,
      vatRate: 0,
      vatDivisor: 0,
    },
    results: (Object.entries(netProfits) as Array<[TaxRegimeId, number]>).map(
      ([regime, netProfit]) => makeResult(regime, netProfit)
    ),
    recommended,
    headShipping: 0,
    platformFee: 0,
    totalExpenses: 0,
  };
}

function makeRow(
  productId: string,
  recommended: TaxRegimeId,
  netProfits: Partial<Record<TaxRegimeId, number>>,
  productName: string = productId
): CompareRow {
  const results: Partial<Record<TaxRegimeId, TaxCalcResult>> = {};
  for (const [regime, netProfit] of Object.entries(netProfits) as Array<[TaxRegimeId, number]>) {
    results[regime] = makeResult(regime, netProfit);
  }
  return {
    productId,
    productName,
    productEmoji: '📦',
    tier: 'tier1',
    recommended,
    results,
  };
}

describe('buildCompareRows', () => {
  it('转换 products + allProductsCalc 为 CompareRow[]，保持 products 顺序', () => {
    const products = [makeProduct('p1', '商品A'), makeProduct('p2', '商品B')];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 100, usn15: 80, osno: 50 })],
      ['p2', makeCalc('usn15', { usn6: 90, usn15: 120, osno: 60 })],
    ]);
    const rows = buildCompareRows(products, allCalc);

    expect(rows).toHaveLength(2);
    expect(rows[0].productId).toBe('p1');
    expect(rows[0].productName).toBe('商品A');
    expect(rows[0].results.usn6?.netProfit).toBe(100);
    expect(rows[1].productName).toBe('商品B');
    expect(rows[1].recommended).toBe('usn15');
  });

  it('缺失 calc 的 product 自动跳过', () => {
    const products = [makeProduct('p1'), makeProduct('p2'), makeProduct('p3')];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 100 })],
      ['p3', makeCalc('osno', { osno: 200 })],
    ]);
    const rows = buildCompareRows(products, allCalc);

    expect(rows.map((row) => row.productId)).toEqual(['p1', 'p3']);
  });
});

describe('findBestRegime', () => {
  it('返回净利润最高的税制', () => {
    const row = makeRow('p1', 'usn6', { usn6: 100, usn15: 80, osno: 50 });
    expect(findBestRegime(row)).toBe('usn6');
  });

  it('平局（差距 < 0.01）返回 null', () => {
    const row = makeRow('p1', 'usn6', { usn6: 100.005, usn15: 100, osno: 50 });
    expect(findBestRegime(row)).toBeNull();
  });

  it('差距恰好 0.01 不算平局', () => {
    const row = makeRow('p1', 'usn6', { usn6: 100.01, usn15: 100, osno: 50 });
    expect(findBestRegime(row)).toBe('usn6');
  });

  it('tier4 单税制 osno 直接返回 osno', () => {
    const row = makeRow('p1', 'osno', { osno: 1000 });
    expect(findBestRegime(row)).toBe('osno');
  });

  it('空 results 返回 null', () => {
    const row: CompareRow = {
      productId: 'p1',
      productName: 'p1',
      productEmoji: '📦',
      tier: 'tier1',
      recommended: 'usn6',
      results: {},
    };
    expect(findBestRegime(row)).toBeNull();
  });
});

describe('sortRows', () => {
  const rows = [
    makeRow('p1', 'usn6', { usn6: 100 }, 'C 商品'),
    makeRow('p2', 'usn15', { usn6: 200 }, 'A 商品'),
    makeRow('p3', 'osno', { usn6: 50 }, 'B 商品'),
  ];

  it('按 usn6 净利润降序', () => {
    const sorted = sortRows(rows, 'usn6', 'desc');
    expect(sorted.map((row) => row.productId)).toEqual(['p2', 'p1', 'p3']);
  });

  it('按 usn6 净利润升序', () => {
    const sorted = sortRows(rows, 'usn6', 'asc');
    expect(sorted.map((row) => row.productId)).toEqual(['p3', 'p1', 'p2']);
  });

  it('按 name 升序（localeCompare）', () => {
    const sorted = sortRows(rows, 'name', 'asc');
    expect(sorted.map((row) => row.productName)).toEqual(['A 商品', 'B 商品', 'C 商品']);
  });

  it('direction=default 返回原顺序的副本（不变更原数组）', () => {
    const sorted = sortRows(rows, 'usn6', 'default');
    expect(sorted.map((row) => row.productId)).toEqual(['p1', 'p2', 'p3']);
    expect(sorted).not.toBe(rows);
  });
});

describe('groupSortByRecommended', () => {
  it('按 USN-6% → USN-15% → OSNO 分组，组内按 sortKey desc 排序', () => {
    const rows = [
      makeRow('p1', 'osno', { usn6: 100 }),
      makeRow('p2', 'usn6', { usn6: 200 }),
      makeRow('p3', 'usn15', { usn6: 300 }),
      makeRow('p4', 'usn6', { usn6: 50 }),
      makeRow('p5', 'usn15', { usn6: 80 }),
    ];
    const grouped = groupSortByRecommended(rows, 'usn6', 'desc');
    expect(grouped.map((row) => row.productId)).toEqual(['p2', 'p4', 'p3', 'p5', 'p1']);
  });

  it('某组为空时跳过该组（保持其余组顺序）', () => {
    const rows = [
      makeRow('p1', 'usn6', { usn6: 100 }),
      makeRow('p2', 'osno', { usn6: 50 }),
    ];
    const grouped = groupSortByRecommended(rows, 'usn6', 'desc');
    expect(grouped.map((row) => row.productId)).toEqual(['p1', 'p2']);
  });

  it('全部相同 recommended 时按 sortKey 排序', () => {
    const rows = [
      makeRow('p1', 'usn6', { usn6: 50 }),
      makeRow('p2', 'usn6', { usn6: 100 }),
    ];
    const grouped = groupSortByRecommended(rows, 'usn6', 'desc');
    expect(grouped.map((row) => row.productId)).toEqual(['p2', 'p1']);
  });
});
