/**
 * 计算引擎 Hook - Observer 模式
 * 参数变更自动触发重算
 */

'use client';

import { useMemo } from 'react';
import { calculateTax } from '@/lib/calc/engine';
import type { CalcInput, CalcOutput } from '@/lib/calc/types';

export function useCalculation(input: CalcInput | null): CalcOutput | null {
  return useMemo(() => {
    if (!input) return null;
    return calculateTax(input);
  }, [input]);
}
