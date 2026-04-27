import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { KpiCards } from '@/components/calculator/KpiCards';
import { REVENUE_TIERS } from '@/lib/calc/engine';
import type { CalculatorContextValue } from '@/contexts/calculator/types';
import type { CalcOutput, TaxCalcResult, TaxRegimeId } from '@/lib/calc/types';

let mockContext: CalculatorContextValue;

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

function buildResult(regime: TaxRegimeId, partial: Partial<TaxCalcResult> = {}): TaxCalcResult {
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
      batchMin: 0,
      batchMax: 250_000_000,
      revenue: 20_000_000,
    },
    dispatch: vi.fn(),
    currentProduct: null,
    calcOutput,
    allProductsCalc: new Map(),
  };
}

describe('KpiCards', () => {
  beforeEach(() => {
    mockContext = buildContext(null);
  });

  it('returns null when no calcOutput', () => {
    const { container } = render(<KpiCards />);
    expect(container.firstChild).toBeNull();
  });

  it('renders 3 cards labelled 利润率 / 总税额 / 净利润', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [
        buildResult('usn6', { profitMargin: 0.37, totalTax: 2_520_000, netProfit: 7_400_000 }),
        buildResult('usn15', { profitMargin: 0.34, totalTax: 3_120_000, netProfit: 6_800_000 }),
      ],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<KpiCards />);
    expect(screen.getByText('利润率')).toBeInTheDocument();
    expect(screen.getByText('总税额')).toBeInTheDocument();
    expect(screen.getByText('净利润')).toBeInTheDocument();
  });

  it('reads values from recommended regime, not first regime', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [
        buildResult('usn6', { profitMargin: 0.05 }),
        buildResult('usn15', { profitMargin: 0.4 }),
      ],
      recommended: 'usn15',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<KpiCards />);
    expect(screen.getByText('40.00%')).toBeInTheDocument();
  });

  it('applies text-success when profitMargin >= 0.20', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6', { profitMargin: 0.32 })],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<KpiCards />);
    expect(screen.getByText('32.00%')).toHaveClass('text-success');
  });

  it('applies text-destructive when profitMargin < 0', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6', { profitMargin: -0.1, netProfit: -500_000 })],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<KpiCards />);
    expect(screen.getByText('-10.00%')).toHaveClass('text-destructive');
  });

  it('renders OSNO values only when tier4 (single regime)', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[3]!,
      results: [
        buildResult('osno', { profitMargin: 0.02, totalTax: 18_704_918, netProfit: 1_295_082 }),
      ],
      recommended: 'osno',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<KpiCards />);
    expect(screen.getByText('2.00%')).toBeInTheDocument();
  });

  it('uses font-mono on numeric values', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6', { profitMargin: 0.37 })],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<KpiCards />);
    expect(screen.getByText('37.00%')).toHaveClass('font-mono');
  });
});
