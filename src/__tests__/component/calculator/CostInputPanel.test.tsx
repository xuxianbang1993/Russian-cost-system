import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CostInputPanel } from '@/components/calculator/CostInputPanel';
import type { CalculatorContextValue } from '@/contexts/calculator/types';
import type { Product } from '@/lib/calc/types';

const mockDispatch = vi.fn();

const mockProduct: Product = {
  id: 'p1',
  name: 'Test Product',
  emoji: '📦',
  platformPrice: 5000,
  declaredCost: 3000,
  purchaseCost: 200,
  volume: 0.01,
  weight: 0.5,
  dutyRate: 0.05,
  platformFeeRate: 0.27,
  shippingMethod: 'standard',
};

let mockContext: CalculatorContextValue;

function createContext(product: Product | null): CalculatorContextValue {
  return {
    state: {
      tierId: 'tier1',
      products: product ? [product] : [],
      currentProductId: product?.id ?? null,
      expenses: {
        procurement: 0,
        logistics: 0,
        commission: 0,
        advertising: 0,
        labor: 0,
      },
      rates: { cnyPerRub: 11.5, usdPerCny: 7.12 },
      activeView: 'detail',
      batchMin: 0,
      batchMax: 250_000_000,
      revenue: 20_000_000,
    },
    dispatch: mockDispatch,
    currentProduct: product,
    calcOutput: null,
    allProductsCalc: new Map(),
  };
}

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

describe('CostInputPanel', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockContext = createContext(mockProduct);
  });

  it('renders revenue input', () => {
    render(<CostInputPanel />);
    expect(screen.getByLabelText(/年度营业额/i)).toBeInTheDocument();
  });

  it('renders all 5 expense fields', () => {
    render(<CostInputPanel />);
    expect(screen.getByLabelText(/进货成本/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/物流费/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/平台佣金/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/广告费/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/人工成本/i)).toBeInTheDocument();
  });

  it('dispatches SET_REVENUE on revenue change', async () => {
    const user = userEvent.setup();
    render(<CostInputPanel />);
    const input = screen.getByLabelText(/年度营业额/i);

    await user.clear(input);
    await user.type(input, '50000000');

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_REVENUE' })
    );
  });

  it('dispatches SET_EXPENSES on expense field change', async () => {
    const user = userEvent.setup();
    render(<CostInputPanel />);
    const input = screen.getByLabelText(/进货成本/i);

    await user.clear(input);
    await user.type(input, '1000000');

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_EXPENSES' })
    );
  });

  it('shows product core params when product is selected', () => {
    render(<CostInputPanel />);
    expect(screen.getByLabelText(/商品售价/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/采购成本/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/申报成本/i)).toBeInTheDocument();
  });

  it('shows empty state when no product selected', () => {
    mockContext = createContext(null);
    render(<CostInputPanel />);
    expect(screen.getByText(/请先选择商品/i)).toBeInTheDocument();
  });
});
