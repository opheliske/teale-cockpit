"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { impersonationStore } from "@/lib/impersonation-store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: signIn, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !signIn.user) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // Resolve role + company to land the user on the right space.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, client_id")
      .eq("id", signIn.user.id)
      .single();

    if (!profile) {
      setError("Aucun profil associé à ce compte. Contactez votre administrateur.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // CSM et admin atterrissent par défaut sur l'espace CSM (l'admin est un
    // sur-ensemble de CSM ; il garde l'accès à /admin via l'URL / la nav).
    if (profile.role === "csm" || profile.role === "admin") {
      impersonationStore.set(null);
      router.replace("/csm");
      return;
    }

    // Client: seed the active client context with their own company.
    if (profile.client_id) {
      const { data: company } = await supabase
        .from("clients")
        .select("id, name, color")
        .eq("id", profile.client_id)
        .single();
      impersonationStore.set({
        mode: "self",
        clientId: profile.client_id,
        clientName: company?.name ?? "",
        color: company?.color ?? "#5eead4",
      });
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#061a16] px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/teale-logo.png"
            alt="Teale"
            width={512}
            height={512}
            priority
            className="mb-4 h-[46px] w-[46px] rounded-xl"
          />
          <h1 className="text-[20px] font-semibold text-[#e8f5ef]">
            Cockpit Teale
          </h1>
          <p className="mt-1 text-[13px] text-[#94a8a0]">
            Connectez-vous pour accéder à votre espace.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[16px] border border-[#1a3530] bg-[rgba(14,37,32,0.5)] p-6"
        >
          <label className="mb-1.5 block text-[12px] font-medium text-[#94a8a0]">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mb-4 w-full rounded-[9px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
          />

          <label className="mb-1.5 block text-[12px] font-medium text-[#94a8a0]">
            Mot de passe
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mb-4 w-full rounded-[9px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2.5 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
          />

          {error && (
            <p className="mb-4 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[9px] bg-[#5eead4] py-2.5 text-[13px] font-semibold text-[#042f2a] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
