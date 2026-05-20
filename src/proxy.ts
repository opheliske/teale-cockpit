// Route protection — runs on the server before every page render.
// Next.js 16 renamed the `middleware` file convention to `proxy`.
//
// This is a UX guard (redirects). The real data-access boundary is the
// Supabase Row Level Security policies — see supabase/migrations/.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type Role = "csm" | "client";

function redirectTo(
  request: NextRequest,
  pathname: string,
  carry: NextResponse,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const redirect = NextResponse.redirect(url);
  // Carry over any refreshed-session cookies.
  carry.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/login";

  // Not logged in → only /login is reachable.
  if (!user) {
    return isLogin ? response : redirectTo(request, "/login", response);
  }

  // Role lives in the JWT metadata (set by the admin create-user script).
  const role = (user.app_metadata?.role ?? user.user_metadata?.role) as
    | Role
    | undefined;

  // Logged in but on /login → send to the right home.
  if (isLogin) {
    return redirectTo(request, role === "csm" ? "/csm" : "/", response);
  }

  // A client only sees their own space: never the CSM area, nor the
  // CSM-preview route /client/<id>.
  if (
    role === "client" &&
    (path.startsWith("/csm") || path.startsWith("/client/"))
  ) {
    return redirectTo(request, "/", response);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on every route except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|pdf|ico)$).*)",
  ],
};
