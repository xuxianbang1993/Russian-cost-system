import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('100ms 后稳定到新 value', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 'a' } }
    );

    expect(result.current).toBe('a');

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('b');
  });

  it('频繁切换时 cleanup 清旧 timer：仅最后一次稳定值生效', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 1 } }
    );

    rerender({ value: 2 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    rerender({ value: 3 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    // 总共已过 100ms，但每次 rerender 重置 timer，所以 still 1
    expect(result.current).toBe(1);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    // 自最后一次 rerender 起 100ms → 稳定到 3
    expect(result.current).toBe(3);
  });

  it('value 不变时返回稳定值（参考保持）', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 'x' } }
    );

    rerender({ value: 'x' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('x');
  });
});
