'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useForm, type DefaultValues } from 'react-hook-form';

import type { Product, ProductWriteInput } from '@/lib/calc/types';
import {
  type ProductFormInput,
  productFormSchema,
  toProductWriteInput,
} from '@/lib/schemas/product';
import { cn } from '@/lib/utils';

interface ProductFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  product?: Product | null;
  onClose: () => void;
  onSubmit: (input: ProductWriteInput) => Promise<void> | void;
}

const EMPTY_VALUES: DefaultValues<ProductFormInput> = {
  name: '',
  emoji: '📦',
  platformPrice: undefined,
  declaredCost: undefined,
  purchaseCost: undefined,
  volume: undefined,
  weight: undefined,
  dutyRate: undefined,
  platformFeeRate: undefined,
  shippingMethod: 'standard',
};

const inputClassName =
  'w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary';
const numberInputClassName = `${inputClassName} text-right font-mono`;

function getDefaultValues(product: Product | null | undefined): DefaultValues<ProductFormInput> {
  if (!product) return EMPTY_VALUES;

  return {
    name: product.name,
    emoji: product.emoji,
    platformPrice: product.platformPrice,
    declaredCost: product.declaredCost,
    purchaseCost: product.purchaseCost,
    volume: product.volume,
    weight: product.weight,
    dutyRate: product.dutyRate * 100,
    platformFeeRate: product.platformFeeRate * 100,
    shippingMethod: product.shippingMethod,
  };
}

export function ProductFormModal(props: ProductFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const defaultValues = useMemo(() => getDefaultValues(props.product), [props.product]);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ProductFormInput>({
    defaultValues,
    resolver: zodResolver(productFormSchema),
  });
  const title = props.mode === 'edit' ? '编辑商品' : '添加商品';

  useEffect(() => {
    if (props.isOpen) {
      reset(defaultValues);
      if (dialogRef.current?.open) return;
      dialogRef.current?.showModal();
      return;
    }

    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [defaultValues, props.isOpen, reset]);

  async function submit(values: ProductFormInput) {
    await props.onSubmit(toProductWriteInput(values));
  }

  return (
    <dialog
      aria-label={title}
      className="w-[min(92vw,42rem)] rounded-md border border-border bg-surface p-0 text-foreground shadow-[var(--shadow-lg)] backdrop:bg-foreground/30"
      onCancel={props.onClose}
      ref={dialogRef}
    >
      <form className="space-y-5 p-5" onSubmit={handleSubmit(submit)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">维护 SKU 成本和费率参数。</p>
          </div>
          <button
            aria-label="关闭"
            className="rounded-sm px-2 py-1 text-sm text-tertiary hover:bg-primary-light hover:text-primary"
            onClick={props.onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[5rem_1fr]">
            <FieldError label="商品图标" message={errors.emoji?.message}>
              <input className={inputClassName} {...register('emoji')} />
            </FieldError>
            <FieldError label="商品名称" message={errors.name?.message}>
              <input className={inputClassName} {...register('name')} />
            </FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <NumberFieldError label="商品售价" message={errors.platformPrice?.message}>
              <input
                className={numberInputClassName}
                step="0.01"
                type="number"
                {...register('platformPrice', { valueAsNumber: true })}
              />
            </NumberFieldError>
            <NumberFieldError label="申报成本" message={errors.declaredCost?.message}>
              <input
                className={numberInputClassName}
                step="0.01"
                type="number"
                {...register('declaredCost', { valueAsNumber: true })}
              />
            </NumberFieldError>
            <NumberFieldError label="采购成本" message={errors.purchaseCost?.message}>
              <input
                className={numberInputClassName}
                step="0.01"
                type="number"
                {...register('purchaseCost', { valueAsNumber: true })}
              />
            </NumberFieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <NumberFieldError label="体积" message={errors.volume?.message}>
              <input
                className={numberInputClassName}
                step="0.001"
                type="number"
                {...register('volume', { valueAsNumber: true })}
              />
            </NumberFieldError>
            <NumberFieldError label="重量" message={errors.weight?.message}>
              <input
                className={numberInputClassName}
                step="0.001"
                type="number"
                {...register('weight', { valueAsNumber: true })}
              />
            </NumberFieldError>
            <NumberFieldError label="关税率 (%)" message={errors.dutyRate?.message}>
              <input
                className={numberInputClassName}
                step="0.01"
                type="number"
                {...register('dutyRate', { valueAsNumber: true })}
              />
            </NumberFieldError>
            <NumberFieldError label="平台佣金率 (%)" message={errors.platformFeeRate?.message}>
              <input
                className={numberInputClassName}
                step="0.01"
                type="number"
                {...register('platformFeeRate', { valueAsNumber: true })}
              />
            </NumberFieldError>
          </div>

          <FieldError label="物流方式" message={errors.shippingMethod?.message}>
            <select className={inputClassName} {...register('shippingMethod')}>
              <option value="standard">标准物流</option>
              <option value="east">远东仓物流</option>
            </select>
          </FieldError>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button
            className="rounded-sm border border-border px-4 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary"
            onClick={props.onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            保存商品
          </button>
        </div>
      </form>
    </dialog>
  );
}

interface FieldErrorProps {
  children: ReactNode;
  label: string;
  message?: string;
}

function FieldError(props: FieldErrorProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{props.label}</span>
      {props.children}
      <ErrorMessage message={props.message} />
    </label>
  );
}

function NumberFieldError(props: FieldErrorProps) {
  return (
    <FieldError label={props.label} message={props.message}>
      <div className={cn('font-mono', props.message ? 'text-destructive' : 'text-foreground')}>
        {props.children}
      </div>
    </FieldError>
  );
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="block text-xs text-destructive">{message}</span>;
}
