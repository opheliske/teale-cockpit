import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/supabase-admin";
import type { AdminUser, CreateUserBody } from "@/lib/admin-types";

// GET /api/admin/users → every account (profiles ⨝ company name ⨝ auth ban state)
export async function GET() {
  try {
    const admin = await requireAdmin();

    const [{ data: profiles, error: pErr }, { data: clients, error: cErr }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("id, role, client_id, full_name, email, last_sign_in_at, created_at")
          .order("created_at"),
        admin.from("clients").select("id, name"),
      ]);
    if (pErr) throw pErr;
    if (cErr) throw cErr;

    const clientName = new Map((clients ?? []).map((c) => [c.id as string, c.name as string]));

    // banned_until lives on auth.users — page through the admin list.
    const bannedUntilById = new Map<string, string | null>();
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      for (const u of data.users) {
        bannedUntilById.set(u.id, (u as { banned_until?: string }).banned_until ?? null);
      }
      if (data.users.length < 200) break;
    }

    const now = Date.now();
    const users: AdminUser[] = (profiles ?? []).map((p) => {
      const bannedUntil = bannedUntilById.get(p.id as string);
      const disabled = bannedUntil ? new Date(bannedUntil).getTime() > now : false;
      return {
        id: p.id as string,
        email: (p.email as string) ?? "",
        fullName: (p.full_name as string) ?? "",
        role: p.role as AdminUser["role"],
        clientId: (p.client_id as string | null) ?? null,
        clientName: p.client_id ? clientName.get(p.client_id as string) ?? null : null,
        lastSignInAt: (p.last_sign_in_at as string | null) ?? null,
        disabled,
        createdAt: (p.created_at as string | null) ?? null,
      };
    });

    return Response.json({ users });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

// POST /api/admin/users → create a CSM or client account, return the password once
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as CreateUserBody;

    const email = body.email?.trim().toLowerCase();
    const role = body.role;
    const fullName = body.fullName?.trim() ?? "";
    const clientId = role === "client" ? body.clientId ?? null : null;

    if (!email) return Response.json({ error: "Email requis" }, { status: 400 });
    if (role !== "csm" && role !== "client") {
      return Response.json({ error: "Rôle invalide" }, { status: 400 });
    }
    if (role === "client" && !clientId) {
      return Response.json({ error: "Une entreprise est requise pour un compte client" }, { status: 400 });
    }

    const password = randomBytes(12).toString("base64url");

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, client_id: clientId ?? "", full_name: fullName },
      app_metadata: { role },
    });
    if (error) {
      // Most common: email already registered.
      return Response.json({ error: error.message }, { status: 400 });
    }

    // The on_auth_user_created trigger inserts the matching profile row.
    return Response.json({ id: data.user.id, email, password }, { status: 201 });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
