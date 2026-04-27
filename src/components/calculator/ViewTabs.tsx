'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import type { ViewId } from '@/contexts/calculator/types';
import { cn } from '@/lib/utils';

interface TabDef {
  id: ViewId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'detail', label: '单品详情' },
  { id: 'compare', label: '多品对比' },
  { id: 'batch', label: '批量模拟' },
];

export function ViewTabs() {
  const { state, dispatch } = useCalculatorContext();

  return (
    <div aria-label="结果视图切换" className="flex flex-wrap gap-2" role="group">
      {TABS.map((tab) => {
        const isActive = state.activeView === tab.id;
        return (
          <button
            aria-label={tab.label}
            aria-pressed={isActive}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium',
              isActive
                ? 'border-primary bg-primary text-white shadow-[var(--shadow-sm)]'
                : 'border-border bg-surface text-tertiary hover:border-primary hover:text-primary'
            )}
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_VIEW', view: tab.id })}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default ViewTabs;
