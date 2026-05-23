-- Add return_percent, total_aum, and admin_notes to nav_snapshots table
ALTER TABLE public.nav_snapshots
  ADD COLUMN IF NOT EXISTS return_percent NUMERIC,
  ADD COLUMN IF NOT EXISTS total_aum NUMERIC,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
