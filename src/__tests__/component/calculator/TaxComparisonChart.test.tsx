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

import {
  TaxComparisonChart,
  buildChartData,
} from '@/components/calculator/TaxComparisonChart';
import { REVENUE_TIERS } from '@/lib/calc/engine';
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
  });
});
