-- Fix: infinite recursion in admin_* policies across profiles/products/calculations/tax_config.
-- Root cause: previous admin policies used EXISTS(SELECT FROM public.profiles ...) in their
-- USING clauses, which triggered recursive RLS evaluation whenever the same table was queried.
-- Fix: extract the admin check into a SECURITY DEFINER function that bypasses RLS.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Restrict execute privilege (default grants EXECUTE to PUBLIC).
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Replace recursive admin policies on all four tables.
-- IMPORTANT: policy names must match exactly (tax_config uses 'admin_manage_tax_config', NOT 'admin_manage_all_tax_config').
-- TO authenticated: prevent anon roles from triggering is_admin() evaluation (anon lacks EXECUTE on is_admin, would raise permission denied). Critical for tax_config which has a public SELECT policy (users_read_tax_config) that anon may hit.

DROP POLICY IF EXISTS "admin_manage_all_profiles" ON public.profiles;
CREATE POLICY "admin_manage_all_profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_all_products" ON public.products;
CREATE POLICY "admin_manage_all_products" ON public.products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_all_calculations" ON public.calculations;
CREATE POLICY "admin_manage_all_calculations" ON public.calculations
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_manage_tax_config" ON public.tax_config;
CREATE POLICY "admin_manage_tax_config" ON public.tax_config
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
