-- Add 'coming_soon' to products status constraint
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'coming_soon', 'suspended', 'closed'));
