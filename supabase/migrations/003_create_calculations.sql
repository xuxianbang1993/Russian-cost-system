-- Persisted calculation history.
CREATE TABLE IF NOT EXISTS public.calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  tier TEXT NOT NULL,
  revenue DECIMAL NOT NULL,
  expenses JSONB NOT NULL,
  results JSONB NOT NULL,
  rates JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_calculations" ON public.calculations;
CREATE POLICY "users_manage_own_calculations" ON public.calculations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_manage_all_calculations" ON public.calculations;
CREATE POLICY "admin_manage_all_calculations" ON public.calculations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()
        AND profile.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_calculations_user_id ON public.calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON public.calculations(created_at DESC);
