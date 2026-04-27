import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CompareView from '@/components/calculator/CompareView';
import type { CalculatorContextValue } from '@/contexts/calculator/types';
import type {
  CalcOutput,
  Product,
  TaxCalcResult,
  TaxRegimeId,
  TierId,
} from '@/lib/calc/types';

let mockContext: CalculatorContextValue;
const mockDispatch = vi.fn();

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

function makeResult(
  regime: TaxRegimeId,
  netProfit: number,
  profitMargin: number = 0.1
): TaxCalcResult {
  return {
    regime,
    customsVat: 0,
    incomeTax: 0,
    additionalVat: 0,
    totalTax: 0,
    taxRate: 0,
    netProfit,
    profitMargin,
  };
}

function makeProduct(id: string, name: string, emoji: string): Product {
  return {
    id,
    name,
    emoji,
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
  netProfits: Partial<Record<TaxRegimeId, number>>,
  tierId: TierId = 'tier1'
): CalcOutput {
  return {
    tier: { id: tierId, label: '', subtitle: '', min: 0, max: 0, vatRate: 0, vatDivisor: 0 },
    results: (Object.entries(netProfits) as Array<[TaxRegimeId, number]>).map(
      ([regime, netProfit]) => makeResult(regime, netProfit)
    ),
    recommended,
    headShipping: 0,
    platformFee: 0,
    totalExpenses: 0,
  };
}

function buildContext(
  products: Product[],
  allCalc: Map<string, CalcOutput> = new Map()
): CalculatorContextValue {
  return {
    state: {
      tierId: 'tier1',
      products,
      currentProductId: products[0]?.id ?? null,
      expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
      rates: { cnyPerRub: 12.5, usdPerCny: 7.2 },
      activeView: 'compare',
      batchMin: 0,
      batchMax: 250_000_000,
      revenue: 20_000_000,
    },
    dispatch: mockDispatch,
    currentProduct: products[0] ?? null,
    calcOutput: null,
    allProductsCalc: allCalc,
  };
}

function rowEmojis(): string[] {
  const rows = screen.getAllByRole('row').slice(1);
  return rows.map((row) => {
    const firstCell = within(row).getAllByRole('cell')[0];
    const text = firstCell.textContent ?? '';
    const match = text.match(/🍎|🍌|🍒|📦/);
    return match?.[0] ?? '';
  });
}

beforeEach(() => {
  mockDispatch.mockClear();
});

describe('CompareView', () => {
  it('< 2 商品时显示空态 + "去添加" 按钮（PRD-06 F-7）', () => {
    mockContext = buildContext([makeProduct('p1', 'A', '🍎')]);
    render(<CompareView />);
    expect(screen.getByText(/多品对比需要至少 2 个商品/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去添加' })).toBeInTheDocument();
  });

  it('tier1-3 表头只显示 USN-6% / USN-15% / 推荐（不含 OSNO 主列，PRD-06 §3.1）', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 100, usn15: 80, osno: 50 }, 'tier1')],
      ['p2', makeCalc('usn15', { usn6: 90, usn15: 120, osno: 60 }, 'tier1')],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);
    expect(screen.getByRole('button', { name: 'USN-6%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'USN-15%' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'OSNO' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '推荐' })).toBeInTheDocument();
  });

  it('渲染矩阵 + 每行最高净利单元格高亮 ⭐', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 1000, usn15: 800, osno: 500 })],
      ['p2', makeCalc('usn15', { usn6: 700, usn15: 1200, osno: 600 })],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);
    const stars = screen.getAllByText('⭐');
    expect(stars).toHaveLength(2);
  });

  it('默认按 usn6 净利润降序', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
      makeProduct('p3', 'C', '🍒'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 100, usn15: 80, osno: 50 })],
      ['p2', makeCalc('usn6', { usn6: 300, usn15: 200, osno: 150 })],
      ['p3', makeCalc('usn6', { usn6: 200, usn15: 180, osno: 120 })],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);
    expect(rowEmojis()).toEqual(['🍌', '🍒', '🍎']);
  });

  it('点 USN-6% 表头切换 desc → asc → default', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 100, usn15: 80, osno: 50 })],
      ['p2', makeCalc('usn6', { usn6: 300, usn15: 200, osno: 150 })],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);

    expect(rowEmojis()).toEqual(['🍌', '🍎']);

    fireEvent.click(screen.getByRole('button', { name: 'USN-6%' }));
    expect(rowEmojis()).toEqual(['🍎', '🍌']);

    fireEvent.click(screen.getByRole('button', { name: 'USN-6%' }));
    expect(rowEmojis()).toEqual(['🍎', '🍌']);
  });

  it('tier4 表头只显示 OSNO 列（无 USN-6% / USN-15%）', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('osno', { osno: 100 }, 'tier4')],
      ['p2', makeCalc('osno', { osno: 200 }, 'tier4')],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);
    expect(screen.queryByRole('button', { name: 'USN-6%' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'USN-15%' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OSNO' })).toBeInTheDocument();
  });

  it('行点击触发 dispatch SET_PRODUCT + SET_VIEW=detail', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 100, usn15: 80, osno: 50 })],
      ['p2', makeCalc('usn15', { usn6: 90, usn15: 120, osno: 60 })],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);
    const rows = screen.getAllByRole('row').slice(1);
    fireEvent.click(rows[0]);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_PRODUCT', productId: 'p1' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_VIEW', view: 'detail' });
  });

  it('平局（差距 < 0.01）显示 = 不高亮 ⭐', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('usn6', { usn6: 100, usn15: 100.005, osno: 50 })],
      ['p2', makeCalc('usn15', { usn6: 90, usn15: 120, osno: 60 })],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);
    expect(screen.getAllByText('=').length).toBeGreaterThanOrEqual(2);
  });

  it('点推荐列触发 group sort（USN-6% → USN-15% → OSNO），再点恢复 column', () => {
    const products = [
      makeProduct('p1', 'A', '🍎'),
      makeProduct('p2', 'B', '🍌'),
      makeProduct('p3', 'C', '🍒'),
    ];
    const allCalc = new Map<string, CalcOutput>([
      ['p1', makeCalc('osno', { usn6: 100 })],
      ['p2', makeCalc('usn6', { usn6: 300 })],
      ['p3', makeCalc('usn15', { usn6: 50 })],
    ]);
    mockContext = buildContext(products, allCalc);
    render(<CompareView />);

    expect(rowEmojis()).toEqual(['🍌', '🍎', '🍒']);

    fireEvent.click(screen.getByRole('button', { name: '推荐' }));
    expect(rowEmojis()).toEqual(['🍌', '🍒', '🍎']);

    fireEvent.click(screen.getByRole('button', { name: '推荐' }));
    expect(rowEmojis()).toEqual(['🍌', '🍎', '🍒']);
  });
});
