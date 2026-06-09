import { requireAdmin, adminErrorResponse } from "@/lib/supabase-admin";
import type { AdminCompany } from "@/lib/admin-types";

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
