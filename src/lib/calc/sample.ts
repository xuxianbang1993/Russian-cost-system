import { calculateTax, determineTier } from './engine';
import type {
  ExchangeRates,
  Expenses,
  Product,
  TaxRegimeId,
  TierId,
} from './types';

export interface SamplePoint {
  revenue: number;
  tier: TierId;
  recommended: TaxRegimeId;
  netProfit: number;
  totalTax: number;
  profitMargin: number;
}

export type SampleErrorCode = 'min_eq_max' | 'range_too_small';

export interface SampleError {
  error: SampleErrorCode;
}

export type SampleResult = SamplePoint[] | SampleError;

interface BuildSamplePointsArgs {
  product: Product;
  expenses: Expenses;
  rates: ExchangeRates;
  min: number;
  max: number;
}

const REVENUE_CEILING = 1_000_000_000;
const MIN_RANGE_SPAN = 1000;
const TIER_BOUNDARIES: readonly number[] = [20_000_000, 250_000_000, 450_000_000];
const UNIFORM_SAMPLE_COUNT = 20;
const MAX_TOTAL_POINTS = 50;

/**
 * BatchSimulation 的默认范围（PRD-07 §4.2）。
 * SET_TIER 不重置范围（B 决策；PRD-07 §6.2 作为保留输入的依据）。
 */
export function getDefaultBatchRange(tierId: TierId): { min: number; max: number } {
  switch (tierId) {
    case 'tier1':
      return { min: 0, max: 250_000_000 };
    case 'tier2':
      return { min: 0, max: 450_000_000 };
    case 'tier3':
      return { min: 250_000_000, max: REVENUE_CEILING };
    case 'tier4':
      return { min: 450_000_000, max: REVENUE_CEILING };
  }
}

function buildUniformRevenues(min: number, max: number): number[] {
  if (UNIFORM_SAMPLE_COUNT <= 1) return [min];
  const step = (max - min) / (UNIFORM_SAMPLE_COUNT - 1);
  const points: number[] = [];
  for (let i = 0; i < UNIFORM_SAMPLE_COUNT; i++) {
    points.push(Math.round(min + step * i));
  }
  return points;
}

function appendBoundaryPoints(revenues: number[], min: number, max: number): number[] {
  const merged = [...revenues];
  for (const boundary of TIER_BOUNDARIES) {
    if (boundary >= min && boundary <= max) {
      merged.push(boundary);
    }
    const plusOne = boundary + 1;
    if (plusOne >= min && plusOne <= max) {
      merged.push(plusOne);
    }
  }
  return merged;
}

function dedupeAndSort(revenues: number[]): number[] {
  return Array.from(new Set(revenues)).sort((a, b) => a - b);
}

export function buildSamplePoints(args: BuildSamplePointsArgs): SampleResult {
  const { product, expenses, rates, min, max } = args;

  if (min === max) return { error: 'min_eq_max' };

  const clampedMax = Math.min(max, REVENUE_CEILING);

  if (clampedMax - min < MIN_RANGE_SPAN) return { error: 'range_too_small' };

  const uniform = buildUniformRevenues(min, clampedMax);
  const withBoundaries = appendBoundaryPoints(uniform, min, clampedMax);
  const sorted = dedupeAndSort(withBoundaries).slice(0, MAX_TOTAL_POINTS);

  const points: SamplePoint[] = [];
  for (const revenue of sorted) {
    try {
      const tier = determineTier(revenue);
      const calcOutput = calculateTax({
        product,
        tier: tier.id,
        revenue,
        expenses,
        rates,
      });
      const recommended = calcOutput.results.find(
        (result) => result.regime === calcOutput.recommended
      );
      if (!recommended) continue;
      points.push({
        revenue,
        tier: tier.id,
        recommended: calcOutput.recommended,
        netProfit: recommended.netProfit,
        totalTax: recommended.totalTax,
        profitMargin: recommended.profitMargin,
      });
    } catch (error) {
      console.warn(`[sample] skip revenue=${revenue}`, error);
    }
  }

  return points;
}
