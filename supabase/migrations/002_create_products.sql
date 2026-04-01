-- Saved products for each authenticated user.
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📦',
  platform_price DECIMAL NOT NULL,
  declared_cost DECIMAL NOT NULL,
  purchase_cost DECIMAL NOT NULL,
  volume DECIMAL,
  weight DECIMAL,
  duty_rate DECIMAL DEFAULT 0.05,
  platform_fee_rate DECIMAL DEFAULT 0.27,
  shipping_method TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_products" ON public.products;
CREATE POLICY "users_manage_own_products" ON public.products
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_manage_all_products" ON public.products;
CREATE POLICY "admin_manage_all_products" ON public.products
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

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
