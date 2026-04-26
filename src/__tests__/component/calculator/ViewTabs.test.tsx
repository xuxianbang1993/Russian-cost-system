import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ViewTabs } from '@/components/calculator/ViewTabs';
import type {
  CalculatorContextValue,
  ViewId,
} from '@/contexts/calculator/types';

const mockDispatch = vi.fn();
let mockContext: CalculatorContextValue;

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

function buildContext(activeView: ViewId): CalculatorContextValue {
  return {
    state: {
      tierId: 'tier1',
      products: [],
      currentProductId: null,
      expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
      rates: { cnyPerRub: 0, usdPerCny: 0 },
      activeView,
      batchQuantity: 1,
      revenue: 20_000_000,
    },
    dispatch: mockDispatch,
    currentProduct: null,
    calcOutput: null,
    allProductsCalc: new Map(),
  };
}

describe('ViewTabs', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockContext = buildContext('detail');
  });

  it('renders 3 tab buttons: 单品详情 / 多品对比 / 批量模拟', () => {
    render(<ViewTabs />);
    expect(screen.getByRole('button', { name: '单品详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '多品对比' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量模拟' })).toBeInTheDocument();
  });

  it('marks the active tab with aria-pressed="true" based on state.activeView', () => {
    mockContext = buildContext('compare');
    render(<ViewTabs />);
    expect(screen.getByRole('button', { name: '多品对比' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: '单品详情' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('dispatches SET_VIEW compare when 多品对比 clicked', async () => {
    const user = userEvent.setup();
    render(<ViewTabs />);
    await user.click(screen.getByRole('button', { name: '多品对比' }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_VIEW', view: 'compare' });
  });

  it('dispatches SET_VIEW batch when 批量模拟 clicked', async () => {
    const user = userEvent.setup();
    render(<ViewTabs />);
    await user.click(screen.getByRole('button', { name: '批量模拟' }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_VIEW', view: 'batch' });
  });

  it('dispatches SET_VIEW detail when 单品详情 clicked', async () => {
    mockContext = buildContext('compare');
    const user = userEvent.setup();
    render(<ViewTabs />);
    await user.click(screen.getByRole('button', { name: '单品详情' }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_VIEW', view: 'detail' });
  });
});
