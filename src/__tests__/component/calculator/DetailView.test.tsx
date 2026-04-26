import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

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
import { formatPercent, formatRUB } from '@/lib/utils';
import type {
  CalcInput,
  CalcOutput,
  ExchangeRates,
  Expenses,
  Product,
  TaxRegimeId,
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

interface GoldenCase {
  name: string;
  args: InputArgs;
  regime: TaxRegimeId;
  expected: {
    customsVat: number;
    incomeTax: number;
    additionalVat: number;
    totalTax: number;
  };
}

const GOLDEN_CASES: GoldenCase[] = [
  {
    name: 'USN-6% tier1: revenue 2000万, declared cost 600万 → total tax 252万',
    args: {
      revenue: 20_000_000,
      product: { declaredCost: 6_000_000 },
    },
    regime: 'usn6',
    expected: {
      customsVat: 1_320_000,
      incomeTax: 1_200_000,
      additionalVat: 0,
      totalTax: 2_520_000,
    },
  },
  {
    name: 'USN-6% tier2: revenue 1亿, declared cost 3000万 → total tax 1736万',
    args: {
      revenue: 100_000_000,
      tier: 'tier2',
      product: { declaredCost: 30_000_000 },
    },
    regime: 'usn6',
    expected: {
      customsVat: 6_600_000,
      incomeTax: 6_000_000,
      additionalVat: 4_761_904.76,
      totalTax: 17_361_904.76,
    },
  },
  {
    name: 'USN-6% tier3: revenue 3亿, declared cost 1亿 → total tax 5962万',
    args: {
      revenue: 300_000_000,
      tier: 'tier3',
      product: { declaredCost: 100_000_000 },
    },
    regime: 'usn6',
    expected: {
      customsVat: 22_000_000,
      incomeTax: 18_000_000,
      additionalVat: 19_626_168.22,
      totalTax: 59_626_168.22,
    },
  },
  {
    name: 'USN-15% tier1: revenue 2000万, expenses 800万 → total tax 312万',
    args: {
      revenue: 20_000_000,
      product: { declaredCost: 6_000_000 },
      expenses: { procurement: 6_000_000, logistics: 1_000_000, advertising: 1_000_000 },
    },
    regime: 'usn15',
    expected: {
      customsVat: 1_320_000,
      incomeTax: 1_800_000,
      additionalVat: 0,
      totalTax: 3_120_000,
    },
  },
  {
    name: 'USN-15% tier2: revenue 1亿, expenses 7000万 → total tax 1586万',
    args: {
      revenue: 100_000_000,
      tier: 'tier2',
      product: { declaredCost: 30_000_000 },
      expenses: { procurement: 30_000_000, logistics: 20_000_000, advertising: 20_000_000 },
    },
    regime: 'usn15',
    expected: {
      customsVat: 6_600_000,
      incomeTax: 4_500_000,
      additionalVat: 4_761_904.76,
      totalTax: 15_861_904.76,
    },
  },
  {
    name: 'OSNO: revenue 1亿, expenses 8000万, declared cost 5000万 → total tax 1870万',
    args: {
      revenue: 100_000_000,
      tier: 'tier4',
      product: { declaredCost: 50_000_000 },
      expenses: { procurement: 80_000_000 },
    },
    regime: 'osno',
    expected: {
      customsVat: 11_000_000,
      incomeTax: 4_098_360.66,
      additionalVat: 3_606_557.38,
      totalTax: 18_704_918.04,
    },
  },
];

function getTableCellText(rowLabel: string, regimeIndex: number): string {
  const row = screen.getByRole('rowheader', { name: rowLabel }).closest('tr');
  expect(row).not.toBeNull();
  const cell = within(row!).getAllByRole('cell')[regimeIndex];
  expect(cell).toBeDefined();
  return cell!.textContent ?? '';
}

function expectTextContent(container: HTMLElement, expected: string) {
  expect(
    within(container).getByText(
      (_, element) => element?.textContent === expected && element.children.length === 0
    )
  ).toBeInTheDocument();
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
    const kpiGroup = screen.getByRole('group', { name: '关键指标' });
    // KpiCards labels visible
    expect(within(kpiGroup).getByText('利润率')).toBeInTheDocument();
    expect(within(kpiGroup).getByText('总税额')).toBeInTheDocument();
    expect(within(kpiGroup).getByText('净利润')).toBeInTheDocument();
    // Chart renders 2 bars (tier1)
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-rowcount', '2');
    // Table has 4 row labels
    expect(screen.getByRole('rowheader', { name: '海关增值税' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '总税' })).toBeInTheDocument();
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
    expect(screen.getByRole('note')).toHaveTextContent(
      '营业额 >4.5 亿，强制适用一般税制 (OSNO)'
    );
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
    const kpiGroup = screen.getByRole('group', { name: '关键指标' });
    expect(within(kpiGroup).getByText(`${margin}%`)).toBeInTheDocument();
  });

  it.each(GOLDEN_CASES)('renders PRD-02 golden UI numbers: $name', ({ args, regime, expected }) => {
    const input = buildInput(args);
    const calcOutput = calculateTax(input);
    const result = calcOutput.results.find((r) => r.regime === regime);
    expect(result).toBeDefined();
    expect(result!.customsVat).toBeCloseTo(expected.customsVat, 2);
    expect(result!.incomeTax).toBeCloseTo(expected.incomeTax, 2);
    expect(result!.additionalVat).toBeCloseTo(expected.additionalVat, 2);
    expect(result!.totalTax).toBeCloseTo(expected.totalTax, 2);

    mockContext = buildContext(input.product, calcOutput);
    render(<DetailView />);

    const regimeIndex = calcOutput.results.findIndex((r) => r.regime === regime);
    expect(getTableCellText('海关增值税', regimeIndex)).toBe(formatRUB(expected.customsVat));
    expect(getTableCellText('收入/利润/所得税', regimeIndex)).toBe(
      formatRUB(expected.incomeTax)
    );
    expect(getTableCellText('附加增值税', regimeIndex)).toBe(formatRUB(expected.additionalVat));
    expect(getTableCellText('总税', regimeIndex)).toBe(formatRUB(expected.totalTax));

    if (calcOutput.recommended === regime) {
      const kpiGroup = screen.getByRole('group', { name: '关键指标' });
      expectTextContent(kpiGroup, formatRUB(result!.totalTax));
      expectTextContent(kpiGroup, formatRUB(result!.netProfit));
      expectTextContent(kpiGroup, formatPercent(result!.profitMargin));
    }
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
