-- Varma Capital: Base44 → Supabase schema (public tables + RLS)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── helpers ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── profiles (extends auth.users) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'investor' CHECK (role IN ('investor', 'admin', 'super_admin')),
  phone TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  bank_details JSONB DEFAULT '{}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  kyc_status TEXT,
  investor_id TEXT,
  two_factor_secret TEXT,
  two_factor_recovery_codes JSONB DEFAULT '[]'::jsonb,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_touch_updated_date
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.my_profile_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'investor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── domain tables ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.investor_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER investor_otps_touch_updated_date
  BEFORE UPDATE ON public.investor_otps
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by TEXT,
  role TEXT DEFAULT 'investor' CHECK (role IN ('investor', 'admin', 'super_admin')),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER invitations_touch_updated_date
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  minimum_ticket NUMERIC,
  lock_in_months INTEGER,
  management_fee_percent NUMERIC,
  performance_fee_percent NUMERIC,
  redemption_penalty_percent NUMERIC DEFAULT 0,
  redemption_penalty_amount NUMERIC DEFAULT 0,
  risk_band TEXT CHECK (risk_band IN ('low', 'medium', 'high', 'very_high')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  high_water_mark BOOLEAN DEFAULT FALSE,
  hurdle_rate NUMERIC DEFAULT 0,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER products_touch_updated_date
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.nav_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  nav_per_unit NUMERIC NOT NULL,
  total_aum NUMERIC,
  is_official BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER nav_snapshots_touch_updated_date
  BEFORE UPDATE ON public.nav_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  invested_amount NUMERIC,
  current_units NUMERIC,
  lock_in_months INTEGER,
  lock_in_end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'suspended')),
  purchase_date DATE,
  cost_basis NUMERIC,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER investments_touch_updated_date
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'redemption', 'fee', 'penalty', 'dividend')),
  amount NUMERIC NOT NULL,
  units NUMERIC,
  nav_per_unit NUMERIC,
  transaction_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  notes TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER transactions_touch_updated_date
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('statement', 'tax_document', 'agreement', 'compliance', 'notice')),
  file_url TEXT NOT NULL,
  period TEXT,
  is_watermarked BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER documents_touch_updated_date
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout', 'download', 'upload')),
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER audit_logs_touch_updated_date
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.allocation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  requested_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_date DATE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER allocation_requests_touch_updated_date
  BEFORE UPDATE ON public.allocation_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.fabricated_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT,
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  return_percent NUMERIC,
  nav_per_unit NUMERIC,
  override_calculated BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  effective_date DATE NOT NULL,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER fabricated_returns_touch_updated_date
  BEFORE UPDATE ON public.fabricated_returns
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.lock_in_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL,
  investment_id UUID NOT NULL REFERENCES public.investments (id) ON DELETE CASCADE,
  original_lock_months INTEGER,
  adjusted_lock_months INTEGER NOT NULL,
  new_end_date DATE,
  penalty_type TEXT DEFAULT 'none' CHECK (penalty_type IN ('none', 'fixed', 'percentage', 'both')),
  penalty_amount NUMERIC DEFAULT 0,
  penalty_percent NUMERIC DEFAULT 0,
  reason TEXT,
  approved_by TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER lock_in_overrides_touch_updated_date
  BEFORE UPDATE ON public.lock_in_overrides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.marketing_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  file_url TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL DEFAULT 'article' CHECK (category IN ('market_commentary', 'white_paper', 'webinar', 'article', 'report')),
  tags JSONB DEFAULT '[]'::jsonb,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER marketing_materials_touch_updated_date
  BEFORE UPDATE ON public.marketing_materials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.market_tickers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('commodities', 'indices', 'crypto', 'forex')),
  current_price NUMERIC,
  change_percent NUMERIC,
  change_amount NUMERIC,
  volume NUMERIC,
  market_cap NUMERIC,
  last_updated TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER market_tickers_touch_updated_date
  BEFORE UPDATE ON public.market_tickers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.news_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'finance' CHECK (category IN ('finance', 'crypto', 'world', 'technology')),
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER news_feeds_touch_updated_date
  BEFORE UPDATE ON public.news_feeds
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'account', 'investment', 'redemption', 'technical', 'compliance')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  assigned_to TEXT,
  resolution_notes TEXT,
  sla_due_date TIMESTAMPTZ,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER support_tickets_touch_updated_date
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets (id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  message TEXT NOT NULL,
  file_url TEXT,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER ticket_messages_touch_updated_date
  BEFORE UPDATE ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('branding', 'notifications', 'security', 'compliance', 'sla', 'general')),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER system_settings_touch_updated_date
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  investor_category TEXT,
  amount_interested NUMERIC,
  source TEXT DEFAULT 'website',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER waitlist_entries_touch_updated_date
  BEFORE UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_date();

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabricated_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lock_in_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_self_or_staff ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());
CREATE POLICY profiles_update_self_or_staff ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff())
  WITH CHECK (id = auth.uid() OR public.is_staff());

