import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BatchRangeControls } from '@/components/calculator/BatchRangeControls';
import type { CalculatorContextValue } from '@/contexts/calculator/types';

let mockContext: CalculatorContextValue;
const mockDispatch = vi.fn();

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

function buildContext(batchMin = 0, batchMax = 250_000_000): CalculatorContextValue {
  return {
    state: {
      tierId: 'tier1',
      products: [],
      currentProductId: null,
      expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
      rates: { cnyPerRub: 12.5, usdPerCny: 7.2 },
      activeView: 'batch',
      batchMin,
      batchMax,
      revenue: 20_000_000,
    },
    dispatch: mockDispatch,
    currentProduct: null,
    calcOutput: null,
    allProductsCalc: new Map(),
  };
}

describe('BatchRangeControls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockDispatch.mockClear();
    mockContext = buildContext();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('拖动数字输入即时反馈到 input value（不延迟）', () => {
    render(<BatchRangeControls />);
    const minInput = screen.getByLabelText('销量下限') as HTMLInputElement;

    fireEvent.change(minInput, { target: { value: '50000000' } });
    expect(minInput.value).toBe('50000000');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('100ms 后才 dispatch SET_BATCH_RANGE', () => {
    render(<BatchRangeControls />);
    const minInput = screen.getByLabelText('销量下限');

    fireEvent.change(minInput, { target: { value: '50000000' } });
    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(mockDispatch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_BATCH_RANGE',
      min: 50_000_000,
      max: 250_000_000,
    });
  });

  it('用户输入 min === max 仍 dispatch（让 sample.ts 处理 min_eq_max 错误）', () => {
    render(<BatchRangeControls />);
    const minInput = screen.getByLabelText('销量下限');

    fireEvent.change(minInput, { target: { value: '250000000' } });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_BATCH_RANGE',
      min: 250_000_000,
      max: 250_000_000,
    });
  });

  it('外部 props 变化时 sync 回 draft（committed 值变化触发 sync）', () => {
    const { rerender } = render(<BatchRangeControls />);
    const minInput = screen.getByLabelText('销量下限') as HTMLInputElement;
    const maxInput = screen.getByLabelText('销量上限') as HTMLInputElement;
    expect(minInput.value).toBe('0');
    expect(maxInput.value).toBe('250000000');

    mockContext = buildContext(100_000_000, 800_000_000);
    rerender(<BatchRangeControls />);

    expect(minInput.value).toBe('100000000');
    expect(maxInput.value).toBe('800000000');
  });
});
