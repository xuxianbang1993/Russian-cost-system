import { beforeEach, describe, expect, it, vi } from 'vitest';

import { productEntityToRow, productRowToEntity } from '@/lib/supabase/adapters';
import type { Database } from '@/lib/supabase/database.types';
import { calculationRowToEntity } from '@/lib/supabase/adapters';
import { profileRowToEntity } from '@/lib/supabase/adapters';
import { taxConfigRowToEntity } from '@/lib/supabase/adapters';
import { getCalculation, getCalculations, saveCalculation } from '@/lib/repositories/calculationRepository';
import { getAllProfiles, getProfile, updateProfile } from '@/lib/repositories/profileRepository';
import { createProduct, deleteProduct, getProduct, getProducts, updateProduct } from '@/lib/repositories/productRepository';
import { getAllTaxConfigs, getTaxConfig, upsertTaxConfig } from '@/lib/repositories/taxConfigRepository';

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}));

type QueryResult<T> = {
  data: T;
  error: { code?: string; message: string } | null;
};

interface MockQueryBuilder<T> extends PromiseLike<QueryResult<T>> {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

function createQueryBuilder<T>(result: QueryResult<T>): MockQueryBuilder<T> {
  const builder = {} as MockQueryBuilder<T>;

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn(() => builder);
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.delete = vi.fn(() => builder);
  builder.upsert = vi.fn(() => builder);
  builder.single = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => builder);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);

  return builder;
}

type Tables = Database['public']['Tables'];

const profileRow: Tables['profiles']['Row'] = {
  id: 'user-1',
  email: 'user@example.com',
  display_name: 'Cost User',
  company_name: 'ELS Co',
  role: 'admin',
  created_at: '2026-03-28T10:00:00.000Z',
  updated_at: '2026-03-28T11:00:00.000Z',
};

const productRow: Tables['products']['Row'] = {
  id: 'product-1',
  user_id: 'user-1',
  name: 'Desk Lamp',
  emoji: 'L',
  platform_price: 599.5,
  declared_cost: 280.5,
  purchase_cost: 120.25,
  volume: null,
  weight: null,
  duty_rate: 0.12,
  platform_fee_rate: 0.19,
  shipping_method: 'standard',
  created_at: '2026-03-28T10:00:00.000Z',
  updated_at: '2026-03-28T11:00:00.000Z',
};

const calculationExpenses = {
  procurement: 100,
  logistics: 20,
  commission: 30,
  advertising: 40,
  labor: 50,
};

const calculationResults = {
  usn6: {
    regime: 'usn6' as const,
    customsVat: 10,
    incomeTax: 20,
    additionalVat: 30,
    totalTax: 60,
    taxRate: 0.06,
    netProfit: 200,
    profitMargin: 0.2,
  },
};

const calculationRates = {
  cnyPerRub: 12.3,
  usdPerCny: 7.1,
};

const calculationRow: Tables['calculations']['Row'] = {
  id: 'calc-1',
  user_id: 'user-1',
  product_id: 'product-1',
  tier: 'tier2',
  revenue: 1000000,
  expenses: calculationExpenses,
  results: calculationResults,
  rates: calculationRates,
  created_at: '2026-03-28T10:00:00.000Z',
};

const taxConfigParams = {
  vatRate: 0.05,
  incomeTaxRate: 0.06,
};

const taxConfigRow: Tables['tax_config']['Row'] = {
  id: 'tax-1',
  tier: 'tier2',
  regime: 'usn6',
  params: taxConfigParams,
  effective_date: '2026-01-01',
  created_by: 'user-1',
  created_at: '2026-03-28T10:00:00.000Z',
};

function setupClient(resultByTable: Partial<Record<keyof Tables, QueryResult<unknown>>>) {
  const builders = new Map<keyof Tables, MockQueryBuilder<unknown>>();
  const from = vi.fn((table: keyof Tables) => {
    const result = resultByTable[table] ?? { data: null, error: null };
    const builder = createQueryBuilder(result);
    builders.set(table, builder);
    return builder;
  });

  mockCreateClient.mockResolvedValue({ from });

  return { builders, from };
}

beforeEach(() => {
  mockCreateClient.mockReset();
});

