/**
 * DetailView 专用色彩与格式辅助
 *
 * - 利润率 ≥20% → success（绿）
 * - 利润率 < 0 / 净利润 < 0 → destructive（红）
 * - 其余 → foreground（默认）
 */

const SUCCESS_THRESHOLD = 0.2;

export function profitMarginColorClass(margin: number): string {
  if (margin < 0) return 'text-destructive';
  if (margin >= SUCCESS_THRESHOLD) return 'text-success';
  return 'text-foreground';
}

export function netProfitColorClass(value: number): string {
  return value < 0 ? 'text-destructive' : 'text-foreground';
}
