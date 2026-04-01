import type {
  CalculationEntity,
  ExchangeRates,
  Expenses,
  Product,
  ProductUpdateInput,
  ProductWriteInput,
  ProfileEntity,
  TaxCalcResult,
  TaxConfigEntity,
} from '@/lib/calc/types';
import type { Database, Json } from '@/lib/supabase/database.types';

type Tables = Database['public']['Tables'];
type ProductWriteRow = Omit<
  Tables['products']['Insert'],
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

function asNumber(value: Json | number | null | undefined): number {
  return typeof value === 'number' ? value : 0;
}

function asString(value: string | null | undefined): string {
  return value ?? '';
}

function asIsoDate(value: string | null | undefined): string {
  return value ?? '';
}

function asRecord(value: Json | null | undefined): Record<string, Json> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, Json>;
  }

  return {};
}

function asShippingMethod(value: string | null | undefined): Product['shippingMethod'] {
  return value === 'east' ? 'east' : 'standard';
}

function resultValueToEntity(value: Json): TaxCalcResult {
  const record = asRecord(value);
  const regime = record.regime;

  return {
    regime: regime === 'usn15' || regime === 'osno' ? regime : 'usn6',
    customsVat: asNumber(record.customsVat),
    incomeTax: asNumber(record.incomeTax),
    additionalVat: asNumber(record.additionalVat),
    totalTax: asNumber(record.totalTax),
    taxRate: asNumber(record.taxRate),
    netProfit: asNumber(record.netProfit),
    profitMargin: asNumber(record.profitMargin),
  };
}

function jsonToExpenses(value: Json): Expenses {
  const record = asRecord(value);

  return {
    procurement: asNumber(record.procurement),
    logistics: asNumber(record.logistics),
    commission: asNumber(record.commission),
    advertising: asNumber(record.advertising),
    labor: asNumber(record.labor),
  };
}

function jsonToExchangeRates(value: Json): ExchangeRates {
  const record = asRecord(value);

  return {
    cnyPerRub: asNumber(record.cnyPerRub),
    usdPerCny: asNumber(record.usdPerCny),
  };
}

function jsonToResults(value: Json): Record<string, TaxCalcResult> {
  const record = asRecord(value);

  return Object.fromEntries(
    Object.entries(record).map(([key, result]) => [key, resultValueToEntity(result)])
  );
}

function jsonToNumberMap(value: Json): Record<string, number> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, entry]) => [key, asNumber(entry)])
  );
}

export function profileRowToEntity(
  row: Tables['profiles']['Row'] | null | undefined
): ProfileEntity | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    companyName: row.company_name,
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: asIsoDate(row.created_at),
    updatedAt: asIsoDate(row.updated_at),
  };
}

export function productRowToEntity(
  row: Tables['products']['Row'] | null | undefined
): Product | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji ?? '📦',
    platformPrice: row.platform_price,
    declaredCost: row.declared_cost,
    purchaseCost: row.purchase_cost,
    volume: asNumber(row.volume),
    weight: asNumber(row.weight),
    dutyRate: asNumber(row.duty_rate),
    platformFeeRate: asNumber(row.platform_fee_rate),
    shippingMethod: asShippingMethod(row.shipping_method),
  };
}

export function productEntityToRow(
  entity: ProductWriteInput | ProductUpdateInput
): Partial<ProductWriteRow> {
  const row: Partial<ProductWriteRow> = {};

  if (entity.name !== undefined) row.name = entity.name;
  if (entity.emoji !== undefined) row.emoji = entity.emoji;
  if (entity.platformPrice !== undefined) row.platform_price = entity.platformPrice;
  if (entity.declaredCost !== undefined) row.declared_cost = entity.declaredCost;
  if (entity.purchaseCost !== undefined) row.purchase_cost = entity.purchaseCost;
  if (entity.volume !== undefined) row.volume = entity.volume;
  if (entity.weight !== undefined) row.weight = entity.weight;
  if (entity.dutyRate !== undefined) row.duty_rate = entity.dutyRate;
  if (entity.platformFeeRate !== undefined) row.platform_fee_rate = entity.platformFeeRate;
  if (entity.shippingMethod !== undefined) row.shipping_method = entity.shippingMethod;

  return row;
}

export function calculationRowToEntity(
  row: Tables['calculations']['Row'] | null | undefined
): CalculationEntity | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    tier: row.tier,
    revenue: row.revenue,
    expenses: jsonToExpenses(row.expenses),
    results: jsonToResults(row.results),
    rates: jsonToExchangeRates(row.rates),
    createdAt: asIsoDate(row.created_at),
  };
}

export function taxConfigRowToEntity(
  row: Tables['tax_config']['Row'] | null | undefined
): TaxConfigEntity | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    tier: row.tier,
    regime: row.regime,
    params: jsonToNumberMap(row.params),
    effectiveDate: row.effective_date,
    createdBy: row.created_by,
    createdAt: asString(row.created_at),
  };
}
