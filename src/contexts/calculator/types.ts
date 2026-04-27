import type { Dispatch } from 'react';

import type {
  TierId,
  Product,
  Expenses,
  ExchangeRates,
  CalcOutput,
} from '@/lib/calc/types';

export type ViewId = 'detail' | 'compare' | 'batch';

export interface CalculatorState {
  tierId: TierId;
  products: Product[];
  currentProductId: string | null;
  expenses: Expenses;
  rates: ExchangeRates;
  activeView: ViewId;
  batchMin: number;
  batchMax: number;
  revenue: number;
}

export type CalculatorAction =
  | { type: 'SET_TIER'; tierId: TierId }
  | { type: 'SET_PRODUCT'; productId: string }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'REMOVE_PRODUCT'; productId: string }
  | { type: 'UPDATE_PRODUCT'; productId: string; updates: Partial<Product> }
  | { type: 'SET_EXPENSES'; expenses: Partial<Expenses> }
  | { type: 'SET_RATES'; rates: Partial<ExchangeRates> }
  | { type: 'SET_VIEW'; view: ViewId }
  | { type: 'SET_BATCH_RANGE'; min: number; max: number }
  | { type: 'SET_REVENUE'; revenue: number }
  | { type: 'INIT'; products: Product[]; rates: ExchangeRates };

export interface CalculatorContextValue {
  state: CalculatorState;
  dispatch: Dispatch<CalculatorAction>;
  currentProduct: Product | null;
  calcOutput: CalcOutput | null;
  allProductsCalc: Map<string, CalcOutput>;
}
