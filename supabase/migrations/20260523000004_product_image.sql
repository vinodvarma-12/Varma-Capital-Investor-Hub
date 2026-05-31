-- Add image_url to products
alter table public.products add column if not exists image_url text;

-- Create product-images storage bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage RLS
create policy "Staff can upload product images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_staff());

create policy "Staff can update product images"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_staff());

create policy "Staff can delete product images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_staff());

create policy "Product images are publicly viewable"
  on storage.objects for select to public
  using (bucket_id = 'product-images');
