-- Add heard_from fields to waitlist_entries
ALTER TABLE public.waitlist_entries
  ADD COLUMN IF NOT EXISTS heard_from TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS heard_from_other TEXT DEFAULT NULL;
