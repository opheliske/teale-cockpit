import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import ClientImpersonationBanner from "@/components/ClientImpersonationBanner";

export const metadata: Metadata = {
  title: "Teale — Vue Client",
  description: "Pilotage et ressources Teale pour les clients RH.",
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ClientImpersonationBanner />
        {children}
      </main>
    </div>
  );
}
