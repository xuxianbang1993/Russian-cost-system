import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProductFormModal } from '@/components/calculator/ProductFormModal';
import type { Product, ProductWriteInput } from '@/lib/calc/types';

const product: Product = {
  id: 'product-1',
  name: 'Desk Lamp',
  emoji: '📦',
  platformPrice: 599.5,
  declaredCost: 280.5,
  purchaseCost: 120.25,
  volume: 0.5,
  weight: 1.2,
  dutyRate: 0.12,
  platformFeeRate: 0.19,
  shippingMethod: 'east',
};

const writeInput: ProductWriteInput = {
  name: 'Desk Lamp',
  emoji: '📦',
  platformPrice: 599.5,
  declaredCost: 280.5,
  purchaseCost: 120.25,
  volume: 0.5,
  weight: 1.2,
  dutyRate: 0.12,
  platformFeeRate: 0.19,
  shippingMethod: 'east',
};

const onSubmit = vi.fn();
const onClose = vi.fn();

function renderModal(props: Partial<Parameters<typeof ProductFormModal>[0]> = {}) {
  return render(
    <ProductFormModal
      isOpen
      mode="create"
      onClose={onClose}
      onSubmit={onSubmit}
      {...props}
    />
  );
}

describe('ProductFormModal', () => {
  beforeEach(() => {
    onSubmit.mockReset();
    onClose.mockReset();
  });

  it('opens the native dialog when requested', () => {
    renderModal();

    const dialog = screen.getByRole('dialog', { name: '添加商品' });

    expect(dialog).toHaveProperty('open', true);
  });

  it('renders create mode fields with defaults', () => {
    renderModal();

    expect(screen.getByLabelText('商品图标')).toHaveValue('📦');
    expect(screen.getByLabelText('商品名称')).toHaveValue('');
    expect(screen.getByLabelText('商品售价')).toHaveValue(null);
    expect(screen.getByLabelText('物流方式')).toHaveValue('standard');
  });

  it('prefills edit mode values and converts rates to percentages', () => {
    renderModal({ mode: 'edit', product });

    expect(screen.getByLabelText('商品名称')).toHaveValue('Desk Lamp');
    expect(screen.getByLabelText('关税率 (%)')).toHaveValue(12);
    expect(screen.getByLabelText('平台佣金率 (%)')).toHaveValue(19);
    expect(screen.getByLabelText('物流方式')).toHaveValue('east');
  });

  it('submits converted write input', async () => {
    const user = userEvent.setup();
    renderModal({ mode: 'edit', product });

    await user.click(screen.getByRole('button', { name: '保存商品' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(writeInput));
  });

  it('blocks submission when validation fails', async () => {
    const user = userEvent.setup();
    renderModal({ mode: 'edit', product });

    await user.clear(screen.getByLabelText('商品名称'));
    await user.click(screen.getByRole('button', { name: '保存商品' }));

    expect(await screen.findByText('商品名称不能为空')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onClose from the cancel button', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: '取消' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
