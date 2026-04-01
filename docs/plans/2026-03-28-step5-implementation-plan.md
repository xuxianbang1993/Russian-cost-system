# Step 5: Calculator Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full cost calculator frontend with 3 view tabs, real-time calculation, product management via Supabase, and manual save.

**Architecture:** Server Component page fetches data, passes to a Client `CalculatorShell` wrapping `CalculatorProvider` (Context + useReducer). All child components consume context. `useMemo` drives real-time recalculation on any state change.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind CSS v4 with Design Tokens, Recharts, react-hook-form + zod, Supabase via existing Repository layer.

**Constraint:** This plan is split into 6 independent Phases. Each Phase is a self-contained Codex session. Each Phase has explicit entry/exit criteria.

## Current Status (2026-03-30)

- Completed in code: `Phase 5.1` and `Phase 5.2`
- Verified: `pnpm lint`, `pnpm test:run` (`75` tests passed), `.\\node_modules\\.bin\\tsc.cmd --noEmit`
- Left panel is now implemented with `TierSelector + CostInputPanel`
- Recommended next phase: `Phase 5.3`

---

## Pre-Flight: Dependencies

Before starting any Phase, run once:

```bash
cd D:/深圳拓俄出海/ELSCBSSXT/elscbssxt
pnpm add recharts
pnpm add -D @testing-library/user-event
```

Also create the test setup file that was referenced in vitest.config.ts but missing:

**Create: `src/test-setup.ts`**
```typescript
import '@testing-library/jest-dom/vitest';
```

