import type { Metadata } from "next";
import CsmSidebar from "@/components/CsmSidebar";

export const metadata: Metadata = {
  title: "Teale — Vue CSM",
  description: "Espace Customer Success Manager.",
};

export default function CsmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <CsmSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