describe('supabase adapters', () => {
  it('maps profile rows from snake_case to camelCase entities', () => {
    expect(profileRowToEntity(profileRow)).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Cost User',
      companyName: 'ELS Co',
      role: 'admin',
      createdAt: '2026-03-28T10:00:00.000Z',
      updatedAt: '2026-03-28T11:00:00.000Z',
    });
  });

  it('returns null for missing profile rows', () => {
    expect(profileRowToEntity(undefined)).toBeNull();
  });

  it('maps product rows and normalizes null numeric values', () => {
    expect(productRowToEntity(productRow)).toEqual({
      id: 'product-1',
      name: 'Desk Lamp',
      emoji: 'L',
      platformPrice: 599.5,
      declaredCost: 280.5,
      purchaseCost: 120.25,
      volume: 0,
      weight: 0,
      dutyRate: 0.12,
      platformFeeRate: 0.19,
      shippingMethod: 'standard',
    });
  });

  it('returns null for missing product rows', () => {
    expect(productRowToEntity(undefined)).toBeNull();
  });

  it('maps product entities back to writable database rows', () => {
    expect(
      productEntityToRow({
        name: 'Desk Lamp',
        emoji: 'L',
        platformPrice: 599.5,
        declaredCost: 280.5,
        purchaseCost: 120.25,
        volume: 0.5,
        weight: 1.2,
        dutyRate: 0.12,
        platformFeeRate: 0.19,
        shippingMethod: 'east',
      })
    ).toEqual({
      name: 'Desk Lamp',
      emoji: 'L',
      platform_price: 599.5,
      declared_cost: 280.5,
      purchase_cost: 120.25,
      volume: 0.5,
      weight: 1.2,
      duty_rate: 0.12,
      platform_fee_rate: 0.19,
      shipping_method: 'east',
    });
  });

  it('maps calculation rows to calculation entities', () => {
    expect(calculationRowToEntity(calculationRow)).toEqual({
      id: 'calc-1',
      userId: 'user-1',
      productId: 'product-1',
      tier: 'tier2',
      revenue: 1000000,
      expenses: calculationExpenses,
      results: calculationResults,
      rates: calculationRates,
      createdAt: '2026-03-28T10:00:00.000Z',
    });
  });

  it('returns null for missing calculation rows', () => {
    expect(calculationRowToEntity(undefined)).toBeNull();
  });

  it('maps tax config rows to entities', () => {
    expect(taxConfigRowToEntity(taxConfigRow)).toEqual({
      id: 'tax-1',
      tier: 'tier2',
      regime: 'usn6',
      params: taxConfigParams,
      effectiveDate: '2026-01-01',
      createdBy: 'user-1',
      createdAt: '2026-03-28T10:00:00.000Z',
    });
  });

  it('returns null for missing tax config rows', () => {
    expect(taxConfigRowToEntity(undefined)).toBeNull();
  });
});

