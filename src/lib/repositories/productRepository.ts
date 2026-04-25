import type { Product, ProductUpdateInput, ProductWriteInput } from '@/lib/calc/types';
import { productEntityToRow, productRowToEntity } from '@/lib/supabase/adapters';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

function isProduct(product: Product | null): product is Product {
  return product !== null;
}

export async function getProducts(userId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: ProductRow) => productRowToEntity(row)).filter(isProduct);
}

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return productRowToEntity(data);
}

export async function createProduct(
  userId: string,
  data: ProductWriteInput
): Promise<Product | null> {
  const supabase = await createClient();
  const payload = {
    user_id: userId,
    ...productEntityToRow(data),
  } as ProductInsert;
  const { data: row, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return productRowToEntity(row);
}

export async function updateProduct(
  userId: string,
  id: string,
  data: ProductUpdateInput
): Promise<Product> {
  const supabase = await createClient();
  const payload: ProductUpdate = {
    ...productEntityToRow(data),
    updated_at: new Date().toISOString(),
  };
  const { data: row, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  const product = productRowToEntity(row);
  if (!product) throw new Error('商品更新失败');
  return product;
}

export async function deleteProduct(userId: string, id: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('商品不存在或无权删除');
}
