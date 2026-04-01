-- Tax configuration managed by admins.
CREATE TABLE IF NOT EXISTS public.tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL,
  regime TEXT NOT NULL,
  params JSONB NOT NULL,
  effective_date DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tier, regime, effective_date)
);

ALTER TABLE public.tax_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_tax_config" ON public.tax_config;
CREATE POLICY "admin_manage_tax_config" ON public.tax_config
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

DROP POLICY IF EXISTS "users_read_tax_config" ON public.tax_config;
CREATE POLICY "users_read_tax_config" ON public.tax_config
  FOR SELECT
  USING (true);