describe('profile repository', () => {
  it('gets a single profile by user id', async () => {
    const { builders, from } = setupClient({
      profiles: { data: profileRow, error: null },
    });

    await expect(getProfile('user-1')).resolves.toEqual({
      id: 'user-1',
      email: 'user@example.com',
      displayName: 'Cost User',
      companyName: 'ELS Co',
      role: 'admin',
      createdAt: '2026-03-28T10:00:00.000Z',
      updatedAt: '2026-03-28T11:00:00.000Z',
    });

    expect(from).toHaveBeenCalledWith('profiles');
    expect(builders.get('profiles')?.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(builders.get('profiles')?.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('updates a profile with snake_case payload fields', async () => {
    const { builders } = setupClient({
      profiles: { data: profileRow, error: null },
    });

    await updateProfile('user-1', {
      displayName: 'Updated Name',
      companyName: 'Updated Co',
    });

    expect(builders.get('profiles')?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: 'Updated Name',
        company_name: 'Updated Co',
      })
    );
  });

  it('lists all profiles', async () => {
    const { builders } = setupClient({
      profiles: { data: [profileRow], error: null },
    });

    await expect(getAllProfiles()).resolves.toHaveLength(1);
    expect(builders.get('profiles')?.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  });
});

describe('product repository', () => {
  it('gets all products for a user', async () => {
    const { builders } = setupClient({
      products: { data: [productRow], error: null },
    });

    await expect(getProducts('user-1')).resolves.toEqual([
      {
        id: 'product-1',
        name: 'Desk Lamp',
        emoji: 'L',
        platformPrice: 599.5,
        declaredCost: 280.5,
        purchaseCost: 120.25,
        volume: 0,
        weight: 0,
        dutyRate: 0.12,
        platformFeeRate: 0.19,
        shippingMethod: 'standard',
      },
    ]);

    expect(builders.get('products')?.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('returns null when a product is missing', async () => {
    setupClient({
      products: { data: null, error: null },
    });

    await expect(getProduct('missing')).resolves.toBeNull();
  });

  it('creates a product with a user id attached', async () => {
    const { builders } = setupClient({
      products: { data: productRow, error: null },
    });

    await createProduct('user-1', {
      name: 'Desk Lamp',
      emoji: 'L',
      platformPrice: 599.5,
      declaredCost: 280.5,
      purchaseCost: 120.25,
      volume: 0.5,
      weight: 1.2,
      dutyRate: 0.12,
      platformFeeRate: 0.19,
      shippingMethod: 'standard',
    });

    expect(builders.get('products')?.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: 'Desk Lamp',
      emoji: 'L',
      platform_price: 599.5,
      declared_cost: 280.5,
      purchase_cost: 120.25,
      volume: 0.5,
      weight: 1.2,
      duty_rate: 0.12,
      platform_fee_rate: 0.19,
      shipping_method: 'standard',
    });
  });

  it('updates only provided product fields', async () => {
    const { builders } = setupClient({
      products: { data: productRow, error: null },
    });

    await expect(updateProduct('user-1', 'product-1', {
      declaredCost: 300,
      shippingMethod: 'east',
    })).resolves.toEqual({
      id: 'product-1',
      name: 'Desk Lamp',
      emoji: 'L',
      platformPrice: 599.5,
      declaredCost: 280.5,
      purchaseCost: 120.25,
      volume: 0,
      weight: 0,
      dutyRate: 0.12,
      platformFeeRate: 0.19,
      shippingMethod: 'standard',
    });

    expect(builders.get('products')?.update).toHaveBeenCalledWith(
      expect.objectContaining({
        declared_cost: 300,
        shipping_method: 'east',
      })
    );
    expect(builders.get('products')?.eq).toHaveBeenCalledWith('id', 'product-1');
    expect(builders.get('products')?.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builders.get('products')?.select).toHaveBeenCalledWith('*');
    expect(builders.get('products')?.single).toHaveBeenCalledTimes(1);
  });

  it('throws when product update affects no rows', async () => {
    setupClient({
      products: { data: null, error: null },
    });

    await expect(updateProduct('user-1', 'missing-product', {
      declaredCost: 300,
    })).rejects.toThrow('商品更新失败');
  });

  it('deletes a product by user id and product id', async () => {
    const { builders } = setupClient({
      products: { data: [{ id: 'product-1' }], error: null },
    });

    await deleteProduct('user-1', 'product-1');

    expect(builders.get('products')?.delete).toHaveBeenCalledTimes(1);
    expect(builders.get('products')?.eq).toHaveBeenCalledWith('id', 'product-1');
    expect(builders.get('products')?.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builders.get('products')?.select).toHaveBeenCalledWith('id');
  });

  it('throws when product delete affects no rows', async () => {
    setupClient({
      products: { data: [], error: null },
    });

    await expect(deleteProduct('user-1', 'missing-product')).rejects.toThrow(
      '商品不存在或无权删除'
    );
  });
});

describe('calculation repository', () => {
  it('saves a calculation row for a user', async () => {
    const { builders } = setupClient({
      calculations: { data: calculationRow, error: null },
    });

    await saveCalculation('user-1', {
      productId: 'product-1',
      tier: 'tier2',
      revenue: 1000000,
      expenses: calculationExpenses,
      results: calculationResults,
      rates: calculationRates,
    });

    expect(builders.get('calculations')?.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      product_id: 'product-1',
      tier: 'tier2',
      revenue: 1000000,
      expenses: calculationExpenses,
      results: calculationResults,
      rates: calculationRates,
    });
  });

  it('lists calculations in reverse chronological order', async () => {
    const { builders } = setupClient({
      calculations: { data: [calculationRow], error: null },
    });

    await expect(getCalculations('user-1')).resolves.toHaveLength(1);
    expect(builders.get('calculations')?.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(builders.get('calculations')?.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  });

  it('gets a single calculation by id', async () => {
    const { builders } = setupClient({
      calculations: { data: calculationRow, error: null },
    });

    await expect(getCalculation('calc-1')).resolves.toEqual({
      id: 'calc-1',
      userId: 'user-1',
      productId: 'product-1',
      tier: 'tier2',
      revenue: 1000000,
      expenses: calculationExpenses,
      results: calculationResults,
      rates: calculationRates,
      createdAt: '2026-03-28T10:00:00.000Z',
    });

    expect(builders.get('calculations')?.eq).toHaveBeenCalledWith('id', 'calc-1');
  });
});

describe('tax config repository', () => {
  it('gets the latest tax config for a tier and regime', async () => {
    const { builders } = setupClient({
      tax_config: { data: taxConfigRow, error: null },
    });

    await expect(getTaxConfig('tier2', 'usn6')).resolves.toEqual({
      id: 'tax-1',
      tier: 'tier2',
      regime: 'usn6',
      params: taxConfigParams,
      effectiveDate: '2026-01-01',
      createdBy: 'user-1',
      createdAt: '2026-03-28T10:00:00.000Z',
    });

    expect(builders.get('tax_config')?.eq).toHaveBeenCalledWith('tier', 'tier2');
    expect(builders.get('tax_config')?.order).toHaveBeenCalledWith('effective_date', {
      ascending: false,
    });
  });

  it('lists all tax configs', async () => {
    const { builders } = setupClient({
      tax_config: { data: [taxConfigRow], error: null },
    });

    await expect(getAllTaxConfigs()).resolves.toHaveLength(1);
    expect(builders.get('tax_config')?.order).toHaveBeenCalledWith('effective_date', {
      ascending: false,
    });
  });

  it('upserts a tax config using the unique constraint columns', async () => {
    const { builders } = setupClient({
      tax_config: { data: taxConfigRow, error: null },
    });

    await upsertTaxConfig({
      tier: 'tier2',
      regime: 'usn6',
      params: taxConfigParams,
      effectiveDate: '2026-01-01',
      createdBy: 'user-1',
    });

    expect(builders.get('tax_config')?.upsert).toHaveBeenCalledWith(
      {
        tier: 'tier2',
        regime: 'usn6',
        params: taxConfigParams,
        effective_date: '2026-01-01',
        created_by: 'user-1',
      },
      {
        onConflict: 'tier,regime,effective_date',
      }
    );
  });
});
