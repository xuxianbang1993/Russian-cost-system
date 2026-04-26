'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useCalculatorContext } from '@/contexts/calculator';
import { TAX_REGIMES } from '@/lib/calc/engine';
import type { TaxCalcResult, TaxRegimeId } from '@/lib/calc/types';
import { formatRUB } from '@/lib/utils';

export interface ChartRow {
  regime: TaxRegimeId;
  regimeLabel: string;
  customsVat: number;
  incomeTax: number;
  additionalVat: number;
  totalTax: number;
  netProfit: number;
  isRecommended: boolean;
}

const SEGMENT_LABELS = {
  customsVat: '海关增值税',
  incomeTax: '收入/利润税',
  additionalVat: '附加增值税',
} as const;

const SEGMENT_COLORS = {
  customsVat: 'var(--color-warning)',
  incomeTax: 'var(--color-primary)',
  additionalVat: 'var(--color-info)',
} as const;

export function buildChartData(
  results: TaxCalcResult[],
  recommended: TaxRegimeId
): ChartRow[] {
  return results.map((r) => ({
    regime: r.regime,
    regimeLabel:
      TAX_REGIMES[r.regime].name + (r.regime === recommended ? ' ⭐' : ''),
    customsVat: r.customsVat,
    incomeTax: r.incomeTax,
    additionalVat: r.additionalVat,
    totalTax: r.totalTax,
    netProfit: r.netProfit,
    isRecommended: r.regime === recommended,
  }));
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}

function ChartTooltip(props: ChartTooltipProps) {
  if (!props.active || !props.payload || props.payload.length === 0) return null;
  const row = props.payload[0]!.payload;
  return (
    <div className="min-w-[200px] rounded-[10px] border border-border bg-surface p-3 text-xs shadow-[var(--shadow-md)]">
      <p className="mb-2 font-semibold text-foreground">{row.regimeLabel}</p>
      <dl className="space-y-1">
        {(Object.keys(SEGMENT_LABELS) as Array<keyof typeof SEGMENT_LABELS>).map(
          (key) => (
            <div className="flex justify-between gap-4" key={key}>
              <dt className="text-tertiary">{SEGMENT_LABELS[key]}</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {formatRUB(row[key])}
              </dd>
            </div>
          )
        )}
        <div className="mt-2 flex justify-between gap-4 border-t border-border-light pt-2 font-semibold text-foreground">
          <dt>总税额</dt>
          <dd className="font-mono tabular-nums">{formatRUB(row.totalTax)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-foreground">
          <dt>净利润</dt>
          <dd className="font-mono tabular-nums">{formatRUB(row.netProfit)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function TaxComparisonChart() {
  const { calcOutput } = useCalculatorContext();
  if (!calcOutput || calcOutput.results.length === 0) return null;

  const chartData = buildChartData(calcOutput.results, calcOutput.recommended);

  return (
    <div
      aria-label="税制对比柱状图"
      className="h-[clamp(200px,30vw,240px)] w-full"
      data-testid="tax-comparison-chart"
      role="img"
    >
      <ResponsiveContainer height="100%" width="100%">
        <BarChart
          data={chartData}
          margin={{ top: 24, right: 16, bottom: 8, left: 16 }}
        >
          <CartesianGrid
            stroke="var(--color-border-light)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="regimeLabel"
            stroke="var(--color-tertiary)"
            tick={{ fontSize: 11 }}
          />
          <YAxis hide />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'var(--color-primary-muted)' }}
          />
          <Bar
            dataKey="customsVat"
            fill={SEGMENT_COLORS.customsVat}
            isAnimationActive={false}
            name={SEGMENT_LABELS.customsVat}
            stackId="a"
          />
          <Bar
            dataKey="incomeTax"
            fill={SEGMENT_COLORS.incomeTax}
            isAnimationActive={false}
            name={SEGMENT_LABELS.incomeTax}
            stackId="a"
          />
          <Bar
            dataKey="additionalVat"
            fill={SEGMENT_COLORS.additionalVat}
            isAnimationActive={false}
            name={SEGMENT_LABELS.additionalVat}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TaxComparisonChart;
