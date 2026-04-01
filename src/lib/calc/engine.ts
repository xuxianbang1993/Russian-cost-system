/**
 * 核心计算引擎 - 策略模式
 *
 * 基于《税制解说（内部版）》实现
 * 每种税制为独立策略，通过 calculateTax() 统一调度
 */

import type {
  TaxRegimeId,
  RevenueTier,
  CalcInput,
  TaxCalcResult,
  CalcOutput,
  Expenses,
} from './types';

// ── 常量配置 ──

export const REVENUE_TIERS: RevenueTier[] = [
  { id: 'tier1', label: '≤2000万', subtitle: '初创期', min: 0, max: 20_000_000, vatRate: 0, vatDivisor: 0 },
  { id: 'tier2', label: '2000万–2.5亿', subtitle: '成长期', min: 20_000_001, max: 250_000_000, vatRate: 0.05, vatDivisor: 105 },
  { id: 'tier3', label: '2.5亿–4.5亿', subtitle: '规模期', min: 250_000_001, max: 450_000_000, vatRate: 0.07, vatDivisor: 107 },
  { id: 'tier4', label: '>4.5亿', subtitle: '一般税制', min: 450_000_001, max: Infinity, vatRate: 0, vatDivisor: 0 },
];

export const TAX_REGIMES: Record<TaxRegimeId, { name: string; description: string }> = {
  usn6: { name: '简易税制 6%', description: '适用成本低、利润高的场景' },
  usn15: { name: '简易税制 15%', description: '适用成本高、利润低的场景' },
  osno: { name: '一般税制', description: '营业额超过4.5亿卢布强制适用' },
};

// ── 工具函数 ──

