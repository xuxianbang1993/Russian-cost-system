import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({
    children,
    data,
  }: {
    children: ReactNode;
    data: Array<Record<string, unknown>>;
  }) => (
    <div data-rowcount={data.length} data-testid="line-chart">
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: { dataKey: string; stroke: string }) => (
    <span data-stroke={stroke} data-testid={`line-${dataKey}`} />
  ),
  ReferenceLine: ({
    x,
    label,
  }: {
    x: number;
    label?: { value?: string } | string;
  }) => {
    const value =
      typeof label === 'object' && label !== null ? (label.value ?? '') : (label ?? '');
    return (
      <span data-testid="reference-line" data-x={x}>
        {value}
      </span>
    );
  },
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
}));

import BatchSimulation from '@/components/calculator/BatchSimulation';
import type { CalculatorContextValue } from '@/contexts/calculator/types';
import type { Product } from '@/lib/calc/types';

let mockContext: CalculatorContextValue;
const mockDispatch = vi.fn();

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

function buildContext(
  product: Product | null,
  batchMin = 0,
  batchMax = 250_000_000
): CalculatorContextValue {
  return {
    state: {
      tierId: 'tier1',
      products: product ? [product] : [],
      currentProductId: product?.id ?? null,
      expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
      rates: { cnyPerRub: 12.5, usdPerCny: 7.2 },
      activeView: 'batch',
      batchMin,
      batchMax,
      revenue: 20_000_000,
    },
    dispatch: mockDispatch,
    currentProduct: product,
    calcOutput: null,
    allProductsCalc: new Map(),
  };
}

describe('BatchSimulation', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('无 currentProduct 显示空态', () => {
    mockContext = buildContext(null);
    render(<BatchSimulation />);
    expect(screen.getByText(/请先选择或添加商品/)).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('有 currentProduct + 默认范围渲染 BatchRangeControls + chart', () => {
    mockContext = buildContext(SAMPLE_PRODUCT, 0, 250_000_000);
    render(<BatchSimulation />);
    expect(screen.getByLabelText('销量下限')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-netProfit')).toBeInTheDocument();
    expect(screen.getByTestId('line-totalTax')).toBeInTheDocument();
  });

  it('min === max 显示销量范围无效空态（不渲染 chart）', () => {
    mockContext = buildContext(SAMPLE_PRODUCT, 100_000_000, 100_000_000);
    render(<BatchSimulation />);
    expect(screen.getByText(/销量范围无效/)).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('范围跨 4.5亿（tier3 → tier4）时渲染 ReferenceLine x=450_000_000', () => {
    mockContext = buildContext(SAMPLE_PRODUCT, 400_000_000, 500_000_000);
    render(<BatchSimulation />);
    const refs = screen.getAllByTestId('reference-line');
    const xs = refs.map((node) => Number(node.getAttribute('data-x')));
    expect(xs).toContain(450_000_000);
  });
});
