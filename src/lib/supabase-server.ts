import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client (Server Components, Route Handlers).
 * Reads the session from the request cookies. Like the browser client,
 * it uses the anon key — RLS does the filtering.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookie writes are not allowed
          // there. The session refresh is handled by proxy.ts instead.
        }
      },
    },
  });
}
