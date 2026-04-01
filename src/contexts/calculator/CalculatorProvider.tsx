'use client';

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { calculateTax } from '@/lib/calc/engine';
import type { CalcOutput, ExchangeRates, Product } from '@/lib/calc/types';
import { calculatorReducer, createInitialState } from '@/contexts/calculator/reducer';
import type { CalculatorContextValue } from '@/contexts/calculator/types';

interface CalculatorProviderProps {
  children: ReactNode;
  initialProducts: Product[];
  initialRates: ExchangeRates;
}

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function CalculatorProvider(props: CalculatorProviderProps) {
  const [state, dispatch] = useReducer(
    calculatorReducer,
    { products: props.initialProducts, rates: props.initialRates },
    ({ products, rates }) => createInitialState(products, rates)
  );

  const { products, currentProductId, tierId, revenue, expenses, rates } = state;

  const currentProduct = useMemo(
    () => products.find((p) => p.id === currentProductId) ?? null,
    [products, currentProductId]
  );

  const calcOutput = useMemo(
    () =>
      currentProduct
        ? calculateTax({ product: currentProduct, tier: tierId, revenue, expenses, rates })
        : null,
    [currentProduct, tierId, revenue, expenses, rates]
  );

  const allProductsCalc = useMemo<Map<string, CalcOutput>>(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          calculateTax({ product, tier: tierId, revenue, expenses, rates }),
        ])
      ),
    [products, tierId, revenue, expenses, rates]
  );

  const value = useMemo(
    () => ({ state, dispatch, currentProduct, calcOutput, allProductsCalc }),
    [allProductsCalc, calcOutput, currentProduct, state]
  );

  return <CalculatorContext value={value}>{props.children}</CalculatorContext>;
}

export function useCalculatorContext(): CalculatorContextValue {
  const context = useContext(CalculatorContext);
  if (context) return context;
  throw new Error('useCalculatorContext must be used within CalculatorProvider.');
}