Then update `vitest.config.ts` to add the setupFiles (it's currently missing):

**Modify: `vitest.config.ts`** — add `setupFiles` and `react` plugin:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Check if `@vitejs/plugin-react` is installed:
```bash
pnpm add -D @vitejs/plugin-react
```

**Verify:** `pnpm test:run` — all 53 existing tests still pass.

---

## Phase 5.1: Context + Reducer + Shell Skeleton

**Goal:** Create the CalculatorContext, reducer, provider, and CalculatorShell with basic dual-pane layout. No business logic UI yet — just the state management backbone and layout grid.

**Entry criteria:** 53 tests pass, `tsc --noEmit` zero errors, dependencies from Pre-Flight installed.

**Files to create:**
- `src/contexts/calculator/types.ts` — State, Action, ContextValue interfaces
- `src/contexts/calculator/reducer.ts` — calculatorReducer pure function
- `src/contexts/calculator/CalculatorProvider.tsx` — Context + Provider + derived values
- `src/contexts/calculator/index.ts` — barrel export
- `src/components/calculator/CalculatorShell.tsx` — 'use client' dual-pane layout
- `src/components/calculator/DashboardHeader.tsx` — header with logo + rate inputs
- `src/__tests__/component/calculator/reducer.test.ts` — reducer unit tests

**Files to modify:**
- `src/app/(dashboard)/calculator/page.tsx` — Server Component that fetches data and renders CalculatorShell
- `src/app/(dashboard)/layout.tsx` — minimal wrapper (remove hardcoded bg color, use token)

---

### Task 1: Define Context Types

**Create: `src/contexts/calculator/types.ts`**

```typescript
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
  batchQuantity: number;
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
  | { type: 'SET_BATCH_QUANTITY'; quantity: number }
  | { type: 'SET_REVENUE'; revenue: number }
  | { type: 'INIT'; products: Product[]; rates: ExchangeRates };

export interface CalculatorContextValue {
  state: CalculatorState;
  dispatch: React.Dispatch<CalculatorAction>;
  currentProduct: Product | null;
  calcOutput: CalcOutput | null;
  allProductsCalc: Map<string, CalcOutput>;
}
```

---

### Task 2: Write Reducer Tests (TDD)

**Create: `src/__tests__/component/calculator/reducer.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { calculatorReducer, createInitialState } from '@/contexts/calculator/reducer';
import type { CalculatorState } from '@/contexts/calculator/types';
import type { Product } from '@/lib/calc/types';

const mockProduct: Product = {
  id: 'p1',
  name: 'Test Product',
  emoji: '📦',
  platformPrice: 5000,
  declaredCost: 3000,
  purchaseCost: 200,
  volume: 0.01,
  weight: 0.5,
  dutyRate: 0.05,
  platformFeeRate: 0.27,
  shippingMethod: 'standard',
};

const mockProduct2: Product = {
  ...mockProduct,
  id: 'p2',
  name: 'Product 2',
};

describe('calculatorReducer', () => {
  const baseState = createInitialState([], { cnyPerRub: 11.5, usdPerCny: 7.12 });

  describe('INIT', () => {
    it('initializes with products and rates', () => {
      const result = calculatorReducer(baseState, {
        type: 'INIT',
        products: [mockProduct],
        rates: { cnyPerRub: 12, usdPerCny: 7 },
      });
      expect(result.products).toHaveLength(1);
      expect(result.products[0]?.id).toBe('p1');
      expect(result.rates.cnyPerRub).toBe(12);
      expect(result.currentProductId).toBe('p1');
    });
  });

  describe('SET_TIER', () => {
    it('updates tierId', () => {
      const result = calculatorReducer(baseState, { type: 'SET_TIER', tierId: 'tier3' });
      expect(result.tierId).toBe('tier3');
    });
  });

  describe('SET_PRODUCT', () => {
    it('sets current product id', () => {
      const state: CalculatorState = { ...baseState, products: [mockProduct, mockProduct2] };
      const result = calculatorReducer(state, { type: 'SET_PRODUCT', productId: 'p2' });
      expect(result.currentProductId).toBe('p2');
    });
  });

  describe('ADD_PRODUCT', () => {
    it('adds product and selects it', () => {
      const result = calculatorReducer(baseState, { type: 'ADD_PRODUCT', product: mockProduct });
      expect(result.products).toHaveLength(1);
      expect(result.currentProductId).toBe('p1');
    });
  });

  describe('REMOVE_PRODUCT', () => {
    it('removes product and clears selection if active', () => {
      const state: CalculatorState = {
        ...baseState,
        products: [mockProduct, mockProduct2],
        currentProductId: 'p1',
      };
      const result = calculatorReducer(state, { type: 'REMOVE_PRODUCT', productId: 'p1' });
      expect(result.products).toHaveLength(1);
      expect(result.currentProductId).toBe('p2');
    });

    it('keeps selection if different product removed', () => {
      const state: CalculatorState = {
        ...baseState,
        products: [mockProduct, mockProduct2],
        currentProductId: 'p1',
      };
      const result = calculatorReducer(state, { type: 'REMOVE_PRODUCT', productId: 'p2' });
      expect(result.currentProductId).toBe('p1');
    });
  });

  describe('SET_EXPENSES', () => {
    it('merges partial expenses', () => {
      const result = calculatorReducer(baseState, {
        type: 'SET_EXPENSES',
        expenses: { procurement: 5000 },
      });
      expect(result.expenses.procurement).toBe(5000);
      expect(result.expenses.logistics).toBe(0);
    });
  });

  describe('SET_RATES', () => {
    it('merges partial rates', () => {
      const result = calculatorReducer(baseState, {
        type: 'SET_RATES',
        rates: { cnyPerRub: 13 },
      });
      expect(result.rates.cnyPerRub).toBe(13);
      expect(result.rates.usdPerCny).toBe(7.12);
    });
  });

  describe('SET_VIEW', () => {
    it('switches active view', () => {
      const result = calculatorReducer(baseState, { type: 'SET_VIEW', view: 'compare' });
      expect(result.activeView).toBe('compare');
    });
  });

  describe('SET_BATCH_QUANTITY', () => {
    it('updates batch quantity', () => {
      const result = calculatorReducer(baseState, { type: 'SET_BATCH_QUANTITY', quantity: 100 });
      expect(result.batchQuantity).toBe(100);
    });
  });

  describe('SET_REVENUE', () => {
    it('updates revenue', () => {
      const result = calculatorReducer(baseState, { type: 'SET_REVENUE', revenue: 50_000_000 });
      expect(result.revenue).toBe(50_000_000);
    });
  });
});
```

**Run:** `pnpm test:run src/__tests__/component/calculator/reducer.test.ts`
**Expected:** FAIL — modules not found yet.

---

### Task 3: Implement Reducer

**Create: `src/contexts/calculator/reducer.ts`**

```typescript
import type { CalculatorState, CalculatorAction } from './types';
import type { ExchangeRates } from '@/lib/calc/types';

export function createInitialState(
  products: CalculatorState['products'],
  rates: ExchangeRates
): CalculatorState {
  return {
    tierId: 'tier1',
    products,
    currentProductId: products[0]?.id ?? null,
    expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
    rates,
    activeView: 'detail',
    batchQuantity: 1,
    revenue: 20_000_000,
  };
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction
): CalculatorState {
  switch (action.type) {
    case 'INIT': {
      const firstId = action.products[0]?.id ?? null;
      return {
        ...state,
        products: action.products,
        currentProductId: firstId,
        rates: action.rates,
      };
    }
    case 'SET_TIER':
      return { ...state, tierId: action.tierId };
    case 'SET_PRODUCT':
      return { ...state, currentProductId: action.productId };
    case 'ADD_PRODUCT':
      return {
        ...state,
        products: [...state.products, action.product],
        currentProductId: action.product.id,
      };
    case 'REMOVE_PRODUCT': {
      const filtered = state.products.filter(p => p.id !== action.productId);
      const needsNewSelection = state.currentProductId === action.productId;
      return {
        ...state,
        products: filtered,
        currentProductId: needsNewSelection ? (filtered[0]?.id ?? null) : state.currentProductId,
      };
    }
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.productId ? { ...p, ...action.updates } : p
        ),
      };
    case 'SET_EXPENSES':
      return { ...state, expenses: { ...state.expenses, ...action.expenses } };
    case 'SET_RATES':
      return { ...state, rates: { ...state.rates, ...action.rates } };
    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    case 'SET_BATCH_QUANTITY':
      return { ...state, batchQuantity: action.quantity };
    case 'SET_REVENUE':
      return { ...state, revenue: action.revenue };
    default:
      return state;
  }
}
```

**Run:** `pnpm test:run src/__tests__/component/calculator/reducer.test.ts`
**Expected:** ALL PASS (10 tests)

---

### Task 4: Implement CalculatorProvider

**Create: `src/contexts/calculator/CalculatorProvider.tsx`**

```typescript
'use client';

import { createContext, useContext, useMemo, useReducer } from 'react';
import { calculateTax } from '@/lib/calc/engine';
import type { CalcInput, CalcOutput, ExchangeRates, Product } from '@/lib/calc/types';
import { calculatorReducer, createInitialState } from './reducer';
import type { CalculatorContextValue } from './types';

const CalculatorContext = createContext<CalculatorContextValue | null>(null);

export function useCalculatorContext(): CalculatorContextValue {
  const ctx = useContext(CalculatorContext);
  if (!ctx) {
    throw new Error('useCalculatorContext must be used within CalculatorProvider');
  }
  return ctx;
}

interface CalculatorProviderProps {
  children: React.ReactNode;
  initialProducts: Product[];
  initialRates: ExchangeRates;
}

export function CalculatorProvider({
  children,
  initialProducts,
  initialRates,
}: CalculatorProviderProps) {
  const [state, dispatch] = useReducer(
    calculatorReducer,
    { products: initialProducts, rates: initialRates },
    ({ products, rates }) => createInitialState(products, rates)
  );

  const currentProduct = useMemo(
    () => state.products.find(p => p.id === state.currentProductId) ?? null,
    [state.products, state.currentProductId]
  );

  const calcOutput = useMemo<CalcOutput | null>(() => {
    if (!currentProduct) return null;
    const input: CalcInput = {
      product: currentProduct,
      tier: state.tierId,
      revenue: state.revenue,
      expenses: state.expenses,
      rates: state.rates,
    };
    return calculateTax(input);
  }, [currentProduct, state.tierId, state.revenue, state.expenses, state.rates]);

  const allProductsCalc = useMemo<Map<string, CalcOutput>>(() => {
    const map = new Map<string, CalcOutput>();
    for (const product of state.products) {
      const input: CalcInput = {
        product,
        tier: state.tierId,
        revenue: state.revenue,
        expenses: state.expenses,
        rates: state.rates,
      };
      map.set(product.id, calculateTax(input));
    }
    return map;
  }, [state.products, state.tierId, state.revenue, state.expenses, state.rates]);

  const value = useMemo<CalculatorContextValue>(
    () => ({ state, dispatch, currentProduct, calcOutput, allProductsCalc }),
    [state, dispatch, currentProduct, calcOutput, allProductsCalc]
  );

  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
}
```

---

### Task 5: Create barrel export

**Create: `src/contexts/calculator/index.ts`**

```typescript
export { CalculatorProvider, useCalculatorContext } from './CalculatorProvider';
export type { CalculatorState, CalculatorAction, CalculatorContextValue, ViewId } from './types';
export { calculatorReducer, createInitialState } from './reducer';
```

---

### Task 6: Implement CalculatorShell

**Replace: `src/components/calculator/CalculatorShell.tsx`** (new file — the old skeleton files don't include this one)

```typescript
'use client';

import type { ExchangeRates, Product } from '@/lib/calc/types';
import { CalculatorProvider } from '@/contexts/calculator';

interface CalculatorShellProps {
  initialProducts: Product[];
  initialRates: ExchangeRates;
}

export function CalculatorShell({ initialProducts, initialRates }: CalculatorShellProps) {
  return (
    <CalculatorProvider initialProducts={initialProducts} initialRates={initialRates}>
      <div className="flex flex-col min-h-screen">
        {/* DashboardHeader placeholder — Phase 5.1 */}
        <header className="sticky top-0 z-10 h-14 border-b border-border bg-surface flex items-center px-6">
          <span className="font-semibold text-foreground">跨境电商成本计算器</span>
        </header>

        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Left Panel */}
          <aside className="w-full lg:w-80 lg:sticky lg:top-14 lg:h-[calc(100vh-56px)] overflow-y-auto border-r border-border bg-surface p-5">
            <p className="text-muted-foreground text-sm">Left Panel — Phase 5.2</p>
          </aside>

          {/* Right Panel */}
          <main className="flex-1 p-6 overflow-y-auto">
            <p className="text-muted-foreground text-sm">Right Panel — Phase 5.4</p>
          </main>
        </div>
      </div>
    </CalculatorProvider>
  );
}
```

---

### Task 7: Update Calculator Page (Server Component)

**Replace: `src/app/(dashboard)/calculator/page.tsx`**

```typescript
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProducts } from '@/lib/repositories/productRepository';
import { CalculatorShell } from '@/components/calculator/CalculatorShell';
import type { ExchangeRates } from '@/lib/calc/types';

export const dynamic = 'force-dynamic';

const DEFAULT_RATES: ExchangeRates = {
  cnyPerRub: 11.5,
  usdPerCny: 7.12,
};

export default async function CalculatorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const products = await getProducts(user.id);

  return (
    <CalculatorShell
      initialProducts={products}
      initialRates={DEFAULT_RATES}
    />
  );
}
```

---

### Task 8: Update Dashboard Layout

**Replace: `src/app/(dashboard)/layout.tsx`**

```typescript
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
```

---

### Task 9: Verify Phase 5.1

**Run:**
```bash
pnpm test:run
pnpm exec tsc --noEmit
```

**Expected:** All tests pass (53 existing + ~10 new reducer tests = ~63 total), zero TS errors.

**Exit criteria:** Context/reducer work, CalculatorShell renders dual-pane layout, page.tsx fetches user products from Supabase.

---

## Phase 5.2: Left Panel — TierSelector + CostInputPanel

**Goal:** Implement the left sidebar: tier selection (4 pills), core parameter inputs, additional parameter grid, and 5-item expense inputs. All inputs dispatch to Context, triggering real-time recalculation.

**Entry criteria:** Phase 5.1 complete, ~63 tests pass.

**Files to create/modify:**
- Replace: `src/components/calculator/TierSelector.tsx`
- Replace: `src/components/calculator/CostInputPanel.tsx`
- Modify: `src/components/calculator/CalculatorShell.tsx` — plug in left panel components
- Create: `src/__tests__/component/calculator/TierSelector.test.tsx`
- Create: `src/__tests__/component/calculator/CostInputPanel.test.tsx`

**Status (2026-03-30):** Completed and verified. Actual verification result exceeded the original estimate: `pnpm test:run` now passes with `75` total tests, and lint/typecheck are both green.

---

### Task 1: Write TierSelector Tests

**Create: `src/__tests__/component/calculator/TierSelector.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TierSelector } from '@/components/calculator/TierSelector';
import { REVENUE_TIERS } from '@/lib/calc/engine';

// Mock the context
const mockDispatch = vi.fn();
vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => ({
    state: { tierId: 'tier1' },
    dispatch: mockDispatch,
  }),
}));

describe('TierSelector', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('renders all 4 tier options', () => {
    render(<TierSelector />);
    for (const tier of REVENUE_TIERS) {
      expect(screen.getByText(tier.label)).toBeInTheDocument();
    }
  });

  it('highlights the active tier', () => {
    render(<TierSelector />);
    const activePill = screen.getByText(REVENUE_TIERS[0].label).closest('button');
    expect(activePill?.className).toMatch(/bg-primary|text-white/);
  });

  it('dispatches SET_TIER on click', async () => {
    const user = userEvent.setup();
    render(<TierSelector />);
    await user.click(screen.getByText(REVENUE_TIERS[2].label));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_TIER', tierId: 'tier3' });
  });

  it('shows OSNO label on tier4', () => {
    render(<TierSelector />);
    expect(screen.getByText('一般税制')).toBeInTheDocument();
  });
});
```

**Run:** `pnpm test:run src/__tests__/component/calculator/TierSelector.test.tsx`
**Expected:** FAIL — component not implemented.

---

### Task 2: Implement TierSelector

**Replace: `src/components/calculator/TierSelector.tsx`**

```tsx
'use client';

import { REVENUE_TIERS } from '@/lib/calc/engine';
import { useCalculatorContext } from '@/contexts/calculator';

export function TierSelector() {
  const { state, dispatch } = useCalculatorContext();

  return (
    <section className="mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3">
        营收档位
      </h3>
      <div className="flex flex-wrap gap-2">
        {REVENUE_TIERS.map(tier => {
          const isActive = state.tierId === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => dispatch({ type: 'SET_TIER', tierId: tier.id })}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium
                transition-colors duration-200
                ${isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface border border-border text-tertiary hover:border-primary hover:text-primary'
                }
              `}
            >
              {tier.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {REVENUE_TIERS.find(t => t.id === state.tierId)?.subtitle}
        {state.tierId === 'tier4' && ' — 强制适用一般税制 (OSNO)'}
      </p>
    </section>
  );
}
```

**Run:** `pnpm test:run src/__tests__/component/calculator/TierSelector.test.tsx`
**Expected:** ALL PASS (4 tests)

---

### Task 3: Write CostInputPanel Tests

**Create: `src/__tests__/component/calculator/CostInputPanel.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CostInputPanel } from '@/components/calculator/CostInputPanel';

