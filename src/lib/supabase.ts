import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser Supabase client. Uses the connected user's session (stored in
// cookies via @supabase/ssr) — never the service_role key. All reads/writes
// are therefore filtered by the Row Level Security policies.
export const supabase = createBrowserClient(url, key);
