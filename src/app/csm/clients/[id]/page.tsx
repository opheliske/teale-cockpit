import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ClientDetailView from "./ClientDetailView";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Lightweight existence check. RLS applies via the connected user's session.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    // Don't 404 on a query failure — let the client view load/retry instead.
    console.error("[csm/clients/[id]] existence check", error);
  } else if (!data) {
    notFound();
  }

  return <ClientDetailView id={id} />;
}
