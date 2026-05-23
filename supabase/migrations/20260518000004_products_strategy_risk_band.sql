-- Add strategy field and medium_high risk band to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS strategy TEXT;

-- Drop old risk_band check and add updated one with medium_high
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_risk_band_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_risk_band_check
  CHECK (risk_band IN ('low', 'medium', 'medium_high', 'high', 'very_high'));
