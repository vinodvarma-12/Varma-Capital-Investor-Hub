-- =============================================================================
-- Dummy users + sample data for local / dev Supabase
-- Run in: Supabase Dashboard → SQL Editor (as postgres), or `psql` against DB.
-- Password for all three test accounts:  Password123!
--
-- Emails:
--   investor@test.local   → role investor
--   admin@test.local      → role admin
--   super@test.local      → role super_admin
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Instance id: almost all Supabase projects use this single-tenant default.
-- If inserts fail on instance_id, run: SELECT id FROM auth.instances LIMIT 1;
-- and replace the constant below.
DO $$
DECLARE
  inst uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  inv_id uuid := 'a1000000-0000-4000-8000-000000000001'::uuid;
  adm_id uuid := 'a1000000-0000-4000-8000-000000000002'::uuid;
  sup_id uuid := 'a1000000-0000-4000-8000-000000000003'::uuid;
  pw text := crypt('Password123!', gen_salt('bf'));
  prod_a uuid := 'b2000000-0000-4000-8000-000000000001'::uuid;
  prod_b uuid := 'b2000000-0000-4000-8000-000000000002'::uuid;
BEGIN
  -- ─── auth.users + identities (email provider) ───────────────────────────

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = inv_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      is_sso_user, is_anonymous
    ) VALUES (
      inv_id, inst, 'authenticated', 'authenticated', 'investor@test.local', pw,
      now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Investor","role":"investor"}'::jsonb,
      now(), now(),
      '', '', '', '',
      false, false
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), inv_id, inv_id::text,
      jsonb_build_object('sub', inv_id::text, 'email', 'investor@test.local', 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = adm_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      is_sso_user, is_anonymous
    ) VALUES (
      adm_id, inst, 'authenticated', 'authenticated', 'admin@test.local', pw,
      now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Admin","role":"admin"}'::jsonb,
      now(), now(),
      '', '', '', '',
      false, false
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), adm_id, adm_id::text,
      jsonb_build_object('sub', adm_id::text, 'email', 'admin@test.local', 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = sup_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      is_sso_user, is_anonymous
    ) VALUES (
      sup_id, inst, 'authenticated', 'authenticated', 'super@test.local', pw,
      now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Demo Super Admin","role":"super_admin"}'::jsonb,
      now(), now(),
      '', '', '', '',
      false, false
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), sup_id, sup_id::text,
      jsonb_build_object('sub', sup_id::text, 'email', 'super@test.local', 'email_verified', true),
      'email', now(), now(), now()
    );
  END IF;

  -- Profiles are created by trigger; ensure role / investor fields are correct
  UPDATE public.profiles SET
    full_name = 'Demo Investor',
    role = 'investor',
    kyc_status = 'verified',
    investor_id = 'INV-DEMO-001'
  WHERE id = inv_id;

  UPDATE public.profiles SET
    full_name = 'Demo Admin',
    role = 'admin',
    kyc_status = 'verified'
  WHERE id = adm_id;

  UPDATE public.profiles SET
    full_name = 'Demo Super Admin',
    role = 'super_admin',
    kyc_status = 'verified'
  WHERE id = sup_id;

  -- ─── products ───────────────────────────────────────────────────────────
  INSERT INTO public.products (
    id, name, description, minimum_ticket, lock_in_months,
    management_fee_percent, performance_fee_percent, risk_band, status
  ) VALUES
    (prod_a, 'Demo Growth Fund', 'Sample product for UI testing', 100000, 24, 2, 20, 'medium', 'active'),
    (prod_b, 'Demo Income Fund', 'Second sample product', 50000, 12, 1.5, 15, 'low', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- ─── NAV rows ────────────────────────────────────────────────────────────
  INSERT INTO public.nav_snapshots (product_id, date, nav_per_unit, total_aum, is_official)
  SELECT prod_a, CURRENT_DATE - 30, 102.5, 50000000, true
  WHERE NOT EXISTS (SELECT 1 FROM public.nav_snapshots n WHERE n.product_id = prod_a AND n.date = CURRENT_DATE - 30);
  INSERT INTO public.nav_snapshots (product_id, date, nav_per_unit, total_aum, is_official)
  SELECT prod_a, CURRENT_DATE - 7, 104.2, 51200000, true
  WHERE NOT EXISTS (SELECT 1 FROM public.nav_snapshots n WHERE n.product_id = prod_a AND n.date = CURRENT_DATE - 7);
  INSERT INTO public.nav_snapshots (product_id, date, nav_per_unit, total_aum, is_official)
  SELECT prod_a, CURRENT_DATE, 105.0, 51800000, true
  WHERE NOT EXISTS (SELECT 1 FROM public.nav_snapshots n WHERE n.product_id = prod_a AND n.date = CURRENT_DATE);
  INSERT INTO public.nav_snapshots (product_id, date, nav_per_unit, total_aum, is_official)
  SELECT prod_b, CURRENT_DATE, 98.75, 12000000, true
  WHERE NOT EXISTS (SELECT 1 FROM public.nav_snapshots n WHERE n.product_id = prod_b AND n.date = CURRENT_DATE);

  -- ─── investments (for investor@test.local) ────────────────────────────────
  INSERT INTO public.investments (
    id, investor_email, product_id, invested_amount, current_units,
    lock_in_months, lock_in_end_date, status, purchase_date, cost_basis
  ) VALUES
    ('c3000000-0000-4000-8000-000000000001'::uuid, 'investor@test.local', prod_a, 250000, 2380.95,
     24, (CURRENT_DATE + interval '18 months')::date, 'active', CURRENT_DATE - 400, 105.0),
    ('c3000000-0000-4000-8000-000000000002'::uuid, 'investor@test.local', prod_b, 100000, 1012.66,
     12, (CURRENT_DATE + interval '8 months')::date, 'active', CURRENT_DATE - 200, 98.75)
  ON CONFLICT (id) DO NOTHING;

  -- ─── optional: OTP for testing OTP tab (6 digits) ─────────────────────────
  INSERT INTO public.investor_otps (investor_email, otp_code, expires_at, used, created_by)
  SELECT 'investor@test.local', '424242', now() + interval '1 hour', false, 'admin@test.local'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.investor_otps
    WHERE investor_email = 'investor@test.local' AND used = false AND otp_code = '424242'
  );

  -- ─── optional: document row ──────────────────────────────────────────────
  INSERT INTO public.documents (investor_email, title, type, file_url, period, is_watermarked, download_count)
  SELECT 'investor@test.local', 'Q4 Statement (demo)', 'statement', 'https://example.com/demo-statement.pdf', '2025-Q4', false, 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.investor_email = 'investor@test.local' AND d.title = 'Q4 Statement (demo)'
  );

  -- market ticker for Markets page static list
  INSERT INTO public.market_tickers (symbol, name, category, current_price, change_percent, is_active)
  SELECT 'DEMO', 'Demo Static Ticker', 'indices', 100, 0.5, true
  WHERE NOT EXISTS (SELECT 1 FROM public.market_tickers m WHERE m.symbol = 'DEMO');

END $$;

COMMIT;

-- =============================================================================
-- After running:
-- 1) Sign in with Password tab: investor@test.local / Password123!
-- 2) Or OTP tab: email investor@test.local, OTP 424242 (if row still valid)
-- 3) Admin: admin@test.local / Password123!
-- 4) Super: super@test.local / Password123!
-- =============================================================================
