-- Add country and investor_type to profiles (phone already exists)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS investor_type TEXT CHECK (investor_type IN ('individual', 'company', 'trust'));
