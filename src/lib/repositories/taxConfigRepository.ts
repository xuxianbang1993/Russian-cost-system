import type { TaxConfigEntity, TaxConfigUpsertInput } from '@/lib/calc/types';
import { taxConfigRowToEntity } from '@/lib/supabase/adapters';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type TaxConfigRow = Database['public']['Tables']['tax_config']['Row'];
type TaxConfigInsert = Database['public']['Tables']['tax_config']['Insert'];

function isTaxConfigEntity(config: TaxConfigEntity | null): config is TaxConfigEntity {
  return config !== null;
}

export async function getTaxConfig(
  tier: string,
  regime: string
): Promise<TaxConfigEntity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tax_config')
    .select('*')
    .eq('tier', tier)
    .eq('regime', regime)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return taxConfigRowToEntity(data);
}

export async function getAllTaxConfigs(): Promise<TaxConfigEntity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tax_config')
    .select('*')
    .order('effective_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: TaxConfigRow) => taxConfigRowToEntity(row)).filter(isTaxConfigEntity);
}

export async function upsertTaxConfig(
  data: TaxConfigUpsertInput
): Promise<TaxConfigEntity | null> {
  const supabase = await createClient();
  const payload: TaxConfigInsert = {
    tier: data.tier,
    regime: data.regime,
    params: data.params as Json,
    effective_date: data.effectiveDate,
    created_by: data.createdBy ?? null,
  };
  const { data: row, error } = await supabase
    .from('tax_config')
    .upsert(payload, {
      onConflict: 'tier,regime,effective_date',
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return taxConfigRowToEntity(row);
}
