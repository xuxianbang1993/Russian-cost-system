import { getDefaultBatchRange } from '@/lib/calc/sample';
import type { ExchangeRates, Expenses, Product } from '@/lib/calc/types';

import type { CalculatorAction, CalculatorState } from '@/contexts/calculator/types';

const DEFAULT_EXPENSES: Expenses = {
  procurement: 0,
  logistics: 0,
  commission: 0,
  advertising: 0,
  labor: 0,
};

const DEFAULT_RATES: ExchangeRates = {
  cnyPerRub: 0,
  usdPerCny: 0,
};

export function createInitialState(
  products: Product[] = [],
  rates: ExchangeRates = DEFAULT_RATES
): CalculatorState {
  const defaultRange = getDefaultBatchRange('tier1');
  return {
    tierId: 'tier1',
    products,
    currentProductId: products[0]?.id ?? null,
    expenses: DEFAULT_EXPENSES,
    rates,
    activeView: 'detail',
    batchMin: defaultRange.min,
    batchMax: defaultRange.max,
    revenue: 20_000_000,
  };
}

function initializeState(
  state: CalculatorState,
  products: Product[],
  rates: ExchangeRates
): CalculatorState {
  return {
    ...state,
    products,
    rates,
    currentProductId: products[0]?.id ?? null,
  };
}

function removeProduct(state: CalculatorState, productId: string): CalculatorState {
  const removedIndex = state.products.findIndex((product) => product.id === productId);
  const products = state.products.filter((product) => product.id !== productId);
  const currentProductId = getNextProductId(state, products, productId, removedIndex);
  return { ...state, products, currentProductId };
}

function getNextProductId(
  state: CalculatorState,
  products: Product[],
  productId: string,
  removedIndex: number
): string | null {
  if (state.currentProductId !== productId) return state.currentProductId;
  if (removedIndex < 0) return state.currentProductId;
  return products[removedIndex]?.id ?? products[removedIndex - 1]?.id ?? null;
}

function updateProduct(
  state: CalculatorState,
  productId: string,
  updates: Partial<Product>
): CalculatorState {
  const products = state.products.map((product) =>
    product.id === productId ? { ...product, ...updates } : product
  );
  return { ...state, products };
}

function mergeExpenses(state: CalculatorState, expenses: Partial<Expenses>): CalculatorState {
  return { ...state, expenses: { ...state.expenses, ...expenses } };
}

function mergeRates(
  state: CalculatorState,
  rates: Partial<ExchangeRates>
): CalculatorState {
  return { ...state, rates: { ...state.rates, ...rates } };
}

function addProduct(state: CalculatorState, product: Product): CalculatorState {
  return {
    ...state,
    products: [...state.products, product],
    currentProductId: product.id,
  };
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case 'INIT': return initializeState(state, action.products, action.rates);
    case 'SET_TIER': return { ...state, tierId: action.tierId };
    case 'SET_PRODUCT': return { ...state, currentProductId: action.productId };
    case 'ADD_PRODUCT': return addProduct(state, action.product);
    case 'REMOVE_PRODUCT': return removeProduct(state, action.productId);
    case 'UPDATE_PRODUCT': return updateProduct(state, action.productId, action.updates);
    case 'SET_EXPENSES': return mergeExpenses(state, action.expenses);
    case 'SET_RATES': return mergeRates(state, action.rates);
    case 'SET_VIEW': return { ...state, activeView: action.view };
    case 'SET_BATCH_RANGE': return { ...state, batchMin: action.min, batchMax: action.max };
    case 'SET_REVENUE': return { ...state, revenue: action.revenue };
    default:
      return state;
  }
}
