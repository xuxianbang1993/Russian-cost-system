import { redirect } from 'next/navigation';

import CalculatorShell from '@/components/calculator/CalculatorShell';
import type { ExchangeRates } from '@/lib/calc/types';
import { getProducts } from '@/lib/repositories';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEFAULT_RATES: ExchangeRates = {
  cnyPerRub: 11.5,
  usdPerCny: 7.12,
};

export default async function CalculatorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const initialProducts = await getProducts(user.id);
  return <CalculatorShell initialProducts={initialProducts} initialRates={DEFAULT_RATES} />;
}
