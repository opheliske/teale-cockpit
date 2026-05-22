import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser Supabase client. Uses the connected user's session (stored in
// cookies via @supabase/ssr) — never the service_role key. All reads/writes
// are therefore filtered by the Row Level Security policies.
export const supabase = createBrowserClient(url, key);

/**
 * Resolves once the browser client has its auth session loaded.
 *
 * On a fresh page load the session is still being hydrated from cookies; a
 * query fired too early goes out anonymous, and RLS answers it with zero rows
 * (no error). Awaiting this before an RLS-scoped read guarantees the request
 * carries the auth token. Capped (~2 s) so it can never hang.
 */
export async function ensureSession(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
