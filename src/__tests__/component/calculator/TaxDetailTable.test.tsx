import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { TaxDetailTable } from '@/components/calculator/TaxDetailTable';
import { REVENUE_TIERS } from '@/lib/calc/engine';
import { formatPercent, formatRUB } from '@/lib/utils';
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

describe('TaxDetailTable', () => {
  beforeEach(() => {
    mockContext = buildContext(null);
  });

  it('returns null when no calcOutput', () => {
    const { container } = render(<TaxDetailTable />);
    expect(container.firstChild).toBeNull();
  });

  it('renders header columns: 税种 + USN-6% + USN-15% (tier1-3)', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6'), buildResult('usn15')],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const cols = screen.getAllByRole('columnheader');
    expect(cols).toHaveLength(3);
    expect(cols[0]).toHaveTextContent('税种');
    expect(cols[1]).toHaveTextContent('简易税制 6%');
    expect(cols[2]).toHaveTextContent('简易税制 15%');
  });

  it('renders header column 一般税制 (OSNO) only when tier4', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[3]!,
      results: [buildResult('osno')],
      recommended: 'osno',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const cols = screen.getAllByRole('columnheader');
    expect(cols).toHaveLength(2);
    expect(cols[1]).toHaveTextContent('一般税制');
  });

  it('renders PRD-05 body rows: tax segments / total tax / rates / profit values', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6'), buildResult('usn15')],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    expect(screen.getByRole('rowheader', { name: '海关增值税' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '收入/利润/所得税' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '附加增值税' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '总税' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '税负率' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '净利润' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '利润率' })).toBeInTheDocument();
  });

  it('marks recommended regime column header with bg-success-light + ⭐ prefix', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6'), buildResult('usn15')],
      recommended: 'usn15',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const usn15Header = screen.getByRole('columnheader', { name: /简易税制 15%/ });
    expect(usn15Header).toHaveClass('bg-success-light');
    expect(usn15Header.textContent).toContain('⭐');
  });

  it('renders 总税 row with font-bold class on label and cells', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6', { totalTax: 2_520_000 })],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const totalRowHeader = screen.getByRole('rowheader', { name: '总税' });
    expect(totalRowHeader).toHaveClass('font-bold');
    const totalRow = totalRowHeader.closest('tr')!;
    const totalCell = within(totalRow).getAllByRole('cell')[0];
    expect(totalCell).toHaveClass('font-bold');
  });

  it('shows formatted currency 0 for additionalVat at tier1 (no additional VAT)', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6', { additionalVat: 0 })],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const additionalRow = screen.getByRole('rowheader', { name: '附加增值税' }).closest('tr')!;
    const cells = within(additionalRow).getAllByRole('cell');
    expect(cells[0].textContent).toMatch(/0/);
  });

  it('uses font-mono on number cells', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [buildResult('usn6', { customsVat: 1_320_000 })],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const customsRow = screen.getByRole('rowheader', { name: '海关增值税' }).closest('tr')!;
    const customsCell = within(customsRow).getAllByRole('cell')[0];
    expect(customsCell).toHaveClass('font-mono');
  });

  it('renders taxRate, netProfit, and profitMargin using PRD precision', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [
        buildResult('usn6', {
          taxRate: 0.126,
          netProfit: 17_480_000,
          profitMargin: 0.874,
        }),
      ],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const taxRateRow = screen.getByRole('rowheader', { name: '税负率' }).closest('tr')!;
    const netProfitRow = screen.getByRole('rowheader', { name: '净利润' }).closest('tr')!;
    const profitMarginRow = screen.getByRole('rowheader', { name: '利润率' }).closest('tr')!;

    expect(within(taxRateRow).getAllByRole('cell')[0]).toHaveTextContent(
      formatPercent(0.126)
    );
    expect(within(netProfitRow).getAllByRole('cell')[0]?.textContent).toBe(
      formatRUB(17_480_000)
    );
    expect(within(profitMarginRow).getAllByRole('cell')[0]).toHaveTextContent(
      formatPercent(0.874)
    );
  });

  it('renders 总税 as the displayed sum of the three tax segment rows within ±0.01', () => {
    mockContext = buildContext({
      tier: REVENUE_TIERS[0]!,
      results: [
        buildResult('usn6', {
          customsVat: 1_320_000.12,
          incomeTax: 1_200_000.23,
          additionalVat: 0.34,
          totalTax: 999,
        }),
      ],
      recommended: 'usn6',
      headShipping: 0,
      platformFee: 0,
      totalExpenses: 0,
    });
    render(<TaxDetailTable />);
    const totalRow = screen.getByRole('rowheader', { name: '总税' }).closest('tr')!;
    const displayedTotal = within(totalRow).getAllByRole('cell')[0];
    const expectedTotal = 1_320_000.12 + 1_200_000.23 + 0.34;
    expect(displayedTotal?.textContent).toBe(formatRUB(expectedTotal));
  });
});
