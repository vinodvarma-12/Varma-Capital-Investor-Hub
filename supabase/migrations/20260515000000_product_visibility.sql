-- Add is_public column to products table
-- Private products show a locked overlay on the investor UI; public products are fully accessible.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