-- investor_otps
CREATE POLICY investor_otps_staff_all ON public.investor_otps FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- invitations (read own token flow uses service role; authenticated staff manage)
CREATE POLICY invitations_staff_all ON public.invitations FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- products
CREATE POLICY products_read_active ON public.products FOR SELECT TO authenticated
  USING (status = 'active' OR public.is_staff());
CREATE POLICY products_write_staff ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());
CREATE POLICY products_update_staff ON public.products FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY products_delete_staff ON public.products FOR DELETE TO authenticated
  USING (public.is_staff());

-- nav
CREATE POLICY nav_read_auth ON public.nav_snapshots FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY nav_write_staff ON public.nav_snapshots FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- investments
CREATE POLICY investments_select ON public.investments FOR SELECT TO authenticated
  USING (public.is_staff() OR investor_email = public.my_profile_email());
CREATE POLICY investments_write_staff ON public.investments FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());
CREATE POLICY investments_update ON public.investments FOR UPDATE TO authenticated
  USING (public.is_staff() OR investor_email = public.my_profile_email())
  WITH CHECK (public.is_staff() OR investor_email = public.my_profile_email());
CREATE POLICY investments_delete_staff ON public.investments FOR DELETE TO authenticated
  USING (public.is_staff());

-- transactions
CREATE POLICY transactions_select ON public.transactions FOR SELECT TO authenticated
  USING (public.is_staff() OR investor_email = public.my_profile_email());
CREATE POLICY transactions_write_staff ON public.transactions FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- documents
CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR investor_email = public.my_profile_email()
    OR investor_email = ''
  );
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.is_staff() OR investor_email = public.my_profile_email());
CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated
  USING (public.is_staff() OR investor_email = public.my_profile_email())
  WITH CHECK (public.is_staff() OR investor_email = public.my_profile_email());
CREATE POLICY documents_delete_staff ON public.documents FOR DELETE TO authenticated
  USING (public.is_staff());

-- audit_logs
CREATE POLICY audit_logs_staff ON public.audit_logs FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- allocation_requests
CREATE POLICY allocation_select ON public.allocation_requests FOR SELECT TO authenticated
  USING (public.is_staff() OR investor_email = public.my_profile_email());
CREATE POLICY allocation_insert ON public.allocation_requests FOR INSERT TO authenticated
  WITH CHECK (investor_email = public.my_profile_email() OR public.is_staff());
CREATE POLICY allocation_update_staff ON public.allocation_requests FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- fabricated_returns
CREATE POLICY fabricated_select ON public.fabricated_returns FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR investor_email IS NULL
    OR investor_email = ''
    OR investor_email = public.my_profile_email()
  );
CREATE POLICY fabricated_write_staff ON public.fabricated_returns FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- lock_in_overrides
CREATE POLICY lock_in_staff ON public.lock_in_overrides FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- marketing_materials
CREATE POLICY marketing_read ON public.marketing_materials FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY marketing_write_staff ON public.marketing_materials FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- market_tickers
CREATE POLICY tickers_read ON public.market_tickers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY tickers_write_staff ON public.market_tickers FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- news_feeds
CREATE POLICY news_read ON public.news_feeds FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY news_write_staff ON public.news_feeds FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- support_tickets
CREATE POLICY tickets_select ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_staff() OR investor_email = public.my_profile_email());
CREATE POLICY tickets_insert ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (investor_email = public.my_profile_email() OR public.is_staff());
CREATE POLICY tickets_update ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_staff() OR investor_email = public.my_profile_email())
  WITH CHECK (public.is_staff() OR investor_email = public.my_profile_email());

-- ticket_messages
CREATE POLICY ticket_messages_select ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.investor_email = public.my_profile_email()
    )
  );
CREATE POLICY ticket_messages_write ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.investor_email = public.my_profile_email()
    )
  );

-- system_settings
CREATE POLICY settings_staff ON public.system_settings FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- waitlist: public insert, staff manage
CREATE POLICY waitlist_anon_insert ON public.waitlist_entries FOR INSERT TO anon WITH CHECK (TRUE);
CREATE POLICY waitlist_staff_select ON public.waitlist_entries FOR SELECT TO authenticated
  USING (public.is_staff());
CREATE POLICY waitlist_staff_update ON public.waitlist_entries FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY waitlist_staff_delete ON public.waitlist_entries FOR DELETE TO authenticated
  USING (public.is_staff());

-- ─── grants (Data API) ─────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;
GRANT INSERT ON public.waitlist_entries TO anon;
