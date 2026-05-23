-- Migrate any coming_soon products → active + private (is_public = false)
UPDATE public.products
  SET status = 'active', is_public = false
  WHERE status = 'coming_soon';

-- Update the status constraint: only active, suspended, closed
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'suspended', 'closed'));
