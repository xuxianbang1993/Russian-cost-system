import type { CalculationEntity, SaveCalculationInput } from '@/lib/calc/types';
import { calculationRowToEntity } from '@/lib/supabase/adapters';
import type { Database, Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';

type CalculationRow = Database['public']['Tables']['calculations']['Row'];
type CalculationInsert = Database['public']['Tables']['calculations']['Insert'];

function isCalculationEntity(
  calculation: CalculationEntity | null
): calculation is CalculationEntity {
  return calculation !== null;
}

function toExpensesJson(expenses: SaveCalculationInput['expenses']): Json {
  return {
    procurement: expenses.procurement,
    logistics: expenses.logistics,
    commission: expenses.commission,
    advertising: expenses.advertising,
    labor: expenses.labor,
  };
}

function toResultsJson(results: SaveCalculationInput['results']): Json {
  return Object.fromEntries(
    Object.entries(results).map(([key, value]) => [
      key,
      {
        regime: value.regime,
        customsVat: value.customsVat,
        incomeTax: value.incomeTax,
        additionalVat: value.additionalVat,
        totalTax: value.totalTax,
        taxRate: value.taxRate,
        netProfit: value.netProfit,
        profitMargin: value.profitMargin,
      },
    ])
  ) as unknown as Json;
}

function toRatesJson(rates: SaveCalculationInput['rates']): Json {
  return {
    cnyPerRub: rates.cnyPerRub,
    usdPerCny: rates.usdPerCny,
  };
}

export async function saveCalculation(
  userId: string,
  data: SaveCalculationInput
): Promise<CalculationEntity | null> {
  const supabase = await createClient();
  const payload: CalculationInsert = {
    user_id: userId,
    product_id: data.productId ?? null,
    tier: data.tier,
    revenue: data.revenue,
    expenses: toExpensesJson(data.expenses),
    results: toResultsJson(data.results),
    rates: toRatesJson(data.rates),
  };
  const { data: row, error } = await supabase
    .from('calculations')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return calculationRowToEntity(row);
}

export async function getCalculations(userId: string): Promise<CalculationEntity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('calculations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row: CalculationRow) => calculationRowToEntity(row))
    .filter(isCalculationEntity);
}

export async function getCalculation(id: string): Promise<CalculationEntity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('calculations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return calculationRowToEntity(data);
}
