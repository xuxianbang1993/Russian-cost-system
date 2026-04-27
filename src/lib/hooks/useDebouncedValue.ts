'use client';

import { useEffect, useState } from 'react';

/**
 * 真时间维度 debounce：value 稳定 delay ms 后才更新返回值。
 * 频繁变化时 cleanup 清旧 timer，仅最后一次稳定的 value 生效。
 *
 * 注：不是 React 18 的 useDeferredValue（后者是优先级调度，无时间保证）。
 */
export function useDebouncedValue<T>(value: T, delay: number = 100): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
