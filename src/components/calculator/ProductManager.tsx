'use client';

import { useState } from 'react';

import {
  createProductAction,
  deleteProductAction,
  updateProductAction,
} from '@/app/actions/products';
import { useCalculatorContext } from '@/contexts/calculator';
import type { Product, ProductWriteInput } from '@/lib/calc/types';
import { ProductFormModal } from '@/components/calculator/ProductFormModal';
import { cn } from '@/lib/utils';

// Phase 5.3: edit 提交全量字段；Phase 5.7 若需字段级 diff 再优化

type ModalState =
  | { isOpen: false; mode: 'create'; product: null }
  | { isOpen: true; mode: 'create'; product: null }
  | { isOpen: true; mode: 'edit'; product: Product };

const CLOSED_MODAL: ModalState = { isOpen: false, mode: 'create', product: null };

export function ProductManager() {
  const { state, dispatch } = useCalculatorContext();
  const [modal, setModal] = useState<ModalState>(CLOSED_MODAL);

  function selectProduct(productId: string) {
    dispatch({ type: 'SET_PRODUCT', productId });
  }

  function openCreate() {
    setModal({ isOpen: true, mode: 'create', product: null });
  }

  function openEdit(product: Product) {
    setModal({ isOpen: true, mode: 'edit', product });
  }

  function closeModal() {
    setModal(CLOSED_MODAL);
  }

  async function submitProduct(input: ProductWriteInput) {
    if (modal.mode === 'create') {
      const result = await createProductAction(input);
      if (!result.ok) {
        window.alert(result.error);
        return;
      }

      dispatch({ type: 'ADD_PRODUCT', product: result.data });
      closeModal();
      return;
    }

    const result = await updateProductAction(modal.product.id, input);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    dispatch({ type: 'UPDATE_PRODUCT', productId: modal.product.id, updates: result.data });
    closeModal();
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`确认删除 ${product.name}？`)) return;

    const result = await deleteProductAction(product.id);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    dispatch({ type: 'REMOVE_PRODUCT', productId: product.id });
  }

  return (
    <section className="space-y-3" id="product-manager">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">商品</p>
          <p className="text-xs text-muted-foreground">选择或维护当前测算 SKU。</p>
        </div>
        <button
          aria-label="添加商品"
          className="inline-flex size-8 items-center justify-center rounded-sm border border-border bg-surface text-lg leading-none text-primary hover:border-primary hover:bg-primary-light"
          onClick={openCreate}
          type="button"
        >
          +
        </button>
      </div>

      {state.products.length > 0 ? (
        <div className="space-y-2">
          {state.products.map((product) => {
            const isCurrent = product.id === state.currentProductId;

            return (
              <div
                className={cn(
                  'grid grid-cols-[1fr_auto_auto] items-center gap-1 rounded-sm border p-1',
                  isCurrent ? 'border-primary bg-primary-light' : 'border-border bg-surface'
                )}
                key={product.id}
              >
                <button
                  aria-label={`${product.emoji} ${product.name}`}
                  aria-pressed={isCurrent}
                  className="min-w-0 rounded-sm px-2 py-2 text-left hover:bg-primary-muted"
                  onClick={() => selectProduct(product.id)}
                  onDoubleClick={() => openEdit(product)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true">{product.emoji}</span>
                    <span className="truncate text-sm font-medium">{product.name}</span>
                  </span>
                  <span className="mt-1 block font-mono text-xs text-muted-foreground">
                    ₽{product.platformPrice.toFixed(0)}
                  </span>
                </button>
                <button
                  aria-label={`编辑 ${product.name}`}
                  className="rounded-sm px-2 py-2 text-xs text-muted-foreground hover:bg-primary-muted hover:text-primary"
                  onClick={() => openEdit(product)}
                  type="button"
                >
                  编辑
                </button>
                <button
                  aria-label={`删除 ${product.name}`}
                  className="rounded-sm px-2 py-2 text-xs text-muted-foreground hover:bg-destructive-light hover:text-destructive"
                  onClick={() => {
                    void deleteProduct(product);
                  }}
                  type="button"
                >
                  删除
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-sm border border-dashed border-border bg-primary-light/40 px-4 py-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">暂无商品</p>
          <p className="mt-1 text-xs">添加商品后即可开始成本测算。</p>
        </div>
      )}

      <ProductFormModal
        isOpen={modal.isOpen}
        mode={modal.mode}
        onClose={closeModal}
        onSubmit={submitProduct}
        product={modal.product}
      />
    </section>
  );
}

export default ProductManager;