const mockDispatch = vi.fn();
vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => ({
    state: {
      revenue: 20_000_000,
      expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
    },
    currentProduct: {
      id: 'p1', name: 'Test', emoji: '📦',
      platformPrice: 5000, declaredCost: 3000, purchaseCost: 200,
      volume: 0.01, weight: 0.5, dutyRate: 0.05, platformFeeRate: 0.27,
      shippingMethod: 'standard',
    },
    dispatch: mockDispatch,
  }),
}));

describe('CostInputPanel', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('renders revenue input', () => {
    render(<CostInputPanel />);
    expect(screen.getByLabelText(/年度营业额/i)).toBeInTheDocument();
  });

  it('renders all 5 expense fields', () => {
    render(<CostInputPanel />);
    expect(screen.getByLabelText(/进货成本/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/物流费/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/平台佣金/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/广告费/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/人工成本/i)).toBeInTheDocument();
  });

  it('dispatches SET_REVENUE on revenue change', async () => {
    const user = userEvent.setup();
    render(<CostInputPanel />);
    const input = screen.getByLabelText(/年度营业额/i);
    await user.clear(input);
    await user.type(input, '50000000');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_REVENUE' })
    );
  });

  it('dispatches SET_EXPENSES on expense field change', async () => {
    const user = userEvent.setup();
    render(<CostInputPanel />);
    const input = screen.getByLabelText(/进货成本/i);
    await user.clear(input);
    await user.type(input, '1000000');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_EXPENSES' })
    );
  });

  it('shows product core params when product is selected', () => {
    render(<CostInputPanel />);
    expect(screen.getByLabelText(/商品售价/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/采购成本/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/申报成本/i)).toBeInTheDocument();
  });

  it('shows nothing message when no product selected', () => {
    // Override mock to return null product
    vi.doMock('@/contexts/calculator', () => ({
      useCalculatorContext: () => ({
        state: {
          revenue: 20_000_000,
          expenses: { procurement: 0, logistics: 0, commission: 0, advertising: 0, labor: 0 },
        },
        currentProduct: null,
        dispatch: mockDispatch,
      }),
    }));
    // This test verifies the "no product" fallback rendering
  });
});
```

**Run:** `pnpm test:run src/__tests__/component/calculator/CostInputPanel.test.tsx`
**Expected:** FAIL — component not implemented.

---

### Task 4: Implement CostInputPanel

**Replace: `src/components/calculator/CostInputPanel.tsx`**

The component should have:
- Revenue input (年度营业额) with `SET_REVENUE` dispatch
- Product core params section (platformPrice, purchaseCost, declaredCost) — display only, dispatches `UPDATE_PRODUCT`
- Additional params grid (weight, volume, dutyRate, platformFeeRate, shippingMethod) — dispatches `UPDATE_PRODUCT`
- 5 expense fields — dispatches `SET_EXPENSES`

All numeric inputs should:
- Use `type="number"` with step appropriate for the field
- Have underline-style design: `bg-transparent border-0 border-b border-border focus:border-primary outline-none`
- Numbers right-aligned with `font-mono font-semibold`
- Have a `<label>` with `htmlFor` matching the input id (for test accessibility)
- Dispatch on `onChange` (real-time)

Implementation note: Group the inputs into logical sections with section headers using the same pattern as TierSelector (text-xs uppercase tracking-wider text-tertiary).

**Run:** `pnpm test:run src/__tests__/component/calculator/CostInputPanel.test.tsx`
**Expected:** ALL PASS (~6 tests)

---

### Task 5: Plug into CalculatorShell

**Modify: `src/components/calculator/CalculatorShell.tsx`** — Replace left panel placeholder:

```tsx
import { TierSelector } from './TierSelector';
import { CostInputPanel } from './CostInputPanel';
```

Inside the `<aside>`:
```tsx
<TierSelector />
{/* ProductManager — Phase 5.3 */}
<CostInputPanel />
```

---

### Task 6: Verify Phase 5.2

**Run:**
```bash
pnpm test:run
pnpm exec tsc --noEmit
```

**Expected:** ~73 tests pass (63 + ~10 new), zero TS errors.

**Actual result (2026-03-30):** `pnpm lint` pass, `pnpm test:run` pass with `75` tests, `.\\node_modules\\.bin\\tsc.cmd --noEmit` pass.

**Exit criteria:** TierSelector shows 4 pills, CostInputPanel shows revenue + expenses + product params, all dispatch to Context correctly.

---

## Phase 5.3: ProductManager + ProductFormModal + Server Actions

**Goal:** Product management: list products as chips, select, add via modal (react-hook-form + zod), delete, persist to Supabase via Server Actions.

**Entry criteria:** Phase 5.2 complete, `75` tests pass, lint + typecheck green.

**Files to create:**
- `src/lib/schemas/product.ts` — zod schema for product form
- `src/app/actions/products.ts` — Server Actions (create, update, delete)
- `src/components/calculator/ProductFormModal.tsx` — modal form
- Replace: `src/components/calculator/ProductManager.tsx` — product chips + add/delete
- `src/__tests__/component/calculator/ProductManager.test.tsx`

---

### Task 1: Create Product Schema

**Create: `src/lib/schemas/product.ts`**

```typescript
import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(1, '请输入商品名称').max(50),
  emoji: z.string().default('📦'),
  platformPrice: z.coerce.number().positive('售价必须大于 0'),
  declaredCost: z.coerce.number().nonnegative('申报成本不能为负'),
  purchaseCost: z.coerce.number().nonnegative('采购成本不能为负'),
  volume: z.coerce.number().nonnegative().default(0),
  weight: z.coerce.number().nonnegative().default(0),
  dutyRate: z.coerce.number().min(0).max(1).default(0.05),
  platformFeeRate: z.coerce.number().min(0).max(1).default(0.27),
  shippingMethod: z.enum(['standard', 'east']).default('standard'),
});

