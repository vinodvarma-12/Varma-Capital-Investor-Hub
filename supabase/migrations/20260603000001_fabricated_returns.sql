CREATE TABLE IF NOT EXISTS public.fabricated_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  return_percent NUMERIC,
  nav_per_unit NUMERIC,
  override_calculated BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  effective_date DATE NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER fabricated_returns_touch_updated_date
  BEFORE UPDATE ON public.fabricated_returns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

ALTER TABLE public.fabricated_returns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fabricated_returns' AND policyname = 'fabricated_select'
  ) THEN
    CREATE POLICY fabricated_select ON public.fabricated_returns FOR SELECT TO authenticated
      USING (
        public.is_staff()
        OR investor_email IS NULL
        OR investor_email = ''
        OR investor_email = public.my_profile_email()
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fabricated_returns' AND policyname = 'fabricated_write_staff'
  ) THEN
    CREATE POLICY fabricated_write_staff ON public.fabricated_returns FOR ALL TO authenticated
      USING (public.is_staff()) WITH CHECK (public.is_staff());
  END IF;
END $$;
