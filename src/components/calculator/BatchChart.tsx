'use client';

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { TAX_REGIMES } from '@/lib/calc/engine';
import type { SamplePoint } from '@/lib/calc/sample';
import { formatPercent, formatRUB } from '@/lib/utils';

interface BatchChartProps {
  points: SamplePoint[];
}

interface BoundaryLine {
  x: number;
  label: string;
  stroke: string;
}

const BOUNDARY_LINES: readonly BoundaryLine[] = [
  { x: 20_000_000, label: 'tier1 → tier2', stroke: 'var(--color-tertiary)' },
  { x: 250_000_000, label: 'tier2 → tier3', stroke: 'var(--color-tertiary)' },
  { x: 450_000_000, label: '→ OSNO 强制', stroke: 'var(--color-destructive)' },
];

const NET_PROFIT_COLOR = 'var(--color-success)';
const TOTAL_TAX_COLOR = 'var(--color-destructive)';
const CHART_INITIAL_DIMENSION = { width: 1, height: 200 };

interface BatchTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SamplePoint }>;
}

export function BatchTooltip(props: BatchTooltipProps) {
  if (!props.active || !props.payload || props.payload.length === 0) return null;
  const point = props.payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="min-w-[200px] rounded-[10px] border border-border bg-surface p-3 text-xs shadow-[var(--shadow-md)]">
      <p className="mb-2 font-semibold text-foreground">
        营业额 {formatRUB(point.revenue)}
      </p>
      <dl className="space-y-1">
        <div className="flex justify-between gap-4">
          <dt className="text-tertiary">推荐税制</dt>
          <dd className="text-foreground">{TAX_REGIMES[point.recommended].name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-tertiary">净利润</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {formatRUB(point.netProfit)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-tertiary">总税额</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {formatRUB(point.totalTax)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-tertiary">利润率</dt>
          <dd className="font-mono tabular-nums text-foreground">
            {formatPercent(point.profitMargin, 2)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function BatchChart({ points }: BatchChartProps) {
  const [shouldAnimate, setShouldAnimate] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShouldAnimate(false), 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (points.length === 0) return null;

  const minX = points[0].revenue;
  const maxX = points[points.length - 1].revenue;
  const visibleBoundaries = BOUNDARY_LINES.filter(
    (boundary) => boundary.x >= minX && boundary.x <= maxX
  );

  return (
    <div
      aria-label="批量销量模拟曲线"
      className="h-[clamp(240px,32vw,320px)] min-w-[320px] w-full"
      data-testid="batch-chart"
      role="img"
    >
      <ResponsiveContainer
        height="100%"
        initialDimension={CHART_INITIAL_DIMENSION}
        minWidth={0}
        width="100%"
      >
        <LineChart data={points} margin={{ top: 24, right: 16, bottom: 8, left: 16 }}>
          <CartesianGrid
            stroke="var(--color-border-light)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="revenue"
            stroke="var(--color-tertiary)"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatRUB(value)}
          />
          <YAxis
            stroke="var(--color-tertiary)"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatRUB(value)}
          />
          <Tooltip content={<BatchTooltip />} cursor={{ stroke: 'var(--color-primary-muted)' }} />
          {visibleBoundaries.map((boundary) => (
            <ReferenceLine
              key={boundary.x}
              label={{
                value: boundary.label,
                position: 'top',
                fontSize: 10,
                fill: boundary.stroke,
              }}
              stroke={boundary.stroke}
              strokeDasharray="3 3"
              x={boundary.x}
            />
          ))}
          <Line
            dataKey="netProfit"
            isAnimationActive={shouldAnimate}
            name="净利润"
            stroke={NET_PROFIT_COLOR}
            type="monotone"
          />
          <Line
            dataKey="totalTax"
            isAnimationActive={shouldAnimate}
            name="总税额"
            stroke={TOTAL_TAX_COLOR}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BatchChart;