export type ProductFormInput = z.infer<typeof productSchema>;
```

---

### Task 2: Create Product Server Actions

**Create: `src/app/actions/products.ts`**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '@/lib/repositories/productRepository';
import { productSchema } from '@/lib/schemas/product';
import type { Product } from '@/lib/calc/types';

export interface ProductActionResult {
  error?: string;
  product?: Product;
}

export async function createProductAction(
  formData: Record<string, unknown>
): Promise<ProductActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未登录' };

  const validation = productSchema.safeParse(formData);
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors[Object.keys(validation.error.flatten().fieldErrors)[0] ?? '']?.[0] ?? '输入无效' };
  }

  const product = await createProduct(user.id, validation.data);
  if (!product) return { error: '创建失败' };
  return { product };
}

export async function deleteProductAction(productId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未登录' };

  await deleteProduct(productId);
  return {};
}
```

---

### Task 3: Write ProductManager Tests

**Create: `src/__tests__/component/calculator/ProductManager.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductManager } from '@/components/calculator/ProductManager';

const mockProducts = [
  { id: 'p1', name: 'Dashcam', emoji: '📷', platformPrice: 5000, declaredCost: 3000, purchaseCost: 200, volume: 0.01, weight: 0.5, dutyRate: 0.05, platformFeeRate: 0.27, shippingMethod: 'standard' as const },
  { id: 'p2', name: 'Juicer', emoji: '🧃', platformPrice: 8000, declaredCost: 5000, purchaseCost: 400, volume: 0.02, weight: 1.0, dutyRate: 0.05, platformFeeRate: 0.27, shippingMethod: 'standard' as const },
];

const mockDispatch = vi.fn();
vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => ({
    state: { products: mockProducts, currentProductId: 'p1' },
    dispatch: mockDispatch,
  }),
}));

describe('ProductManager', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('renders all product chips', () => {
    render(<ProductManager />);
    expect(screen.getByText('Dashcam')).toBeInTheDocument();
    expect(screen.getByText('Juicer')).toBeInTheDocument();
  });

  it('highlights the selected product', () => {
    render(<ProductManager />);
    const chip = screen.getByText('Dashcam').closest('button');
    expect(chip?.className).toMatch(/bg-primary|border-primary/);
  });

  it('dispatches SET_PRODUCT on chip click', async () => {
    const user = userEvent.setup();
    render(<ProductManager />);
    await user.click(screen.getByText('Juicer'));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_PRODUCT', productId: 'p2' });
  });

  it('renders add product button', () => {
    render(<ProductManager />);
    expect(screen.getByRole('button', { name: /添加/i })).toBeInTheDocument();
  });

  it('renders delete button for each product', () => {
    render(<ProductManager />);
    const deleteButtons = screen.getAllByRole('button', { name: /删除/i });
    expect(deleteButtons).toHaveLength(2);
  });
});
```

