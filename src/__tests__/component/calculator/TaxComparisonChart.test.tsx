import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({
    children,
    initialDimension,
    minWidth,
  }: {
    children: React.ReactNode;
    initialDimension?: { width: number; height: number };
    minWidth?: number | string;
  }) => (
    <div
      data-initial-height={initialDimension?.height}
      data-initial-width={initialDimension?.width}
      data-min-width={minWidth}
      data-testid="responsive-container"
    >
      {children}
    </div>
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
  Bar: ({
    children,
    dataKey,
    fill,
    isAnimationActive,
  }: {
    children?: React.ReactNode;
    dataKey: string;
    fill: string;
    isAnimationActive?: boolean;
  }) => (
    <span
      data-animation-active={String(isAnimationActive)}
      data-fill={fill}
      data-testid={`bar-${dataKey}`}
    >
      {children}
    </span>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: ({ stroke, strokeWidth }: { stroke?: string; strokeWidth?: number }) => (
    <i data-stroke={stroke} data-stroke-width={strokeWidth} data-testid="bar-cell" />
  ),
}));

import {
  ChartTooltip,
  TaxComparisonChart,
  buildChartData,
} from '@/components/calculator/TaxComparisonChart';
import { REVENUE_TIERS } from '@/lib/calc/engine';
import { formatRUB } from '@/lib/utils';
import type { CalculatorContextValue } from '@/contexts/calculator/types';
import type {
  CalcOutput,
  TaxCalcResult,
  TaxRegimeId,
} from '@/lib/calc/types';

let mockContext: CalculatorContextValue;

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

function buildResult(
  regime: TaxRegimeId,
  partial: Partial<TaxCalcResult> = {}
): TaxCalcResult {
  return {
    regime,
    customsVat: 0,
    incomeTax: 0,
    additionalVat: 0,
    totalTax: 0,
    taxRate: 0,
    netProfit: 0,
    profitMargin: 0,
    ...partial,
  };
}

function buildContext(calcOutput: CalcOutput | null): CalculatorContextValue {
  return {
    state: {
      tierId: 'tier1',
      products: [],
      currentProductId: null,
      expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
      rates: { cnyPerRub: 0, usdPerCny: 0 },
      activeView: 'detail',
      batchQuantity: 1,
      revenue: 20_000_000,
    },
    dispatch: vi.fn(),
    currentProduct: null,
    calcOutput,
    allProductsCalc: new Map(),
  };
}

