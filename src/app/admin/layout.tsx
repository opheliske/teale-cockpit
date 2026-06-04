import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AdminSidebar from "@/components/AdminSidebar";

export const metadata: Metadata = {
  title: "Teale — Admin",
  description: "Administration des accès et des comptes.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side gate (defence in depth — the proxy already blocks non-admins).
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/");

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar email={user.email ?? ""} />
      <main className="flex-1 overflow-y-auto bg-[#061a16]">{children}</main>
    </div>
  );
}
