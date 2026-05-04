-- Public bucket for user uploads (logos, KYC, documents). Adjust policies if you need private files.

INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Idempotent: safe if policies were created manually or a previous push partially applied.
DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete own uploads" ON storage.objects;

CREATE POLICY "Public read uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated insert uploads"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Authenticated update own uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads')
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Authenticated delete own uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads');
