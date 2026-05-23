-- Fix invitations.product_id foreign key to cascade on product deletion
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_product_id_fkey;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
