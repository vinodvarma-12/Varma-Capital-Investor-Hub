-- Change amount_interested from NUMERIC to TEXT to store investment tier ranges
ALTER TABLE public.waitlist_entries
  ALTER COLUMN amount_interested TYPE TEXT USING amount_interested::TEXT;
