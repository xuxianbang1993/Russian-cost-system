'use server';

import type { Product } from '@/lib/calc/types';
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '@/lib/repositories/productRepository';
import { productUpdateSchema, productWriteSchema } from '@/lib/schemas/product';
import { createClient } from '@/lib/supabase/server';

export type ProductActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createProductAction(
  input: unknown
): Promise<ProductActionResult<Product>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: '请先登录' };

  const validation = productWriteSchema.safeParse(input);
  if (!validation.success) return { ok: false, error: getFirstValidationMessage(validation.error) };

  try {
    const product = await createProduct(userId, validation.data);
    if (!product) return { ok: false, error: '商品创建失败' };
    return { ok: true, data: product };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function updateProductAction(
  id: string,
  input: unknown
): Promise<ProductActionResult<Product>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: '请先登录' };

  const validation = productUpdateSchema.safeParse(input);
  if (!validation.success) return { ok: false, error: getFirstValidationMessage(validation.error) };

  try {
    const product = await updateProduct(userId, id, validation.data);
    return { ok: true, data: product };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function deleteProductAction(
  id: string
): Promise<ProductActionResult<{ id: string }>> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false, error: '请先登录' };

  try {
    await deleteProduct(userId, id);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function getFirstValidationMessage(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? '提交内容无效，请检查后重试。';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '操作失败，请稍后重试';
}
