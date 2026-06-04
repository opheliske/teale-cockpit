import type { NextRequest } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/supabase-admin";
import type { UpdateCompanyBody } from "@/lib/admin-types";

// PATCH /api/admin/companies/[id] → rename, restyle, or reassign the owner CSM
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/admin/companies/[id]">) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = (await request.json()) as UpdateCompanyBody;

    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.initials !== undefined) update.initials = body.initials.trim();
    if (body.color !== undefined) update.color = body.color.trim();
    if (body.ownerCsmId !== undefined) {
      if (!body.ownerCsmId) {
        return Response.json({ error: "Un CSM propriétaire est requis" }, { status: 400 });
      }
      update.owner_csm_id = body.ownerCsmId;
    }

    if (Object.keys(update).length === 0) return Response.json({ ok: true });

    const { error } = await admin.from("clients").update(update).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 400 });

    return Response.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

// DELETE /api/admin/companies/[id] → remove a company. Blocked while accounts
// are still attached to it (and the DB also restricts deletion when client
// data references it).
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/admin/companies/[id]">) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const { count, error: cntErr } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("client_id", id);
    if (cntErr) throw cntErr;
    if ((count ?? 0) > 0) {
      return Response.json(
        { error: `${count} compte(s) sont rattachés à cette entreprise. Supprimez-les ou réaffectez-les d'abord.` },
        { status: 409 },
      );
    }

    const { error } = await admin.from("clients").delete().eq("id", id);
    if (error) {
      // FK restrict from client-scoped data (documents, plan_state, …).
      return Response.json(
        { error: "Suppression impossible : des données client référencent encore cette entreprise." },
        { status: 409 },
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
