export type TierId = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface RevenueTier {
  id: TierId;
  label: string;
  subtitle: string;
  min: number;
  max: number;
  vatRate: number;
  vatDivisor: number;
}

export type TaxRegimeId = 'usn6' | 'usn15' | 'osno';

export interface TaxRegime {
  id: TaxRegimeId;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  name: string;
  emoji: string;
  platformPrice: number;
  declaredCost: number;
  purchaseCost: number;
  volume: number;
  weight: number;
  dutyRate: number;
  platformFeeRate: number;
  shippingMethod: 'standard' | 'east';
}

export interface Expenses {
  procurement: number;
  logistics: number;
  commission: number;
  advertising: number;
  labor: number;
}

export interface ExchangeRates {
  cnyPerRub: number;
  usdPerCny: number;
}

export interface CalcInput {
  product: Product;
  tier: TierId;
  revenue: number;
  expenses: Expenses;
  rates: ExchangeRates;
}

export interface TaxCalcResult {
  regime: TaxRegimeId;
  customsVat: number;
  incomeTax: number;
  additionalVat: number;
  totalTax: number;
  taxRate: number;
  netProfit: number;
  profitMargin: number;
}

export interface CalcOutput {
  tier: RevenueTier;
  results: TaxCalcResult[];
  recommended: TaxRegimeId;
  headShipping: number;
  platformFee: number;
  totalExpenses: number;
}

export interface ProfileEntity {
  id: string;
  email: string;
  displayName: string | null;
  companyName: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface CalculationEntity {
  id: string;
  userId: string;
  productId: string | null;
  tier: string;
  revenue: number;
  expenses: Expenses;
  results: Record<string, TaxCalcResult>;
  rates: ExchangeRates;
  createdAt: string;
}

export interface TaxConfigEntity {
  id: string;
  tier: string;
  regime: string;
  params: Record<string, number>;
  effectiveDate: string;
  createdBy: string | null;
  createdAt: string;
}

export interface ProfileUpdateInput {
  displayName?: string | null;
  companyName?: string | null;
  role?: 'user' | 'admin';
}

export type ProductWriteInput = Omit<Product, 'id'>;

export type ProductUpdateInput = Partial<ProductWriteInput>;

export interface SaveCalculationInput {
  productId?: string | null;
  tier: string;
  revenue: number;
  expenses: Expenses;
  results: Record<string, TaxCalcResult>;
  rates: ExchangeRates;
}

export interface TaxConfigUpsertInput {
  tier: string;
  regime: string;
  params: Record<string, number>;
  effectiveDate: string;
  createdBy?: string | null;
}
