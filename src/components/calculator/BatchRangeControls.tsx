'use client';

import { useEffect, useRef, useState } from 'react';

import { useCalculatorContext } from '@/contexts/calculator';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { formatRUB } from '@/lib/utils';

const REVENUE_MIN = 0;
const REVENUE_MAX = 1_000_000_000;
const SLIDER_STEP = 1_000_000;
const DEBOUNCE_MS = 100;

export function BatchRangeControls() {
  const { state, dispatch } = useCalculatorContext();

  const [draftMin, setDraftMin] = useState<number>(state.batchMin);
  const [draftMax, setDraftMax] = useState<number>(state.batchMax);

  const stableMin = useDebouncedValue(draftMin, DEBOUNCE_MS);
  const stableMax = useDebouncedValue(draftMax, DEBOUNCE_MS);

  const lastCommittedRef = useRef({ min: state.batchMin, max: state.batchMax });

  useEffect(() => {
    if (
      stableMin === lastCommittedRef.current.min &&
      stableMax === lastCommittedRef.current.max
    ) {
      return;
    }
    // 不本地校验合法性：sample.ts 处理 min_eq_max / range_too_small，BatchSimulation 显示对应空态
    lastCommittedRef.current = { min: stableMin, max: stableMax };
    dispatch({ type: 'SET_BATCH_RANGE', min: stableMin, max: stableMax });
  }, [stableMin, stableMax, dispatch]);

  useEffect(() => {
    if (
      state.batchMin === lastCommittedRef.current.min &&
      state.batchMax === lastCommittedRef.current.max
    ) {
      return;
    }
    // 外部 committed props 变化时 sync 进 draft（v4 修正：基于 committed 值，不绑特定 action）
    lastCommittedRef.current = { min: state.batchMin, max: state.batchMax };
    /* eslint-disable react-hooks/set-state-in-effect -- 合法 sync external props 用法 */
    setDraftMin(state.batchMin);
    setDraftMax(state.batchMax);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state.batchMin, state.batchMax]);

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-tertiary">下限</span>
          <input
            aria-label="销量下限"
            className="rounded-md border border-border bg-background px-2 py-1 font-mono tabular-nums text-sm"
            max={REVENUE_MAX}
            min={REVENUE_MIN}
            onChange={(event) => setDraftMin(Number(event.target.value))}
            type="number"
            value={draftMin}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-tertiary">上限</span>
          <input
            aria-label="销量上限"
            className="rounded-md border border-border bg-background px-2 py-1 font-mono tabular-nums text-sm"
            max={REVENUE_MAX}
            min={REVENUE_MIN}
            onChange={(event) => setDraftMax(Number(event.target.value))}
            type="number"
            value={draftMax}
          />
        </label>
      </div>

      <div className="space-y-2">
        <input
          aria-label="销量下限滑块"
          className="w-full"
          max={REVENUE_MAX}
          min={REVENUE_MIN}
          onChange={(event) => setDraftMin(Number(event.target.value))}
          step={SLIDER_STEP}
          type="range"
          value={draftMin}
        />
        <input
          aria-label="销量上限滑块"
          className="w-full"
          max={REVENUE_MAX}
          min={REVENUE_MIN}
          onChange={(event) => setDraftMax(Number(event.target.value))}
          step={SLIDER_STEP}
          type="range"
          value={draftMax}
        />
      </div>

      <p className="font-mono tabular-nums text-xs text-tertiary">
        {formatRUB(draftMin)} – {formatRUB(draftMax)}
      </p>
    </div>
  );
}

export default BatchRangeControls;
