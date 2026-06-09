import type { NextRequest } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/supabase-admin";
import type { UpdateUserBody } from "@/lib/admin-types";

// PATCH /api/admin/users/[id] → edit name/email/role/company/password, or
// enable/disable the account. The app reads display data from `profiles` and
// authorization from app_metadata.role, so we keep both in sync.
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = (await request.json()) as UpdateUserBody;

    const { data: current, error: curErr } = await admin
      .from("profiles")
      .select("role, client_id")
      .eq("id", id)
      .maybeSingle();
    if (curErr) throw curErr;
    if (!current) return Response.json({ error: "Compte introuvable" }, { status: 404 });
    if (current.role === "admin") {
      return Response.json({ error: "Le compte admin se gère via le script set-admin" }, { status: 403 });
    }

    // Resolve the target role/company and enforce the profiles constraint.
    const role = (body.role ?? current.role) as "csm" | "client";
    if (role !== "csm" && role !== "client") {
      return Response.json({ error: "Rôle invalide" }, { status: 400 });
    }
    let clientId =
      body.clientId !== undefined ? body.clientId : (current.client_id as string | null);
    if (role === "csm") clientId = null;
    if (role === "client" && !clientId) {
      return Response.json({ error: "Une entreprise est requise pour un compte client" }, { status: 400 });
    }

    const roleOrCompanyChanged = body.role !== undefined || body.clientId !== undefined;

    // ── auth.users side ──
    const authUpdate: Record<string, unknown> = {};
    if (body.email !== undefined) {
      authUpdate.email = body.email.trim().toLowerCase();
      authUpdate.email_confirm = true;
    }
    if (body.password) authUpdate.password = body.password;
    if (roleOrCompanyChanged) authUpdate.app_metadata = { role };
    if (body.disabled !== undefined) {
      // ban_duration "none" lifts a ban; a very long value is an indefinite ban.
      authUpdate.ban_duration = body.disabled ? "876000h" : "none";
    }
    if (Object.keys(authUpdate).length > 0) {
      const { error } = await admin.auth.admin.updateUserById(id, authUpdate);
      if (error) return Response.json({ error: error.message }, { status: 400 });
    }

    // ── profiles side (display source of truth) ──
    const profUpdate: Record<string, unknown> = {};
    if (body.fullName !== undefined) profUpdate.full_name = body.fullName.trim();
    if (body.email !== undefined) profUpdate.email = body.email.trim().toLowerCase();
    if (roleOrCompanyChanged) {
      profUpdate.role = role;
      profUpdate.client_id = clientId;
    }
    if (Object.keys(profUpdate).length > 0) {
      const { error } = await admin.from("profiles").update(profUpdate).eq("id", id);
      if (error) throw error;
    }

    return Response.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

// DELETE /api/admin/users/[id] → permanently remove the account (cascades to
// its profile). A CSM that still owns clients must be reassigned first,
// otherwise their portfolio would silently become owner-less.
export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const { data: prof, error: profErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!prof) return Response.json({ error: "Compte introuvable" }, { status: 404 });
    if (prof.role === "admin") {
      return Response.json({ error: "Le compte admin ne peut pas être supprimé ici" }, { status: 403 });
    }

    if (prof.role === "csm") {
      const { count, error: cntErr } = await admin
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("owner_csm_id", id);
      if (cntErr) throw cntErr;
      if ((count ?? 0) > 0) {
        return Response.json(
          {
            error: `Ce CSM possède encore ${count} entreprise(s). Réassignez-les à un autre CSM avant de supprimer le compte.`,
          },
          { status: 409 },
        );
      }
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return Response.json({ error: error.message }, { status: 400 });

    return Response.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
