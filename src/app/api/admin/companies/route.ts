import type { NextRequest } from "next/server";
import { requireAdmin, adminErrorResponse } from "@/lib/supabase-admin";
import type { AdminCompany, CreateCompanyBody } from "@/lib/admin-types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

// GET /api/admin/companies → every company with its owner CSM and user count
export async function GET() {
  try {
    const admin = await requireAdmin();

    const [{ data: clients, error: cErr }, { data: profiles, error: pErr }] = await Promise.all([
      admin.from("clients").select("id, name, initials, color, owner_csm_id").order("name"),
      admin.from("profiles").select("id, role, client_id, full_name"),
    ]);
    if (cErr) throw cErr;
    if (pErr) throw pErr;

    const csmName = new Map<string, string>();
    const userCount = new Map<string, number>();
    for (const p of profiles ?? []) {
      if (p.role === "csm" || p.role === "admin") csmName.set(p.id as string, (p.full_name as string) ?? "");
      if (p.client_id) userCount.set(p.client_id as string, (userCount.get(p.client_id as string) ?? 0) + 1);
    }

    const companies: AdminCompany[] = (clients ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      initials: (c.initials as string) ?? "",
      color: (c.color as string) ?? "#5eead4",
      ownerCsmId: (c.owner_csm_id as string | null) ?? null,
      ownerCsmName: c.owner_csm_id ? csmName.get(c.owner_csm_id as string) ?? null : null,
      userCount: userCount.get(c.id as string) ?? 0,
    }));

    return Response.json({ companies });
  } catch (err) {
    return adminErrorResponse(err);
  }
}

// POST /api/admin/companies → create a company (id is derived from the name)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as CreateCompanyBody;

    const name = body.name?.trim();
    const ownerCsmId = body.ownerCsmId;
    if (!name) return Response.json({ error: "Nom requis" }, { status: 400 });
    if (!ownerCsmId) return Response.json({ error: "Un CSM propriétaire est requis" }, { status: 400 });

    // Derive a unique text primary key from the name.
    const base = slugify(name) || "entreprise";
    let id = base;
    for (let i = 2; ; i++) {
      const { data: existing, error } = await admin
        .from("clients")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!existing) break;
      id = `${base}-${i}`;
    }

    const { error } = await admin.from("clients").insert({
      id,
      name,
      initials: body.initials?.trim() || deriveInitials(name),
      color: body.color?.trim() || "#5eead4",
      owner_csm_id: ownerCsmId,
      formule: "", // NOT NULL, no default — set explicitly
    });
    if (error) return Response.json({ error: error.message }, { status: 400 });

    return Response.json({ id }, { status: 201 });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
