'use client';

import { useMemo, useState } from 'react';

import { useCalculatorContext } from '@/contexts/calculator';
import {
  buildCompareRows,
  groupSortByRecommended,
  sortRows,
  type CompareSortDirection,
  type CompareSortKey,
  type CompareSortMode,
} from '@/lib/calc/compare';

import { CompareTable } from './CompareTable';
import { EmptyState } from './ui/EmptyState';

const MIN_PRODUCTS_FOR_COMPARE = 2;

function nextDirection(direction: CompareSortDirection): CompareSortDirection {
  if (direction === 'desc') return 'asc';
  if (direction === 'asc') return 'default';
  return 'desc';
}

export default function CompareView() {
  const { state, allProductsCalc, dispatch } = useCalculatorContext();
  const [sortKey, setSortKey] = useState<CompareSortKey>('usn6');
  const [direction, setDirection] = useState<CompareSortDirection>('desc');
  const [sortMode, setSortMode] = useState<CompareSortMode>('column');

  const rows = useMemo(
    () => buildCompareRows(state.products, allProductsCalc),
    [state.products, allProductsCalc]
  );

  const sortedRows = useMemo(() => {
    if (sortMode === 'group') {
      return groupSortByRecommended(rows, sortKey, direction);
    }
    return sortRows(rows, sortKey, direction);
  }, [rows, sortKey, direction, sortMode]);

  const handleSort = (key: CompareSortKey) => {
    setSortMode('column');
    if (sortKey !== key) {
      setSortKey(key);
      setDirection('desc');
      return;
    }
    setDirection(nextDirection(direction));
  };

  const handleGroupSort = () => {
    setSortMode((current) => (current === 'group' ? 'column' : 'group'));
  };

  const handleRowClick = (productId: string) => {
    dispatch({ type: 'SET_PRODUCT', productId });
    dispatch({ type: 'SET_VIEW', view: 'detail' });
  };

  if (rows.length < MIN_PRODUCTS_FOR_COMPARE) {
    const handleScrollToProductManager = () => {
      if (typeof document === 'undefined') return;
      const target = document.getElementById('product-manager');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    return (
      <EmptyState
        actionLabel="去添加"
        description="去商品库添加更多商品后查看跨商品税制对比"
        icon="📊"
        onAction={handleScrollToProductManager}
        title="多品对比需要至少 2 个商品"
      />
    );
  }

  return (
    <section aria-label="多品对比" className="space-y-4">
      <CompareTable
        direction={direction}
        onGroupSort={handleGroupSort}
        onRowClick={handleRowClick}
        onSort={handleSort}
        rows={sortedRows}
        sortKey={sortKey}
        sortMode={sortMode}
      />
    </section>
  );
}
