-- Add payment_confirmed flag to investments
ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN NOT NULL DEFAULT false;
