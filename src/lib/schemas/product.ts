import { z } from 'zod';

import type { ProductWriteInput } from '@/lib/calc/types';

const shippingMethodSchema = z.enum(['standard', 'east']);

const productBaseSchema = z.object({
  name: z.string().trim().min(1, '商品名称不能为空').max(50, '商品名称不能超过 50 个字符'),
  emoji: z.string().trim().min(1, '商品图标不能为空').max(4, '商品图标不能超过 4 个字符'),
  platformPrice: z.number().positive('商品售价必须大于 0'),
  declaredCost: z.number().min(0, '申报成本不能小于 0'),
  purchaseCost: z.number().min(0, '采购成本不能小于 0'),
  volume: z.number().min(0, '体积不能小于 0'),
  weight: z.number().min(0, '重量不能小于 0'),
  shippingMethod: shippingMethodSchema,
});

export const productWriteSchema = productBaseSchema.extend({
  dutyRate: z.number().min(0, '关税率不能小于 0').max(1, '关税率不能大于 100%'),
  platformFeeRate: z.number().min(0, '平台佣金率不能小于 0').max(1, '平台佣金率不能大于 100%'),
});

export const productUpdateSchema = productWriteSchema.partial();

export const productFormSchema = productBaseSchema.extend({
  dutyRate: z.number().min(0, '关税率不能小于 0').max(100, '关税率不能大于 100%'),
  platformFeeRate: z.number().min(0, '平台佣金率不能小于 0').max(100, '平台佣金率不能大于 100%'),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductWriteSchemaInput = z.infer<typeof productWriteSchema>;

export function toProductWriteInput(input: ProductFormInput): ProductWriteInput {
  return {
    ...input,
    dutyRate: input.dutyRate / 100,
    platformFeeRate: input.platformFeeRate / 100,
  };
}
