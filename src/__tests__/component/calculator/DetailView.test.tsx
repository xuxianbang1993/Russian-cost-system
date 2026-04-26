import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: Array<Record<string, unknown>>;
  }) => (
    <div data-rowcount={data.length} data-testid="bar-chart">
      {children}
    </div>
  ),
  Bar: ({ dataKey, fill }: { dataKey: string; fill: string }) => (
    <span data-fill={fill} data-testid={`bar-${dataKey}`} />
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
}));

import { DetailView } from '@/components/calculator/DetailView';
import { calculateTax, REVENUE_TIERS } from '@/lib/calc/engine';
import type { CalculatorContextValue } from '@/contexts/calculator/types';
import type {
  CalcInput,
  CalcOutput,
  ExchangeRates,
  Expenses,
  Product,
  TierId,
} from '@/lib/calc/types';

let mockContext: CalculatorContextValue;

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

const SAMPLE_PRODUCT: Product = {
  id: 'p1',
  name: '测试商品',
  emoji: '📦',
  platformPrice: 1000,
  declaredCost: 0,
  purchaseCost: 100,
  volume: 0.01,
  weight: 1,
  dutyRate: 0.05,
  platformFeeRate: 0.27,
  shippingMethod: 'standard',
};

interface InputArgs {
  product?: Partial<Product>;
  tier?: TierId;
  revenue?: number;
  expenses?: Partial<Expenses>;
  rates?: Partial<ExchangeRates>;
}

function buildInput(args: InputArgs = {}): CalcInput {
  return {
    product: { ...SAMPLE_PRODUCT, ...args.product },
    tier: args.tier ?? 'tier1',
    revenue: args.revenue ?? 20_000_000,
    expenses: {
      procurement: 0,
      logistics: 0,
      commission: 0,
      advertising: 0,
      labor: 0,
      ...args.expenses,
    },
    rates: { cnyPerRub: 12.5, usdPerCny: 7.2, ...args.rates },
  };
}

function buildContext(
  product: Product | null,
  calcOutput: CalcOutput | null
): CalculatorContextValue {
  return {
    state: {
      tierId: calcOutput?.tier.id ?? 'tier1',
      products: product ? [product] : [],
      currentProductId: product?.id ?? null,
      expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
      rates: { cnyPerRub: 12.5, usdPerCny: 7.2 },
      activeView: 'detail',
      batchQuantity: 1,
      revenue: 20_000_000,
    },
    dispatch: vi.fn(),
    currentProduct: product,
    calcOutput,
    allProductsCalc: new Map(),
  };
}

describe('DetailView', () => {
  beforeEach(() => {
    mockContext = buildContext(null, null);
  });

  it('renders empty state when no product is selected', () => {
    render(<DetailView />);
    expect(screen.getByText('请先选择或添加商品')).toBeInTheDocument();
  });

  it('renders empty state with hint when calcOutput is empty', () => {
    mockContext = buildContext(SAMPLE_PRODUCT, {
      tier: REVENUE_TIERS[0]!,
      results: [],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<DetailView />);
    expect(screen.getByText('暂无可用税制')).toBeInTheDocument();
  });

  it('renders KpiCards + Chart + Table when tier1 with both regimes', () => {
    const input = buildInput({
      revenue: 20_000_000,
      product: { ...SAMPLE_PRODUCT, declaredCost: 6_000_000 },
    });
    const calcOutput = calculateTax(input);
    mockContext = buildContext(input.product, calcOutput);
    render(<DetailView />);
    // KpiCards labels visible
    expect(screen.getByText('利润率')).toBeInTheDocument();
    expect(screen.getByText('总税额')).toBeInTheDocument();
    expect(screen.getByText('净利润')).toBeInTheDocument();
    // Chart renders 2 bars (tier1)
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-rowcount', '2');
    // Table has 4 row labels
    expect(screen.getByRole('rowheader', { name: '海关增值税' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '总计' })).toBeInTheDocument();
    // No tier4 banner
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('renders single OSNO column with tier4 helper note', () => {
    const input = buildInput({
      revenue: 500_000_000,
      tier: 'tier4',
      product: { ...SAMPLE_PRODUCT, declaredCost: 50_000_000 },
      expenses: { procurement: 80_000_000 },
    });
    const calcOutput = calculateTax(input);
    mockContext = buildContext(input.product, calcOutput);
    render(<DetailView />);
    expect(screen.getByRole('note').textContent).toMatch(/4\.5 亿.*OSNO/);
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-rowcount', '1');
    // OSNO header in table
    expect(
      screen.getByRole('columnheader', { name: /一般税制/ })
    ).toBeInTheDocument();
  });

  it('numbers from KPI match engine output for golden case (tier1 USN-6%)', () => {
    // PDF p2: revenue 2000万, 申报成本 600万 → totalTax 252万, netProfit 1748万
    // (no expenses, all 5 expense fields 0 → netProfit = 2000万 - 0 - 252万 = 1748万)
    const input = buildInput({
      revenue: 20_000_000,
      product: { ...SAMPLE_PRODUCT, declaredCost: 6_000_000 },
    });
    const calcOutput = calculateTax(input);
    mockContext = buildContext(input.product, calcOutput);
    render(<DetailView />);

    // recommended is usn6 (totalTax 252万 < usn15's 312万)
    expect(calcOutput.recommended).toBe('usn6');
    const usn6 = calcOutput.results.find((r) => r.regime === 'usn6')!;
    expect(usn6.totalTax).toBe(2_520_000);
    expect(usn6.netProfit).toBe(20_000_000 - 2_520_000);
    // KpiCards profitMargin shown (formatPercent recommended.profitMargin)
    const margin = (usn6.profitMargin * 100).toFixed(2);
    expect(screen.getByText(`${margin}%`)).toBeInTheDocument();
  });

  it('uses semantic region role with aria-label "税制对比"', () => {
    const input = buildInput({
      revenue: 20_000_000,
      product: { ...SAMPLE_PRODUCT, declaredCost: 6_000_000 },
    });
    const calcOutput = calculateTax(input);
    mockContext = buildContext(input.product, calcOutput);
    render(<DetailView />);
    expect(screen.getByRole('region', { name: '税制对比' })).toBeInTheDocument();
  });
});
