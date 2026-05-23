-- Create product_access table
-- Controls which investors can see which private products.
-- Public products (is_public = true) remain visible to all authenticated investors.
-- Private products are only visible to investors with a matching product_access row.

CREATE TABLE IF NOT EXISTS public.product_access (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL,
  product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  granted_by   TEXT,
  granted_date DATE DEFAULT CURRENT_DATE,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (investor_email, product_id)
);

ALTER TABLE public.product_access ENABLE ROW LEVEL SECURITY;

-- Investors can read their own rows; staff can read all rows
CREATE POLICY product_access_select ON public.product_access
  FOR SELECT TO authenticated
  USING (investor_email = public.my_profile_email() OR public.is_staff());

-- Only staff can insert / update / delete
CREATE POLICY product_access_staff_write ON public.product_access
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
