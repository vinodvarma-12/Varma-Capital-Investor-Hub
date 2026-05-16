-- Add uploaded_by column to documents table to track who uploaded each document
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
