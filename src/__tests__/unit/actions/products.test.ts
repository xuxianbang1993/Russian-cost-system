import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Product, ProductWriteInput } from '@/lib/calc/types';
import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from '@/app/actions/products';

const { mockCreateClient, mockCreateProduct, mockUpdateProduct, mockDeleteProduct } = vi.hoisted(
  () => ({
    mockCreateClient: vi.fn(),
    mockCreateProduct: vi.fn(),
    mockUpdateProduct: vi.fn(),
    mockDeleteProduct: vi.fn(),
  })
);

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}));

vi.mock('@/lib/repositories/productRepository', () => ({
  createProduct: mockCreateProduct,
  updateProduct: mockUpdateProduct,
  deleteProduct: mockDeleteProduct,
}));

const validInput: ProductWriteInput = {
  name: 'Desk Lamp',
  emoji: '📦',
  platformPrice: 599.5,
  declaredCost: 280.5,
  purchaseCost: 120.25,
  volume: 0.5,
  weight: 1.2,
  dutyRate: 0.12,
  platformFeeRate: 0.19,
  shippingMethod: 'standard',
};

const product: Product = {
  id: 'product-1',
  ...validInput,
};

function mockUser(userId: string | null = 'user-1') {
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  });
}

describe('product server actions', () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockCreateProduct.mockReset();
    mockUpdateProduct.mockReset();
    mockDeleteProduct.mockReset();
    mockUser();
  });

  it('requires authentication before creating a product', async () => {
    mockUser(null);

    await expect(createProductAction(validInput)).resolves.toEqual({
      ok: false,
      error: '请先登录',
    });
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it('returns the first validation message for invalid create input', async () => {
    const result = await createProductAction({ ...validInput, name: '' });

    expect(result).toEqual({ ok: false, error: '商品名称不能为空' });
    expect(mockCreateProduct).not.toHaveBeenCalled();
  });

  it('returns a create failure when repository returns null', async () => {
    mockCreateProduct.mockResolvedValue(null);

    await expect(createProductAction(validInput)).resolves.toEqual({
      ok: false,
      error: '商品创建失败',
    });
  });

  it('creates a product for the authenticated user', async () => {
    mockCreateProduct.mockResolvedValue(product);

    await expect(createProductAction(validInput)).resolves.toEqual({
      ok: true,
      data: product,
    });
    expect(mockCreateProduct).toHaveBeenCalledWith('user-1', validInput);
  });

  it('rejects invalid update input', async () => {
    const result = await updateProductAction('product-1', { ...validInput, dutyRate: 2 });

    expect(result).toEqual({ ok: false, error: '关税率不能大于 100%' });
    expect(mockUpdateProduct).not.toHaveBeenCalled();
  });

  it('updates a product for the authenticated user', async () => {
    mockUpdateProduct.mockResolvedValue(product);

    await expect(updateProductAction('product-1', validInput)).resolves.toEqual({
      ok: true,
      data: product,
    });
    expect(mockUpdateProduct).toHaveBeenCalledWith('user-1', 'product-1', validInput);
  });

  it('deletes a product for the authenticated user and surfaces repository errors', async () => {
    mockDeleteProduct.mockRejectedValue(new Error('delete failed'));

    await expect(deleteProductAction('product-1')).resolves.toEqual({
      ok: false,
      error: 'delete failed',
    });
    expect(mockDeleteProduct).toHaveBeenCalledWith('user-1', 'product-1');
  });
});
