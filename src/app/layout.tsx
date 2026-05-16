import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teale — Vue Client",
  description: "Pilotage et ressources Teale pour les clients RH.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} h-full antialiased`}>
      <body className="h-full text-brand-cream">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
