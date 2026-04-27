'use client';

import { useMemo } from 'react';

import { useCalculatorContext } from '@/contexts/calculator';
import { buildSamplePoints } from '@/lib/calc/sample';

import { BatchChart } from './BatchChart';
import { BatchRangeControls } from './BatchRangeControls';
import { EmptyState } from './ui/EmptyState';

export default function BatchSimulation() {
  const { state, currentProduct } = useCalculatorContext();

  const sample = useMemo(() => {
    if (!currentProduct) return null;
    return buildSamplePoints({
      product: currentProduct,
      expenses: state.expenses,
      rates: state.rates,
      min: state.batchMin,
      max: state.batchMax,
    });
  }, [
    currentProduct,
    state.expenses,
    state.rates,
    state.batchMin,
    state.batchMax,
  ]);

  if (!currentProduct) {
    return (
      <EmptyState
        description="商品选定后将自动展示销量曲线"
        icon="📈"
        title="请先选择或添加商品"
      />
    );
  }

  const errorMessage = (() => {
    if (sample === null || !('error' in sample)) return null;
    if (sample.error === 'min_eq_max') {
      return { title: '销量范围无效', description: '下限不能等于上限' };
    }
    return { title: '销量范围过小', description: '请扩大销量上下限至少 1000 卢布以生成曲线' };
  })();
  const points = sample !== null && !('error' in sample) ? sample : [];

  return (
    <section aria-label="批量销量模拟" className="space-y-4">
      <BatchRangeControls />
      {errorMessage ? (
        <EmptyState
          description={errorMessage.description}
          icon="⚠️"
          title={errorMessage.title}
        />
      ) : (
        <BatchChart points={points} />
      )}
    </section>
  );
}