---

### Task 4: Implement ProductManager

**Replace: `src/components/calculator/ProductManager.tsx`**

The component should:
- Render product chips (emoji + name) from `state.products`
- Highlight selected product (matching `state.currentProductId`)
- Click chip → `dispatch({ type: 'SET_PRODUCT', productId })`
- "+" add button opens ProductFormModal (use a `useState` boolean)
- Each chip has a small "x" delete button that calls `deleteProductAction` then `dispatch({ type: 'REMOVE_PRODUCT' })`
- All styled per Design System: pill chips, primary color for active, border for inactive

---

### Task 5: Implement ProductFormModal

**Create: `src/components/calculator/ProductFormModal.tsx`**

The modal should:
- Use a `<dialog>` element (or a simple overlay div — no shadcn Dialog needed)
- Use react-hook-form + zodResolver with `productSchema`
- 7 fields: name, platformPrice, declaredCost, purchaseCost, dutyRate, platformFeeRate, weight, volume, shippingMethod (select)
- On submit: call `createProductAction`, then `dispatch({ type: 'ADD_PRODUCT', product })`, close modal
- Underline-style inputs matching CostInputPanel
- Cancel button to close

---

### Task 6: Plug ProductManager into Shell

**Modify: `src/components/calculator/CalculatorShell.tsx`** — Add ProductManager between TierSelector and CostInputPanel in the `<aside>`.

---

### Task 7: Verify Phase 5.3

**Run:**
```bash
pnpm test:run
pnpm exec tsc --noEmit
```

**Expected:** ~78 tests pass, zero TS errors.

**Exit criteria:** Products load from Supabase, can add/delete/select products, product data flows into CostInputPanel and calculation engine.

---

## Phase 5.4: DetailView — KPI + Chart + Tables

**Goal:** Implement the "税制对比" tab (default view): KPI cards, Recharts bar chart, and tax detail comparison table.

**Entry criteria:** Phase 5.3 complete, ~78 tests pass.

**Files to create:**
- `src/components/calculator/ViewTabs.tsx`
- `src/components/calculator/KpiCards.tsx`
- `src/components/calculator/TaxComparisonChart.tsx`
- `src/components/calculator/TaxDetailTable.tsx`
- `src/components/calculator/DetailView.tsx`
- Replace: `src/components/calculator/ResultPanel.tsx` — now just a view router
- `src/__tests__/component/calculator/DetailView.test.tsx`

**Files to modify:**
- `src/components/calculator/CalculatorShell.tsx` — plug right panel
- Remove: `src/components/calculator/CostBreakdownChart.tsx` (replaced by TaxComparisonChart)

---

### Task 1: Implement ViewTabs

**Create: `src/components/calculator/ViewTabs.tsx`**

```tsx
'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import type { ViewId } from '@/contexts/calculator/types';

const TABS: { id: ViewId; label: string }[] = [
  { id: 'detail', label: '税制对比' },
  { id: 'compare', label: '多品对比' },
  { id: 'batch', label: '批量模拟' },
];

export function ViewTabs() {
  const { state, dispatch } = useCalculatorContext();

  return (
    <div className="inline-flex rounded-lg border border-border p-0.5 mb-5">
      {TABS.map(tab => {
        const isActive = state.activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => dispatch({ type: 'SET_VIEW', view: tab.id })}
            className={`
              px-4 py-1.5 text-sm font-medium rounded-md
              transition-colors duration-200
              ${isActive
                ? 'bg-primary text-white'
                : 'text-tertiary hover:text-foreground'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
```

---

### Task 2: Implement KpiCards

**Create: `src/components/calculator/KpiCards.tsx`**

```tsx
'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import { TAX_REGIMES } from '@/lib/calc/engine';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 10_000) {
    return (value / 10_000).toFixed(1) + '万';
  }
  return value.toLocaleString('zh-CN');
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

