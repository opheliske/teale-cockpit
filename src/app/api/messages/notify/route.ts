import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

// POST /api/messages/notify
// Notifie par email le destinataire d'un nouveau message de chat.
//   body: { threadId, clientId, author, text, itemTitle? }
//   author = côté EXPÉDITEUR ("csm" → notifie les clients ; "client" → notifie
//   le CSM propriétaire). Best-effort, non bloquant : renvoie toujours 200 et
//   ne fait rien si RESEND_API_KEY n'est pas configurée.
export async function POST(req: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ ok: true, skipped: "no RESEND_API_KEY" });

  try {
    // L'appelant doit être authentifié (évite l'envoi d'emails par un tiers).
    const authed = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authed.auth.getUser();
    if (!user) return Response.json({ ok: false }, { status: 401 });

    const body = (await req.json()) as {
      threadId?: string;
      clientId?: string;
      author?: "csm" | "client";
      text?: string;
      itemTitle?: string;
    };
    const { threadId, clientId, author } = body;
    if (!threadId || !clientId || (author !== "csm" && author !== "client")) {
      return Response.json({ ok: false, skipped: "bad payload" });
    }

    const admin = createSupabaseAdminClient();
    let recipients: string[] = [];
    if (author === "csm") {
      // Le CSM a écrit → notifier les utilisateurs clients de la société.
      const { data } = await admin
        .from("profiles")
        .select("email")
        .eq("client_id", clientId)
        .eq("role", "client");
      recipients = (data ?? []).map((r) => r.email as string).filter(Boolean);
    } else {
      // Le client a écrit → notifier le CSM propriétaire de la société.
      const { data: company } = await admin
        .from("clients")
        .select("owner_csm_id, name")
        .eq("id", clientId)
        .maybeSingle();
      const ownerId = (company?.owner_csm_id as string | null) ?? null;
      if (ownerId) {
        const { data: prof } = await admin
          .from("profiles")
          .select("email")
          .eq("id", ownerId)
          .maybeSingle();
        if (prof?.email) recipients = [prof.email as string];
      }
    }
    if (recipients.length === 0) return Response.json({ ok: true, skipped: "no recipients" });

    const origin = new URL(req.url).origin;
    const link =
      author === "csm"
        ? `${origin}/mon-planning?openPlan=${encodeURIComponent(threadId)}`
        : `${origin}/csm/clients/${encodeURIComponent(clientId)}?openPlan=${encodeURIComponent(threadId)}`;
    const subject =
      author === "csm"
        ? "💬 Nouveau message de votre CSM Teale"
        : `💬 Nouveau message client${body.itemTitle ? ` — ${body.itemTitle}` : ""}`;
    const preview = (body.text ?? "").slice(0, 280);
    const html = `
      <div style="font-family:-apple-system,Segoe UI,sans-serif;color:#0e2520">
        <p>${author === "csm" ? "Votre CSM Teale vous a écrit" : "Un client vous a écrit"}${body.itemTitle ? ` à propos de « ${escapeHtml(body.itemTitle)} »` : ""} :</p>
        ${preview ? `<blockquote style="border-left:3px solid #5eead4;margin:0;padding:6px 12px;color:#2d4039">${escapeHtml(preview)}</blockquote>` : ""}
        <p><a href="${link}" style="display:inline-block;background:#5eead4;color:#06140f;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Ouvrir la conversation</a></p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Teale <notifications@teale.io>",
        to: recipients,
        subject,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[notify] resend", res.status, await res.text().catch(() => ""));
      return Response.json({ ok: false }, { status: 502 });
    }
    return Response.json({ ok: true, sent: recipients.length });
  } catch (err) {
    console.error("[notify] error", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
