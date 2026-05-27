# Teale Cockpit

A [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication & roles

The app is gated by Supabase Auth (email + password). There are two roles:

- **`csm`** — full access: the aggregated CSM dashboard (`/csm`) and every client's detail view (`/csm/clients/:id`).
- **`client`** — restricted access: only their own company's space.

Data isolation is enforced **in the database** by Supabase Row Level Security (RLS), not in the frontend. The app always uses the connected user's session (anon key) — never the `service_role` key.

### 1. Environment variables

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Used by | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | app + admin script | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | public |
| `SUPABASE_SERVICE_ROLE_KEY` | **admin script only** | secret — never commit, never expose to the browser |

`.env.local` is git-ignored. **Never commit the service_role key.**

### 2. Set up the database

Run the SQL in the Supabase SQL editor, **in this exact order** — the result is a complete database with RLS active:

1. **`supabase/schema.sql`** — creates every table (`clients`, `profiles`-less baseline, etc.). ⚠️ This file does **not** enable RLS on its own.
2. **Every file in `supabase/migrations/`, in chronological (filename) order**:
   1. `…140000_auth_profiles.sql` — `profiles` table + role enum + auto-provisioning trigger.
   2. `…140100_plan_comments_client_id.sql` — adds `client_id` to `plan_comments`.
   3. `…140200_rls_policies.sql` — **enables RLS** and the access policies on every table.
   4. `…150000_clients_owner_csm.sql` — adds `clients.owner_csm_id` (FK to `profiles`).
   5. `…160000_clients_drop_legacy_csm.sql` — drops the legacy `csm` / `csm_label` columns.
   6. `…20260521120000_enable_realtime.sql` — adds the data tables to the Realtime publication.
   7. `…20260522120000_urgencies.sql` — `urgencies` table + RLS + Realtime.
   8. `…20260522130000_storage_client_files.sql` — private `client-files` Storage bucket + RLS.
   9. `…20260522140000_client_id_foreign_keys.sql` — adds the missing `client_id` foreign keys (`ON DELETE CASCADE`).
   10. `…20260522150000_plan_state_next_themes.sql` — adds `plan_state.next_themes` (next-year quarter themes).
   11. `…20260527120000_client_notes.sql` — `client_notes` table (CSM-internal notes per client) + RLS + Realtime.
   12. `…20260527130000_storage_kit_files.sql` — private `kit-files` Storage bucket + RLS (CSM writes, all authenticated read).
   13. `…20260527140000_client_atelier_feedback.sql` — `client_atelier_feedback` table (client rating + comment on each scheduled atelier) + RLS + Realtime.

> ⚠️ Running `schema.sql` **alone** leaves the tables without RLS. The migrations (step 2) are mandatory — they are what secures the database.

After applying everything, verify isolation with `supabase/tests/rls_access_test.sql` (fill in the placeholder ids, then run each block in the SQL editor).

### 3. Create user accounts (admin)

There is no public signup. Accounts are created manually with the admin script, which uses the `service_role` key from `.env.local`:

```bash
# A CSM account
npm run create-user -- --email=jane@teale.co --role=csm --name="Jane Doe"

# A client account (tied to a company — client_id = the clients.id of that company)
npm run create-user -- --email=rh@acme.com --role=client --client_id=acme --name="RH Acme"
```

Options: `--email` (required), `--role` (`csm`|`client`), `--client_id` (required for `client`, forbidden for `csm`), `--name` (optional), `--password` (optional — a strong one is generated and printed if omitted).

The `on_auth_user_created` trigger creates the matching `profiles` row automatically.

### 4. Route protection

`src/proxy.ts` (Next.js 16 renamed `middleware` → `proxy`) redirects unauthenticated users to `/login`, sends logged-in users to their home, and blocks clients from `/csm`. The `(client)` route group additionally uses `ClientGuard` to bind the active client context. RLS remains the real data boundary.

### 5. Seed demo data (optional)

To rebuild a clean demo dataset in one command:

```bash
npm run seed-demo
```

Creates 3 demo clients (ids `demo-…`) with a yearly plan, CSM actions and health alerts. Idempotent and safe — it only upserts/replaces its own demo rows and never touches real data. Uses the `service_role` key from `.env.local`.

To seed the workshop catalogue (table `workshops`):

```bash
npm run seed-catalog
```

Upserts the default catalogue from `src/app/(client)/catalogue-ateliers/data.ts`. Idempotent. This replaces the former front-side auto-seed (the app no longer seeds the catalogue itself).

To create ready-to-use demo login accounts (one CSM + one Client):

```bash
ALLOW_SEED=1 SEED_DEMO_PASSWORD='<strong password>' npm run seed-users
```

Creates `csm.demo@teale.io` (CSM) and `client.demo@teale.io` (Client, attached to the `demo-acme` company or the first existing client), both with the password from `SEED_DEMO_PASSWORD`. Idempotent: existing accounts are left untouched. Run `npm run seed-demo` first so the demo company exists.

> ⚠️ **Never run `seed-users` against production.** It creates a CSM account with full access. The script refuses to run unless you explicitly pass `ALLOW_SEED=1`, and there is no default password — `SEED_DEMO_PASSWORD` must be provided. Only run it on a dedicated demo/dev Supabase project.

## Tests & CI

```bash
npm test          # unit tests for the src/lib helpers (Node test runner)
```

Every push and pull request runs `tsc`, ESLint, the tests and a production
build via GitHub Actions (`.github/workflows/ci.yml`).

## Deployment

The app is deployed on Vercel from the `main` branch. Set the environment
variables from `.env.example` in the Vercel project, and apply any pending
SQL migrations (see "Set up the database") before the first deploy.