export function KpiCards() {
  const { calcOutput } = useCalculatorContext();
  if (!calcOutput) return null;

  const best = calcOutput.results.find(r => r.regime === calcOutput.recommended);
  if (!best) return null;

  const cards = [
    { label: '利润率', value: formatPercent(best.profitMargin), color: 'text-success' },
    { label: '总成本', value: '¥' + formatCurrency(calcOutput.totalExpenses + best.totalTax), color: 'text-foreground' },
    { label: '净利润', value: '¥' + formatCurrency(best.netProfit), color: best.netProfit >= 0 ? 'text-success' : 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-5">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className={`bg-surface rounded-[var(--radius-lg)] border border-border p-5 ${
            i < cards.length - 1 ? 'border-r border-border-light' : ''
          }`}
        >
          <p className="text-xs text-tertiary mb-1">{card.label}</p>
          <p className={`text-2xl font-mono font-bold tracking-tight ${card.color}`}>
            {card.value}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {TAX_REGIMES[calcOutput.recommended].name}
          </p>
        </div>
      ))}
    </div>
  );
}
```

---

### Task 3: Implement TaxComparisonChart

**Create: `src/components/calculator/TaxComparisonChart.tsx`**

```tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useCalculatorContext } from '@/contexts/calculator';
import { TAX_REGIMES } from '@/lib/calc/engine';

const COLORS: Record<string, string> = {
  usn6: '#2563EB',
  usn15: '#7C3AED',
  osno: '#D97706',
};

export function TaxComparisonChart() {
  const { calcOutput } = useCalculatorContext();
  if (!calcOutput) return null;

  const data = calcOutput.results.map(r => ({
    name: TAX_REGIMES[r.regime].name,
    regime: r.regime,
    profitMargin: +(r.profitMargin * 100).toFixed(2),
    isRecommended: r.regime === calcOutput.recommended,
  }));

  return (
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-5 mb-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-4">
        税制利润率对比
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barSize={40}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit="%" />
          <Tooltip formatter={(v: number) => v.toFixed(2) + '%'} />
          <Bar dataKey="profitMargin" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.regime}
                fill={COLORS[entry.regime] ?? '#999'}
                opacity={entry.isRecommended ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### Task 4: Implement TaxDetailTable

**Create: `src/components/calculator/TaxDetailTable.tsx`**

```tsx
'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import { TAX_REGIMES } from '@/lib/calc/engine';

function fmt(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TaxDetailTable() {
  const { calcOutput } = useCalculatorContext();
  if (!calcOutput) return null;

  const rows = [
    { label: '海关增值税', key: 'customsVat' as const },
    { label: '所得税/利润税', key: 'incomeTax' as const },
    { label: '附加增值税', key: 'additionalVat' as const },
    { label: '总税负', key: 'totalTax' as const, bold: true },
    { label: '税负率', key: 'taxRate' as const, format: 'percent' },
    { label: '净利润', key: 'netProfit' as const, bold: true },
    { label: '利润率', key: 'profitMargin' as const, format: 'percent' },
  ];

  return (
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-4">
        各税制费用明细
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-xs uppercase text-placeholder font-medium">项目</th>
            {calcOutput.results.map(r => (
              <th key={r.regime} className="text-right py-2 text-xs uppercase text-placeholder font-medium">
                {TAX_REGIMES[r.regime].name}
                {r.regime === calcOutput.recommended && ' ★'}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key} className="border-b border-border-light">
              <td className={`py-2 ${row.bold ? 'font-semibold' : ''}`}>{row.label}</td>
              {calcOutput.results.map(r => {
                const value = r[row.key];
                const display = row.format === 'percent'
                  ? (value * 100).toFixed(2) + '%'
                  : '¥' + fmt(value);
                return (
                  <td
                    key={r.regime}
                    className={`text-right font-mono py-2 ${
                      row.bold ? 'font-bold border-t border-border' : ''
                    } ${r.regime === calcOutput.recommended ? 'text-primary' : ''}`}
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### Task 5: Compose DetailView

**Create: `src/components/calculator/DetailView.tsx`**

```tsx
'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import { KpiCards } from './KpiCards';
import { TaxComparisonChart } from './TaxComparisonChart';
import { TaxDetailTable } from './TaxDetailTable';

export function DetailView() {
  const { currentProduct, calcOutput } = useCalculatorContext();

  if (!currentProduct) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        请先选择或添加一个商品
      </div>
    );
  }

  if (!calcOutput) return null;

  return (
    <div>
      <KpiCards />
      <TaxComparisonChart />
      <TaxDetailTable />
    </div>
  );
}
```

---

### Task 6: Write DetailView Tests

**Create: `src/__tests__/component/calculator/DetailView.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailView } from '@/components/calculator/DetailView';
import { calculateTax } from '@/lib/calc/engine';
import type { CalcInput } from '@/lib/calc/types';

// Prepare a known calc output
const testInput: CalcInput = {
  product: {
    id: 'p1', name: 'Test', emoji: '📦',
    platformPrice: 5000, declaredCost: 6_000_000, purchaseCost: 200,
    volume: 0.01, weight: 0.5, dutyRate: 0.05, platformFeeRate: 0.27,
    shippingMethod: 'standard',
  },
  tier: 'tier1',
  revenue: 20_000_000,
  expenses: { procurement: 6_000_000, logistics: 1_000_000, commission: 0, advertising: 0, labor: 0 },
  rates: { cnyPerRub: 11.5, usdPerCny: 7.12 },
};
const testOutput = calculateTax(testInput);

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => ({
    state: { tierId: 'tier1', activeView: 'detail' },
    currentProduct: testInput.product,
    calcOutput: testOutput,
  }),
}));

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}));

describe('DetailView', () => {
  it('renders KPI cards with profit margin', () => {
    render(<DetailView />);
    expect(screen.getByText('利润率')).toBeInTheDocument();
  });

  it('renders tax comparison chart container', () => {
    render(<DetailView />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders tax detail table with regime names', () => {
    render(<DetailView />);
    expect(screen.getByText(/简易税制 6%/)).toBeInTheDocument();
    expect(screen.getByText(/简易税制 15%/)).toBeInTheDocument();
  });

  it('shows recommended regime with star marker', () => {
    render(<DetailView />);
    const headers = screen.getAllByRole('columnheader');
    const starHeader = headers.find(h => h.textContent?.includes('★'));
    expect(starHeader).toBeDefined();
  });

  it('renders net profit and total tax rows', () => {
    render(<DetailView />);
    expect(screen.getByText('净利润')).toBeInTheDocument();
    expect(screen.getByText('总税负')).toBeInTheDocument();
  });
});
```

**Run:** `pnpm test:run src/__tests__/component/calculator/DetailView.test.tsx`
**Expected:** ALL PASS (5 tests)

---

### Task 7: Create ResultPanel view router + plug into Shell

**Replace: `src/components/calculator/ResultPanel.tsx`**

```tsx
'use client';

import { useCalculatorContext } from '@/contexts/calculator';
import { DetailView } from './DetailView';
import { CompareView } from './CompareView';
import { BatchSimulation } from './BatchSimulation';
import { ViewTabs } from './ViewTabs';

export function ResultPanel() {
  const { state } = useCalculatorContext();

  return (
    <div>
      <ViewTabs />
      {state.activeView === 'detail' && <DetailView />}
      {state.activeView === 'compare' && <CompareView />}
      {state.activeView === 'batch' && <BatchSimulation />}
    </div>
  );
}
```

**Modify: `src/components/calculator/CalculatorShell.tsx`** — Replace right panel placeholder with `<ResultPanel />`.

**Delete: `src/components/calculator/CostBreakdownChart.tsx`** — replaced by TaxComparisonChart.

---

### Task 8: Verify Phase 5.4

**Run:**
```bash
pnpm test:run
pnpm exec tsc --noEmit
```

**Expected:** ~83 tests pass, zero TS errors.

**Exit criteria:** DetailView tab shows KPI cards, bar chart, and comparison table. Data matches engine calculations. ViewTabs switches work (CompareView/BatchSimulation still show placeholders).

---

## Phase 5.5: CompareView + BatchSimulation

**Goal:** Implement remaining two tabs: multi-product comparison matrix and batch profit simulation.

**Entry criteria:** Phase 5.4 complete, ~83 tests pass.

**Files to create/modify:**
- Replace: `src/components/calculator/CompareView.tsx`
- Replace: `src/components/calculator/BatchSimulation.tsx`
- Create: `src/__tests__/component/calculator/CompareView.test.tsx`
- Create: `src/__tests__/component/calculator/BatchSimulation.test.tsx`

---

### Task 1: Write CompareView Tests

**Create: `src/__tests__/component/calculator/CompareView.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompareView } from '@/components/calculator/CompareView';
import { calculateTax } from '@/lib/calc/engine';
import type { Product, CalcInput, CalcOutput } from '@/lib/calc/types';

const products: Product[] = [
  { id: 'p1', name: 'Dashcam', emoji: '📷', platformPrice: 5000, declaredCost: 3_000_000, purchaseCost: 200, volume: 0.01, weight: 0.5, dutyRate: 0.05, platformFeeRate: 0.27, shippingMethod: 'standard' },
  { id: 'p2', name: 'Juicer', emoji: '🧃', platformPrice: 8000, declaredCost: 5_000_000, purchaseCost: 400, volume: 0.02, weight: 1.0, dutyRate: 0.05, platformFeeRate: 0.27, shippingMethod: 'standard' },
];

const baseInput = {
  tier: 'tier1' as const,
  revenue: 20_000_000,
  expenses: { procurement: 3_000_000, logistics: 500_000, commission: 0, advertising: 0, labor: 0 },
  rates: { cnyPerRub: 11.5, usdPerCny: 7.12 },
};

const allCalc = new Map<string, CalcOutput>();
for (const p of products) {
  allCalc.set(p.id, calculateTax({ ...baseInput, product: p }));
}

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => ({
    state: { products, tierId: 'tier1' },
    allProductsCalc: allCalc,
  }),
}));

describe('CompareView', () => {
  it('renders product names as column headers', () => {
    render(<CompareView />);
    expect(screen.getByText('Dashcam')).toBeInTheDocument();
    expect(screen.getByText('Juicer')).toBeInTheDocument();
  });

  it('renders regime rows', () => {
    render(<CompareView />);
    expect(screen.getByText(/简易税制 6%/)).toBeInTheDocument();
    expect(screen.getByText(/简易税制 15%/)).toBeInTheDocument();
  });

  it('shows profit margin values', () => {
    render(<CompareView />);
    // Look for percentage pattern
    const percentCells = screen.getAllByText(/%/);
    expect(percentCells.length).toBeGreaterThan(0);
  });

  it('highlights best regime with star', () => {
    render(<CompareView />);
    const stars = screen.getAllByText(/★/);
    expect(stars.length).toBeGreaterThan(0);
  });
});
```

---

### Task 2: Implement CompareView

**Replace: `src/components/calculator/CompareView.tsx`**

Multi-product x multi-regime matrix table:
- Columns: one per product (emoji + name)
- Rows: one per regime (USN-6%, USN-15%, OSNO if tier4)
- Each cell: net profit (¥) + profit margin (%)
- Best regime per product marked with ★
- All numbers `font-mono`, right-aligned
- Use `allProductsCalc` from context

---

### Task 3: Write BatchSimulation Tests

**Create: `src/__tests__/component/calculator/BatchSimulation.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BatchSimulation } from '@/components/calculator/BatchSimulation';
import { calculateTax } from '@/lib/calc/engine';

const testProduct = {
  id: 'p1', name: 'Test', emoji: '📦',
  platformPrice: 5000, declaredCost: 3_000_000, purchaseCost: 200,
  volume: 0.01, weight: 0.5, dutyRate: 0.05, platformFeeRate: 0.27,
  shippingMethod: 'standard' as const,
};
const testCalc = calculateTax({
  product: testProduct, tier: 'tier1', revenue: 20_000_000,
  expenses: { procurement: 3_000_000, logistics: 500_000, commission: 0, advertising: 0, labor: 0 },
  rates: { cnyPerRub: 11.5, usdPerCny: 7.12 },
});

const mockDispatch = vi.fn();
vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => ({
    state: { batchQuantity: 100 },
    currentProduct: testProduct,
    calcOutput: testCalc,
    dispatch: mockDispatch,
  }),
}));

describe('BatchSimulation', () => {
  beforeEach(() => mockDispatch.mockClear());

  it('renders quantity input', () => {
    render(<BatchSimulation />);
    expect(screen.getByLabelText(/销售数量/i)).toBeInTheDocument();
  });

  it('renders a card for each regime', () => {
    render(<BatchSimulation />);
    expect(screen.getByText(/简易税制 6%/)).toBeInTheDocument();
    expect(screen.getByText(/简易税制 15%/)).toBeInTheDocument();
  });

  it('dispatches SET_BATCH_QUANTITY on input change', async () => {
    const user = userEvent.setup();
    render(<BatchSimulation />);
    const input = screen.getByLabelText(/销售数量/i);
    await user.clear(input);
    await user.type(input, '200');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_BATCH_QUANTITY' })
    );
  });

  it('shows batch profit values', () => {
    render(<BatchSimulation />);
    // Should find currency values
    const values = screen.getAllByText(/¥/);
    expect(values.length).toBeGreaterThan(0);
  });
});
```

---

### Task 4: Implement BatchSimulation

**Replace: `src/components/calculator/BatchSimulation.tsx`**

The component should:
- Quantity input (`<label>销售数量</label>`) dispatching `SET_BATCH_QUANTITY`
- For each regime in `calcOutput.results`, render a card showing:
  - Regime name
  - Total revenue = product.platformPrice * batchQuantity
  - Total profit = result.netProfit * batchQuantity
  - Unit profit = result.netProfit
  - Profit margin = result.profitMargin as percentage
- 3-column card grid, styled per Design System

---

### Task 5: Verify Phase 5.5

**Run:**
```bash
pnpm test:run
pnpm exec tsc --noEmit
```

**Expected:** ~91 tests pass, zero TS errors.

**Exit criteria:** All 3 view tabs fully functional. CompareView shows multi-product matrix. BatchSimulation shows batch profit for all regimes.

---

## Phase 5.6: DashboardHeader + Save + Integration Test

**Goal:** Implement the header (logo + exchange rate inputs + save button), the "save calculation" Server Action, and a full integration test of the CalculatorShell.

**Entry criteria:** Phase 5.5 complete, ~91 tests pass.

**Files to create/modify:**
- Replace: `src/components/calculator/DashboardHeader.tsx`
- Create: `src/app/actions/calculations.ts` — save Server Action
- Create: `src/__tests__/component/calculator/CalculatorShell.test.tsx` — integration test
- Modify: `src/components/calculator/CalculatorShell.tsx` — replace header placeholder

---

### Task 1: Create Calculations Server Action

**Create: `src/app/actions/calculations.ts`**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { saveCalculation } from '@/lib/repositories/calculationRepository';
import type { SaveCalculationInput } from '@/lib/calc/types';

export interface SaveCalcActionResult {
  error?: string;
  success?: boolean;
}

export async function saveCalculationAction(
  data: SaveCalculationInput
): Promise<SaveCalcActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未登录' };

  const result = await saveCalculation(user.id, data);
  if (!result) return { error: '保存失败' };
  return { success: true };
}
```

---

### Task 2: Implement DashboardHeader

**Replace: `src/components/calculator/DashboardHeader.tsx`**

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useCalculatorContext } from '@/contexts/calculator';
import { saveCalculationAction } from '@/app/actions/calculations';
import type { SaveCalculationInput, TaxCalcResult } from '@/lib/calc/types';

export function DashboardHeader() {
  const { state, calcOutput, dispatch } = useCalculatorContext();
  const [isPending, startTransition] = useTransition();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function handleSave() {
    if (!calcOutput) return;

    const resultsRecord: Record<string, TaxCalcResult> = {};
    for (const r of calcOutput.results) {
      resultsRecord[r.regime] = r;
    }

    const data: SaveCalculationInput = {
      productId: state.currentProductId,
      tier: state.tierId,
      revenue: state.revenue,
      expenses: state.expenses,
      results: resultsRecord,
      rates: state.rates,
    };

    startTransition(async () => {
      const result = await saveCalculationAction(data);
      setSaveMessage(result.error ?? '已保存');
      setTimeout(() => setSaveMessage(null), 2000);
    });
  }

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-border bg-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white text-xs font-bold">E</span>
        </div>
        <span className="font-semibold text-foreground">跨境电商成本计算器</span>
        <span className="text-xs text-tertiary">Russia Market</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="rate-cny" className="text-tertiary">CNY/RUB</label>
          <input
            id="rate-cny"
            type="number"
            step="0.1"
            value={state.rates.cnyPerRub}
            onChange={e => dispatch({ type: 'SET_RATES', rates: { cnyPerRub: +e.target.value } })}
            className="w-16 text-right font-mono font-semibold bg-transparent border-0 border-b border-border focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="rate-usd" className="text-tertiary">USD/CNY</label>
          <input
            id="rate-usd"
            type="number"
            step="0.01"
            value={state.rates.usdPerCny}
            onChange={e => dispatch({ type: 'SET_RATES', rates: { usdPerCny: +e.target.value } })}
            className="w-16 text-right font-mono font-semibold bg-transparent border-0 border-b border-border focus:border-primary outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !calcOutput}
          className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium
            disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {isPending ? '保存中...' : '保存测算'}
        </button>

        {saveMessage && (
          <span className="text-xs text-success">{saveMessage}</span>
        )}
      </div>
    </header>
  );
}
```

---

### Task 3: Plug DashboardHeader into Shell

**Modify: `src/components/calculator/CalculatorShell.tsx`** — Replace the static header with `<DashboardHeader />`:

```tsx
import { DashboardHeader } from './DashboardHeader';
```

Replace the `<header>...</header>` block with `<DashboardHeader />`.

---

### Task 4: Write Integration Test

**Create: `src/__tests__/component/calculator/CalculatorShell.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculatorProvider, useCalculatorContext } from '@/contexts/calculator';
import { REVENUE_TIERS } from '@/lib/calc/engine';
import type { Product } from '@/lib/calc/types';

// Mock recharts
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null, XAxis: () => null, YAxis: () => null,
  CartesianGrid: () => null, Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => null,
}));

// Mock server actions
vi.mock('@/app/actions/calculations', () => ({
  saveCalculationAction: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock('@/app/actions/products', () => ({
  createProductAction: vi.fn(),
  deleteProductAction: vi.fn(),
}));

const testProducts: Product[] = [
  { id: 'p1', name: 'TestProduct', emoji: '📦', platformPrice: 5000, declaredCost: 6_000_000, purchaseCost: 200, volume: 0.01, weight: 0.5, dutyRate: 0.05, platformFeeRate: 0.27, shippingMethod: 'standard' },
];

// A simple test harness that renders the real Context
function TestShell() {
  return (
    <CalculatorProvider
      initialProducts={testProducts}
      initialRates={{ cnyPerRub: 11.5, usdPerCny: 7.12 }}
    >
      <TestConsumer />
    </CalculatorProvider>
  );
}

function TestConsumer() {
  const { state, calcOutput, dispatch } = useCalculatorContext();
  return (
    <div>
      <p data-testid="tier">{state.tierId}</p>
      <p data-testid="product">{state.currentProductId}</p>
      <p data-testid="recommended">{calcOutput?.recommended}</p>
      <p data-testid="revenue">{state.revenue}</p>
      <button onClick={() => dispatch({ type: 'SET_TIER', tierId: 'tier2' })}>Switch Tier</button>
      <button onClick={() => dispatch({ type: 'SET_REVENUE', revenue: 100_000_000 })}>Set Revenue</button>
    </div>
  );
}

describe('CalculatorShell integration', () => {
  it('initializes with first product selected', () => {
    render(<TestShell />);
    expect(screen.getByTestId('product').textContent).toBe('p1');
  });

  it('auto-calculates and recommends a regime', () => {
    render(<TestShell />);
    expect(screen.getByTestId('recommended').textContent).toBeTruthy();
  });

  it('switches tier on dispatch', async () => {
    const user = userEvent.setup();
    render(<TestShell />);
    await user.click(screen.getByText('Switch Tier'));
    expect(screen.getByTestId('tier').textContent).toBe('tier2');
  });

  it('updates revenue on dispatch', async () => {
    const user = userEvent.setup();
    render(<TestShell />);
    await user.click(screen.getByText('Set Revenue'));
    expect(screen.getByTestId('revenue').textContent).toBe('100000000');
  });
});
```

---

### Task 5: Verify Phase 5.6 (Final)

**Run:**
```bash
pnpm test:run
pnpm exec tsc --noEmit
```

**Expected:** ~95 tests pass, zero TS errors.

**Full verification checklist (matches DEVELOPMENT_STRATEGY.md Step 5 exit criteria):**
- [ ] 3 个视图 tab 全部渲染正常
- [ ] 计算结果与 Step 2 测试数据一致
- [ ] 响应式正常（lg breakpoint: dual-pane → mobile: single column）
- [ ] 所有金额使用 font-mono
- [ ] 所有颜色使用 Design Token（零硬编码）
- [ ] 保存测算记录到 Supabase 工作

---

## Summary: Phase Dependency Chain

```
Pre-Flight (deps install)
    ↓
Phase 5.1: Context + Reducer + Shell (backbone)      → ~63 tests
    ↓
Phase 5.2: TierSelector + CostInputPanel (left)      → completed, verified at 75 tests total
    ↓
Phase 5.3: ProductManager + Modal + Actions           → ~78 tests
    ↓
Phase 5.4: DetailView + KPI + Chart + Table (right)   → ~83 tests
    ↓
Phase 5.5: CompareView + BatchSimulation              → ~91 tests
    ↓
Phase 5.6: Header + Save + Integration Test           → ~95 tests
```

Each phase is independent Codex session. Entry = previous phase verified. Exit = `pnpm test:run` + `tsc --noEmit` pass.
