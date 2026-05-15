-- Add assignment fields to support_tickets
-- assigned_to: email of the admin the ticket is assigned to (null = unassigned)
-- assigned_date: when the assignment was made

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS assigned_date DATE DEFAULT NULL;
