-- Add admin-editable fields to allocation_requests
ALTER TABLE public.allocation_requests
  ADD COLUMN IF NOT EXISTS lock_in_months INTEGER,
  ADD COLUMN IF NOT EXISTS subscription_date DATE;
