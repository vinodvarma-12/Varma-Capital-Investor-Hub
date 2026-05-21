-- Extend invitations table with full investor onboarding fields
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS investor_type TEXT CHECK (investor_type IN ('individual', 'company', 'trust')),
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS committed_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS lock_in_months INTEGER,
  ADD COLUMN IF NOT EXISTS subscription_date DATE;
