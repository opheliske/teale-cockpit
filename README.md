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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

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

### 2. Apply the database migrations

Run the SQL files in `supabase/migrations/` **in chronological order** in the Supabase SQL editor:

1. `…_auth_profiles.sql` — `profiles` table + role enum + auto-provisioning trigger.
2. `…_plan_comments_client_id.sql` — adds `client_id` to `plan_comments` for per-client isolation.
3. `…_rls_policies.sql` — enables RLS and the access policies on every table.

> These migrations run against the existing Supabase project (the `clients` table must already exist).

After applying them, you can verify isolation with `supabase/tests/rls_access_test.sql` (fill in the placeholder ids, then run each block in the SQL editor).

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