/** 四舍五入到指定小数位 */
export function round(n: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

/** 根据营业额确定档位 */
export function determineTier(revenue: number): RevenueTier {
  const tier = REVENUE_TIERS.find(t => revenue >= t.min && revenue <= t.max);
  return tier ?? REVENUE_TIERS[REVENUE_TIERS.length - 1];
}

/** 计算总支出 */
export function totalExpenses(expenses: Expenses): number {
  return expenses.procurement + expenses.logistics + expenses.commission + expenses.advertising + expenses.labor;
}

// ── 税制策略接口 ──

interface TaxStrategy {
  calculate(input: CalcInput, tier: RevenueTier): TaxCalcResult;
}

// ── USN-6% 策略 ──

const usn6Strategy: TaxStrategy = {
  calculate(input, tier) {
    const { revenue, product } = input;
    const declaredCost = product.declaredCost;

    // 第一笔：海关增值税
    const customsVat = round(declaredCost * 0.22);

    // 第二笔：收入税
    const incomeTax = round(revenue * 0.06);

    // 附加增值税（档位2/3）
    let additionalVat = 0;
    if (tier.vatDivisor > 0) {
      additionalVat = round(revenue / tier.vatDivisor * (tier.vatDivisor - 100));
    }

    const totalTax = round(customsVat + incomeTax + additionalVat);
    const taxRate = revenue > 0 ? round(totalTax / revenue, 4) : 0;
    const netProfit = round(revenue - totalExpenses(input.expenses) - totalTax);
    const profitMargin = revenue > 0 ? round(netProfit / revenue, 4) : 0;

    return {
      regime: 'usn6',
      customsVat,
      incomeTax,
      additionalVat,
      totalTax,
      taxRate,
      netProfit,
      profitMargin,
    };
  },
};

// ── USN-15% 策略 ──

const usn15Strategy: TaxStrategy = {
  calculate(input, tier) {
    const { revenue, expenses, product } = input;
    const declaredCost = product.declaredCost;
    const expenseTotal = totalExpenses(expenses);

    // 第一笔：海关增值税
    const customsVat = round(declaredCost * 0.22);

    // 第二笔：利润税
    const profit = revenue - expenseTotal;
    const incomeTax = round(Math.max(profit, 0) * 0.15);

    // 附加增值税（档位2/3）
    let additionalVat = 0;
    if (tier.vatDivisor > 0) {
      additionalVat = round(revenue / tier.vatDivisor * (tier.vatDivisor - 100));
    }

    const totalTax = round(customsVat + incomeTax + additionalVat);
    const taxRate = revenue > 0 ? round(totalTax / revenue, 4) : 0;
    const netProfit = round(revenue - expenseTotal - totalTax);
    const profitMargin = revenue > 0 ? round(netProfit / revenue, 4) : 0;

    return {
      regime: 'usn15',
      customsVat,
      incomeTax,
      additionalVat,
      totalTax,
      taxRate,
      netProfit,
      profitMargin,
    };
  },
};

// ── OSNO 一般税制策略 ──

const osnoStrategy: TaxStrategy = {
  calculate(input) {
    const { revenue, expenses, product } = input;
    const declaredCost = product.declaredCost;
    const expenseTotal = totalExpenses(expenses);

    // 第一笔：海关增值税
    const customsVat = round(declaredCost * 0.22);

    // 企业所得税 25%
    const taxFreeRevenue = round(revenue - revenue / 122 * 22);
    const taxFreeExpense = round(expenseTotal - expenseTotal / 122 * 22);
    const taxableProfit = round(taxFreeRevenue - taxFreeExpense);
    const incomeTax = round(Math.max(taxableProfit, 0) * 0.25);

    // 第二笔：税务局增值税
    const revenueVat = round(revenue / 122 * 22);
    const expenseVat = round(expenseTotal / 122 * 22);
    const additionalVat = round(revenueVat - expenseVat);

    const totalTax = round(incomeTax + customsVat + additionalVat);
    const taxRate = revenue > 0 ? round(totalTax / revenue, 4) : 0;
    const netProfit = round(revenue - expenseTotal - totalTax);
    const profitMargin = revenue > 0 ? round(netProfit / revenue, 4) : 0;

    return {
      regime: 'osno',
      customsVat,
      incomeTax,
      additionalVat,
      totalTax,
      taxRate,
      netProfit,
      profitMargin,
    };
  },
};

// ── 策略工厂 ──

const strategies: Record<TaxRegimeId, TaxStrategy> = {
  usn6: usn6Strategy,
  usn15: usn15Strategy,
  osno: osnoStrategy,
};

/** 创建税制计算策略 */
export function createTaxStrategy(regime: TaxRegimeId): TaxStrategy {
  return strategies[regime];
}

// ── 主计算函数 ──

/**
 * 计算所有适用税制的结果
 * - tier1/2/3: 计算 USN-6% 和 USN-15%
 * - tier4: 只计算 OSNO
 */
export function calculateTax(input: CalcInput): CalcOutput {
  const tier = REVENUE_TIERS.find(t => t.id === input.tier) ?? REVENUE_TIERS[REVENUE_TIERS.length - 1];
  const headShipping = calculateHeadShipping(input);
  const platformFee = round(input.product.platformPrice * input.product.platformFeeRate);

  let regimeIds: TaxRegimeId[];
  if (tier.id === 'tier4') {
    regimeIds = ['osno'];
  } else {
    regimeIds = ['usn6', 'usn15'];
  }

  const results = regimeIds.map(regimeId => {
    const strategy = createTaxStrategy(regimeId);
    return strategy.calculate(input, tier);
  });

  // 推荐税负最低的税制
  const recommended = results.reduce((best, curr) =>
    curr.totalTax < best.totalTax ? curr : best
  ).regime;

  return {
    tier,
    results,
    recommended,
    headShipping,
    platformFee,
    totalExpenses: totalExpenses(input.expenses),
  };
}

/** 计算头程物流费 */
function calculateHeadShipping(input: CalcInput): number {
  const { product, rates } = input;
  if (product.shippingMethod === 'east') {
    return round(product.weight * 2 * rates.usdPerCny);
  }
  return round(product.weight * rates.usdPerCny * 0.6326);
}
