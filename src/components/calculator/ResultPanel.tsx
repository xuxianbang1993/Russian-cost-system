'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import type { ViewId } from '@/contexts/calculator/types';
import BatchSimulation from '@/components/calculator/BatchSimulation';
import CompareView from '@/components/calculator/CompareView';
import { DetailView } from '@/components/calculator/DetailView';
import { ViewTabs } from '@/components/calculator/ViewTabs';

function renderActiveView(view: ViewId) {
  if (view === 'compare') return <CompareView />;
  if (view === 'batch') return <BatchSimulation />;
  return <DetailView />;
}

export default function ResultPanel() {
  const { state } = useCalculatorContext();

  return (
    <section aria-label="计算结果" className="space-y-5">
      <ViewTabs />
      {renderActiveView(state.activeView)}
    </section>
  );
}
