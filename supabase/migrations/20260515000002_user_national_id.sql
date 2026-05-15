-- Add national_id field to profiles table
-- Stores passport number or national ID for investor KYC purposes

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS national_id TEXT DEFAULT NULL;
