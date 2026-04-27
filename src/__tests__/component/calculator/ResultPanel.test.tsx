import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: ({ children, dataKey }: { children?: React.ReactNode; dataKey: string }) => (
    <span data-testid={`bar-${dataKey}`}>{children}</span>
  ),
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

import ResultPanel from '@/components/calculator/ResultPanel';
import { CalculatorProvider } from '@/contexts/calculator';
import type { Product } from '@/lib/calc/types';

const SAMPLE_PRODUCT: Product = {
  id: 'p1',
  name: '测试商品',
  emoji: '📦',
  platformPrice: 1000,
  declaredCost: 6_000_000,
  purchaseCost: 100,
  volume: 0.01,
  weight: 1,
  dutyRate: 0.05,
  platformFeeRate: 0.27,
  shippingMethod: 'standard',
};

function renderWithProvider() {
  return render(
    <CalculatorProvider
      initialProducts={[SAMPLE_PRODUCT]}
      initialRates={{ cnyPerRub: 12.5, usdPerCny: 7.2 }}
    >
      <ResultPanel />
    </CalculatorProvider>
  );
}

describe('ResultPanel', () => {
  it('routes default activeView through CalculatorProvider to DetailView', () => {
    renderWithProvider();
    expect(screen.getByRole('region', { name: '计算结果' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '税制对比' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '关键指标' })).toHaveTextContent('利润率');
  });

  it('routes ViewTabs clicks through reducer to compare and batch views', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: '多品对比' }));
    expect(screen.getByText('CompareView - 待实现')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '税制对比' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '批量模拟' }));
    expect(screen.getByText('BatchSimulation - 待实现')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '单品详情' }));
    expect(screen.getByRole('region', { name: '税制对比' })).toBeInTheDocument();
  });
});
