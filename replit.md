# Varma Capital Investor Hub

A web-based financial platform for managing investor relations, portfolios, and fund activities — supporting both investor-facing views and admin workflows.

## Run & Operate

- **Dev**: `pnpm run dev` (port 5000)
- **Build**: `pnpm run build`
- **Lint**: `pnpm run lint`

### Required Environment Variables (Secrets)
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/publishable key

## Stack

- **Frontend**: React 19 + Vite 8
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite`
- **UI**: shadcn/ui (Radix UI primitives)
- **Data Fetching**: TanStack Query v5
- **Routing**: React Router 7
- **Charts**: Recharts
- **Backend/BaaS**: Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **Package Manager**: pnpm

## Where things live

- `src/pages/` — Route-level page components
- `src/components/` — Reusable UI components (ui/, admin/, security/)
- `src/entities/` — Supabase data models via `entityFactory.js`
- `src/lib/` — AuthContext, Supabase clients, query client, utilities
- `src/lib/supabase/client.js` — Browser Supabase client
- `src/lib/supabase/server.js` — SSR Supabase client
- `src/pages.config.js` — Route/page registration
- `supabase/migrations/` — Database schema migrations
- `supabase/functions/` — Deno Edge Functions
- `vite.config.js` — Vite + Tailwind config

## Architecture decisions

- Uses `entityFactory.js` abstraction for all Supabase table interactions
- Authentication handled via `AuthContext` wrapping the whole app
- Edge Functions handle OTP/2FA and LLM-based document extraction
- Supabase anon key exposed to browser (VITE_ prefix); service role key only in Edge Functions
- App uses `0.0.0.0:5000` in dev to work within Replit's proxied iframe

## Product

- Investor portal: portfolio tracking, document access, market data
- Admin dashboard: NAV management, audits, waitlist and investor approvals
- 2FA / OTP authentication flow
- AI-assisted document data extraction via LLM edge function

## User preferences

_Populate as you build_

## Gotchas

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set before the app will start (client.js throws on missing values)
- `server.js` uses `VITE_SUPABASE_PUBLISHABLE_KEY` as the key name for SSR — keep consistent with `.env.example`
- Edge Function secrets (OPENAI_API_KEY, SENDGRID_API_KEY, etc.) are set in the Supabase Dashboard, not here

## Pointers

- `.env.example` — full list of required/optional env vars
- `supabase/migrations/` — source of truth for DB schema
- Supabase Skill: `.agents/skills/supabase/SKILL.md`