describe('TaxComparisonChart', () => {
  beforeEach(() => {
    mockContext = buildContext(null);
  });

  describe('buildChartData (pure)', () => {
    it('builds rows with customsVat / incomeTax / additionalVat from results', () => {
      const rows = buildChartData(
        [
          buildResult('usn6', {
            customsVat: 1_320_000,
            incomeTax: 1_200_000,
            additionalVat: 0,
            totalTax: 2_520_000,
            netProfit: 7_400_000,
          }),
          buildResult('usn15', {
            customsVat: 1_320_000,
            incomeTax: 1_800_000,
            additionalVat: 0,
            totalTax: 3_120_000,
            netProfit: 6_800_000,
          }),
        ],
        'usn6'
      );
      expect(rows).toHaveLength(2);
      expect(rows[0]?.customsVat).toBe(1_320_000);
      expect(rows[0]?.incomeTax).toBe(1_200_000);
      expect(rows[1]?.totalTax).toBe(3_120_000);
    });

    it('marks recommended regime with isRecommended=true and ⭐ in label', () => {
      const rows = buildChartData(
        [buildResult('usn6'), buildResult('usn15')],
        'usn15'
      );
      expect(rows[0]?.isRecommended).toBe(false);
      expect(rows[1]?.isRecommended).toBe(true);
      expect(rows[1]?.regimeLabel).toContain('⭐');
      expect(rows[0]?.regimeLabel).not.toContain('⭐');
    });

    it('returns single row for tier4 (only OSNO)', () => {
      const rows = buildChartData([buildResult('osno')], 'osno');
      expect(rows).toHaveLength(1);
      expect(rows[0]?.regime).toBe('osno');
    });
  });

  describe('rendering', () => {
    it('returns null when no calcOutput', () => {
      const { container } = render(<TaxComparisonChart />);
      expect(container.firstChild).toBeNull();
    });

    it('renders 2 rows when tier1 (USN-6 + USN-15)', () => {
      mockContext = buildContext({
        tier: REVENUE_TIERS[0]!,
        results: [buildResult('usn6'), buildResult('usn15')],
        recommended: 'usn6',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      render(<TaxComparisonChart />);
      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-rowcount', '2');
    });

    it('renders 1 row when tier4 (only OSNO)', () => {
      mockContext = buildContext({
        tier: REVENUE_TIERS[3]!,
        results: [buildResult('osno')],
        recommended: 'osno',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      render(<TaxComparisonChart />);
      expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-rowcount', '1');
    });

    it('passes role="img" with aria-label for accessibility', () => {
      mockContext = buildContext({
        tier: REVENUE_TIERS[0]!,
        results: [buildResult('usn6'), buildResult('usn15')],
        recommended: 'usn6',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      render(<TaxComparisonChart />);
      const root = screen.getByRole('img', { name: '税制对比柱状图' });
      expect(root).toBeInTheDocument();
    });

    it('uses CSS color tokens via fill="var(--color-warning|primary|info)"', () => {
      mockContext = buildContext({
        tier: REVENUE_TIERS[0]!,
        results: [buildResult('usn6'), buildResult('usn15')],
        recommended: 'usn6',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      render(<TaxComparisonChart />);
      expect(screen.getByTestId('bar-customsVat')).toHaveAttribute(
        'data-fill',
        'var(--color-warning)'
      );
      expect(screen.getByTestId('bar-incomeTax')).toHaveAttribute(
        'data-fill',
        'var(--color-primary)'
      );
      expect(screen.getByTestId('bar-additionalVat')).toHaveAttribute(
        'data-fill',
        'var(--color-info)'
      );
    });

    it('sets stable ResponsiveContainer initial dimensions to avoid -1 size warning', () => {
      mockContext = buildContext({
        tier: REVENUE_TIERS[0]!,
        results: [buildResult('usn6'), buildResult('usn15')],
        recommended: 'usn6',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      render(<TaxComparisonChart />);
      expect(screen.getByTestId('responsive-container')).toHaveAttribute(
        'data-min-width',
        '0'
      );
      expect(screen.getByTestId('responsive-container')).toHaveAttribute(
        'data-initial-width',
        '1'
      );
      expect(screen.getByTestId('responsive-container')).toHaveAttribute(
        'data-initial-height',
        '200'
      );
    });

    it('keeps initial chart animation but disables it after data changes', () => {
      vi.useFakeTimers();
      mockContext = buildContext({
        tier: REVENUE_TIERS[0]!,
        results: [buildResult('usn6'), buildResult('usn15')],
        recommended: 'usn6',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      const { rerender } = render(<TaxComparisonChart />);
      expect(screen.getByTestId('bar-customsVat')).toHaveAttribute(
        'data-animation-active',
        'true'
      );
      act(() => {
        vi.runAllTimers();
      });

      mockContext = buildContext({
        tier: REVENUE_TIERS[0]!,
        results: [
          buildResult('usn6', { totalTax: 2_520_000 }),
          buildResult('usn15', { totalTax: 3_120_000 }),
        ],
        recommended: 'usn6',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      rerender(<TaxComparisonChart />);
      expect(screen.getByTestId('bar-customsVat')).toHaveAttribute(
        'data-animation-active',
        'false'
      );
      vi.useRealTimers();
    });

    it('adds success stroke cells for recommended bar segments only', () => {
      mockContext = buildContext({
        tier: REVENUE_TIERS[0]!,
        results: [buildResult('usn6'), buildResult('usn15')],
        recommended: 'usn15',
        headShipping: 0,
        platformFee: 0,
        totalExpenses: 0,
      });
      render(<TaxComparisonChart />);
      const strokedCells = screen
        .getAllByTestId('bar-cell')
        .filter((cell) => cell.getAttribute('data-stroke') === 'var(--color-success)');
      expect(strokedCells).toHaveLength(3);
      for (const cell of strokedCells) {
        expect(cell).toHaveAttribute('data-stroke-width', '2');
      }
    });
  });

  describe('ChartTooltip', () => {
    it('renders tax segment numbers, total tax, and net profit from the hovered chart row', () => {
      const row = buildChartData(
        [
          buildResult('usn6', {
            customsVat: 1_320_000,
            incomeTax: 1_200_000,
            additionalVat: 0,
            totalTax: 2_520_000,
            netProfit: 17_480_000,
          }),
        ],
        'usn6'
      )[0]!;

      render(<ChartTooltip active payload={[{ payload: row }]} />);

      expect(screen.getByText(row.regimeLabel)).toBeInTheDocument();
      expect(screen.getByText((_, element) => element?.textContent === formatRUB(row.customsVat)))
        .toBeInTheDocument();
      expect(screen.getByText((_, element) => element?.textContent === formatRUB(row.incomeTax)))
        .toBeInTheDocument();
      expect(
        screen.getByText((_, element) => element?.textContent === formatRUB(row.additionalVat))
      ).toBeInTheDocument();
      expect(screen.getByText((_, element) => element?.textContent === formatRUB(row.totalTax)))
        .toBeInTheDocument();
      expect(screen.getByText((_, element) => element?.textContent === formatRUB(row.netProfit)))
        .toBeInTheDocument();
    });

    it('returns null when inactive or payload is empty', () => {
      const { container } = render(<ChartTooltip active={false} payload={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
