import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProductManager from '@/components/calculator/ProductManager';
import type { CalculatorContextValue } from '@/contexts/calculator/types';
import type { Product } from '@/lib/calc/types';

const { mockCreateProductAction, mockUpdateProductAction, mockDeleteProductAction } = vi.hoisted(
  () => ({
    mockCreateProductAction: vi.fn(),
    mockUpdateProductAction: vi.fn(),
    mockDeleteProductAction: vi.fn(),
  })
);

vi.mock('@/app/actions/products', () => ({
  createProductAction: mockCreateProductAction,
  updateProductAction: mockUpdateProductAction,
  deleteProductAction: mockDeleteProductAction,
}));

const mockDispatch = vi.fn();

const products: Product[] = [
  {
    id: 'product-1',
    name: 'Desk Lamp',
    emoji: '💡',
    platformPrice: 599.5,
    declaredCost: 280.5,
    purchaseCost: 120.25,
    volume: 0.5,
    weight: 1.2,
    dutyRate: 0.12,
    platformFeeRate: 0.19,
    shippingMethod: 'standard',
  },
  {
    id: 'product-2',
    name: 'Storage Box',
    emoji: '📦',
    platformPrice: 199,
    declaredCost: 80,
    purchaseCost: 40,
    volume: 0.2,
    weight: 0.8,
    dutyRate: 0.08,
    platformFeeRate: 0.12,
    shippingMethod: 'east',
  },
];

let mockContext: CalculatorContextValue;

function createContext(productList: Product[] = products): CalculatorContextValue {
  return {
    state: {
      tierId: 'tier1',
      products: productList,
      currentProductId: productList[0]?.id ?? null,
      expenses: {
        procurement: 0,
        logistics: 0,
        commission: 0,
        advertising: 0,
        labor: 0,
      },
      rates: { cnyPerRub: 11.5, usdPerCny: 7.12 },
      activeView: 'detail',
      batchQuantity: 1,
      revenue: 20_000_000,
    },
    dispatch: mockDispatch,
    currentProduct: productList[0] ?? null,
    calcOutput: null,
    allProductsCalc: new Map(),
  };
}

vi.mock('@/contexts/calculator', () => ({
  useCalculatorContext: () => mockContext,
}));

describe('ProductManager', () => {
  beforeEach(() => {
    mockDispatch.mockReset();
    mockCreateProductAction.mockReset();
    mockUpdateProductAction.mockReset();
    mockDeleteProductAction.mockReset();
    mockContext = createContext();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => undefined);
  });

  it('renders empty state and add button', () => {
    mockContext = createContext([]);

    render(<ProductManager />);

    expect(screen.getByText('暂无商品')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加商品' })).toBeInTheDocument();
  });

  it('marks selected chip with aria-pressed', () => {
    render(<ProductManager />);

    expect(screen.getByRole('button', { name: '💡 Desk Lamp' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: '📦 Storage Box' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('dispatches SET_PRODUCT when a chip is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductManager />);

    await user.click(screen.getByRole('button', { name: '📦 Storage Box' }));

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_PRODUCT', productId: 'product-2' });
  });

  it('opens edit mode from double click and explicit edit button', async () => {
    const user = userEvent.setup();
    render(<ProductManager />);

    await user.dblClick(screen.getByRole('button', { name: '💡 Desk Lamp' }));
    expect(screen.getByLabelText('商品名称')).toHaveValue('Desk Lamp');

    await user.click(screen.getByRole('button', { name: '取消' }));
    await user.click(screen.getByRole('button', { name: '编辑 Storage Box' }));

    expect(screen.getByLabelText('商品名称')).toHaveValue('Storage Box');
  });

  it('deletes a product after confirmation', async () => {
    const user = userEvent.setup();
    mockDeleteProductAction.mockResolvedValue({ ok: true, data: { id: 'product-1' } });
    render(<ProductManager />);

    await user.click(screen.getByRole('button', { name: '删除 Desk Lamp' }));

    await waitFor(() => {
      expect(mockDeleteProductAction).toHaveBeenCalledWith('product-1');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'REMOVE_PRODUCT',
        productId: 'product-1',
      });
    });
  });

  it('creates a product and dispatches ADD_PRODUCT on success', async () => {
    const user = userEvent.setup();
    const createdProduct: Product = {
      ...products[1],
      id: 'product-3',
      name: 'New Product',
    };
    mockCreateProductAction.mockResolvedValue({ ok: true, data: createdProduct });
    render(<ProductManager />);

    await user.click(screen.getByRole('button', { name: '添加商品' }));
    await user.type(screen.getByLabelText('商品名称'), 'New Product');
    await user.type(screen.getByLabelText('商品售价'), '199');
    await user.type(screen.getByLabelText('申报成本'), '80');
    await user.type(screen.getByLabelText('采购成本'), '40');
    await user.type(screen.getByLabelText('体积'), '0.2');
    await user.type(screen.getByLabelText('重量'), '0.8');
    await user.type(screen.getByLabelText('关税率 (%)'), '8');
    await user.type(screen.getByLabelText('平台佣金率 (%)'), '12');
    await user.click(screen.getByRole('button', { name: '保存商品' }));

    await waitFor(() => {
      expect(mockCreateProductAction).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New Product' })
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_PRODUCT',
        product: createdProduct,
      });
    });
  });

  it('updates a product and dispatches the persisted product', async () => {
    const user = userEvent.setup();
    const updatedProduct: Product = {
      ...products[0],
      name: 'Updated Lamp',
      platformPrice: 699,
    };
    mockUpdateProductAction.mockResolvedValue({ ok: true, data: updatedProduct });
    render(<ProductManager />);

    await user.click(screen.getByRole('button', { name: '编辑 Desk Lamp' }));
    await user.clear(screen.getByLabelText('商品名称'));
    await user.type(screen.getByLabelText('商品名称'), 'Updated Lamp');
    await user.click(screen.getByRole('button', { name: '保存商品' }));

    await waitFor(() => {
      expect(mockUpdateProductAction).toHaveBeenCalledWith(
        'product-1',
        expect.objectContaining({ name: 'Updated Lamp' })
      );
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_PRODUCT',
        productId: 'product-1',
        updates: updatedProduct,
      });
    });
  });
});
