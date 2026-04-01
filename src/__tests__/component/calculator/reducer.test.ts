import { describe, expect, it } from 'vitest';

import { createInitialState, calculatorReducer } from '@/contexts/calculator/reducer';
import type { CalculatorState } from '@/contexts/calculator/types';
import type { ExchangeRates, Product } from '@/lib/calc/types';

const DEFAULT_RATES: ExchangeRates = {
  cnyPerRub: 11.5,
  usdPerCny: 7.12,
};

function makeProduct(id: string, name = `Product ${id}`): Product {
  return {
    id,
    name,
    emoji: '📦',
    platformPrice: 100,
    declaredCost: 10,
    purchaseCost: 20,
    volume: 0.2,
    weight: 1,
    dutyRate: 0.1,
    platformFeeRate: 0.2,
    shippingMethod: 'standard',
  };
}

function makeState(overrides: Partial<CalculatorState> = {}): CalculatorState {
  return {
    ...createInitialState(),
    products: [makeProduct('p1'), makeProduct('p2')],
    currentProductId: 'p1',
    rates: DEFAULT_RATES,
    ...overrides,
  };
}

describe('calculatorReducer', () => {
  it('INIT 初始化 products、rates，并自动选中第一个商品', () => {
    const products = [makeProduct('p1'), makeProduct('p2')];
    const state = calculatorReducer(createInitialState(), {
      type: 'INIT',
      products,
      rates: DEFAULT_RATES,
    });

    expect(state.products).toEqual(products);
    expect(state.rates).toEqual(DEFAULT_RATES);
    expect(state.currentProductId).toBe('p1');
  });

  it('SET_TIER 更新 tierId', () => {
    const state = calculatorReducer(makeState(), {
      type: 'SET_TIER',
      tierId: 'tier3',
    });

    expect(state.tierId).toBe('tier3');
  });

  it('SET_PRODUCT 与 UPDATE_PRODUCT 更新当前商品和商品字段', () => {
    const selected = calculatorReducer(makeState(), {
      type: 'SET_PRODUCT',
      productId: 'p2',
    });
    const updated = calculatorReducer(selected, {
      type: 'UPDATE_PRODUCT',
      productId: 'p2',
      updates: {
        platformPrice: 168,
        shippingMethod: 'east',
      },
    });

    expect(updated.currentProductId).toBe('p2');
    expect(updated.products[1]).toMatchObject({
      id: 'p2',
      platformPrice: 168,
      shippingMethod: 'east',
    });
  });

  it('ADD_PRODUCT 添加商品并自动选中', () => {
    const product = makeProduct('p3');
    const state = calculatorReducer(makeState(), {
      type: 'ADD_PRODUCT',
      product,
    });

    expect(state.products).toContainEqual(product);
    expect(state.currentProductId).toBe('p3');
  });

  it('REMOVE_PRODUCT 移除当前选中商品时自动选中下一个', () => {
    const state = calculatorReducer(makeState(), {
      type: 'REMOVE_PRODUCT',
      productId: 'p1',
    });

    expect(state.products.map((product) => product.id)).toEqual(['p2']);
    expect(state.currentProductId).toBe('p2');
  });

  it('REMOVE_PRODUCT 移除非当前商品时保持当前选中不变', () => {
    const state = calculatorReducer(makeState(), {
      type: 'REMOVE_PRODUCT',
      productId: 'p2',
    });

    expect(state.products.map((product) => product.id)).toEqual(['p1']);
    expect(state.currentProductId).toBe('p1');
  });

  it('SET_EXPENSES 部分合并 expenses', () => {
    const state = calculatorReducer(makeState(), {
      type: 'SET_EXPENSES',
      expenses: {
        logistics: 88,
        labor: 18,
      },
    });

    expect(state.expenses).toEqual({
      procurement: 0,
      logistics: 88,
      commission: 0,
      advertising: 0,
      labor: 18,
    });
  });

  it('SET_RATES 部分合并 rates', () => {
    const state = calculatorReducer(makeState(), {
      type: 'SET_RATES',
      rates: {
        usdPerCny: 7.3,
      },
    });

    expect(state.rates).toEqual({
      cnyPerRub: 11.5,
      usdPerCny: 7.3,
    });
  });

  it('SET_VIEW 切换 activeView', () => {
    const state = calculatorReducer(makeState(), {
      type: 'SET_VIEW',
      view: 'compare',
    });

    expect(state.activeView).toBe('compare');
  });

  it('SET_BATCH_QUANTITY 与 SET_REVENUE 更新批量数量和营业额', () => {
    const withQuantity = calculatorReducer(makeState(), {
      type: 'SET_BATCH_QUANTITY',
      quantity: 24,
    });
    const withRevenue = calculatorReducer(withQuantity, {
      type: 'SET_REVENUE',
      revenue: 32_000_000,
    });

    expect(withRevenue.batchQuantity).toBe(24);
    expect(withRevenue.revenue).toBe(32_000_000);
  });

  it('INIT 空商品数组时 currentProductId 为 null', () => {
    const state = calculatorReducer(createInitialState(), {
      type: 'INIT',
      products: [],
      rates: DEFAULT_RATES,
    });

    expect(state.products).toEqual([]);
    expect(state.rates).toEqual(DEFAULT_RATES);
    expect(state.currentProductId).toBeNull();
  });

  it('REMOVE_PRODUCT 移除最后一个商品时 currentProductId 为 null', () => {
    const state = calculatorReducer(
      makeState({ products: [makeProduct('p1')], currentProductId: 'p1' }),
      { type: 'REMOVE_PRODUCT', productId: 'p1' }
    );

    expect(state.products).toEqual([]);
    expect(state.currentProductId).toBeNull();
  });
});
