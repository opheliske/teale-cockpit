"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { AdminCompany, AdminUser } from "@/lib/admin-types";

type Draft = {
  name: string;
  initials: string;
  color: string;
  ownerCsmId: string;
};

const EMPTY_DRAFT: Draft = { name: "", initials: "", color: "#5eead4", ownerCsmId: "" };

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [csms, setCsms] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<AdminCompany | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, u] = await Promise.all([adminApi.listCompanies(), adminApi.listUsers()]);
      setCompanies(c);
      setCsms(u.filter((x) => x.role === "csm" || x.role === "admin"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — await-first so no setState runs synchronously in the effect
  // body (loading starts true). reload() is reused by the action handlers.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [c, u] = await Promise.all([adminApi.listCompanies(), adminApi.listUsers()]);
        if (!active) return;
        setCompanies(c);
        setCsms(u.filter((x) => x.role === "csm" || x.role === "admin"));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur de chargement");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const csmOptions = useMemo(
    () => [...csms].sort((a, b) => (a.fullName || a.email).localeCompare(b.fullName || b.email)),
    [csms],
  );

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setCreating(true);
    setEditing(null);
    setError("");
  };

  const openEdit = (c: AdminCompany) => {
    setDraft({ name: c.name, initials: c.initials, color: c.color, ownerCsmId: c.ownerCsmId ?? "" });
    setEditing(c);
    setCreating(false);
    setError("");
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
    setDraft(EMPTY_DRAFT);
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!draft.name.trim()) throw new Error("Le nom est requis.");
      if (!draft.ownerCsmId) throw new Error("Sélectionnez un CSM propriétaire.");
      if (creating) {
        await adminApi.createCompany({
          name: draft.name,
          ownerCsmId: draft.ownerCsmId,
          initials: draft.initials || undefined,
          color: draft.color || undefined,
        });
      } else if (editing) {
        await adminApi.updateCompany(editing.id, {
          name: draft.name,
          initials: draft.initials,
          color: draft.color,
          ownerCsmId: draft.ownerCsmId,
        });
      }
      closeModal();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'opération");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: AdminCompany) => {
    if (!window.confirm(`Supprimer l'entreprise « ${c.name} » ?`)) return;
    setBusy(true);
    try {
      await adminApi.deleteCompany(c.id);
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8 text-brand-cream">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#e8f5ef]">Entreprises</h1>
          <p className="mt-1 text-[13px] text-[#94a8a0]">
            Gérez les entreprises clientes et leur CSM propriétaire.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-[9px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-[#042f2a] transition-opacity hover:opacity-90"
        >
          + Ajouter une entreprise
        </button>
      </header>

      {error && !creating && !editing && (
        <p className="mb-4 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">{error}</p>
      )}

      {loading ? (
        <p className="text-[13px] text-[#94a8a0]">Chargement…</p>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-[#1a3530]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[rgba(14,37,32,0.6)] text-[11px] uppercase tracking-wide text-[rgba(94,234,212,0.6)]">
              <tr>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">CSM propriétaire</th>
                <th className="px-4 py-3">Comptes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t border-[#1a3530]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-semibold text-[#042f2a]"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.initials}
                      </span>
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#cbd9d3]">{c.ownerCsmName ?? <span className="text-[#fca5a5]">Non assigné</span>}</td>
                  <td className="px-4 py-3 text-[#94a8a0]">{c.userCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="text-[12px] text-[#5eead4] hover:underline">Modifier</button>
                      <button onClick={() => void remove(c)} disabled={busy} className="text-[12px] text-[#fca5a5] hover:underline disabled:opacity-50">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[#94a8a0]">Aucune entreprise.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-[460px] rounded-[14px] border border-[#1a3530] bg-[#0b1f1b] p-6">
            <h2 className="mb-4 text-[16px] font-semibold text-[#e8f5ef]">
              {creating ? "Nouvelle entreprise" : "Modifier l'entreprise"}
            </h2>

            <label className="mb-1 block text-[12px] text-[#94a8a0]">Nom</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mb-3 w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
            />

            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[12px] text-[#94a8a0]">Initiales</label>
                <input
                  value={draft.initials}
                  maxLength={3}
                  placeholder="auto"
                  onChange={(e) => setDraft({ ...draft, initials: e.target.value.toUpperCase() })}
                  className="w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] text-[#94a8a0]">Couleur</label>
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                  className="h-[38px] w-[52px] cursor-pointer rounded-[8px] border border-[#1a3530] bg-transparent"
                />
              </div>
            </div>

            <label className="mb-1 block text-[12px] text-[#94a8a0]">CSM propriétaire</label>
            <select
              value={draft.ownerCsmId}
              onChange={(e) => setDraft({ ...draft, ownerCsmId: e.target.value })}
              className="mb-3 w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
            >
              <option value="">— Sélectionner —</option>
              {csmOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName || u.email}</option>
              ))}
            </select>

            {error && (creating || editing) && (
              <p className="mb-3 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">{error}</p>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <button onClick={closeModal} disabled={busy} className="rounded-[8px] border border-[#1a3530] px-3 py-2 text-[13px] text-[#94a8a0] hover:text-brand-cream disabled:opacity-50">Annuler</button>
              <button onClick={() => void submit()} disabled={busy} className="rounded-[8px] bg-[#5eead4] px-4 py-2 text-[13px] font-semibold text-[#042f2a] hover:opacity-90 disabled:opacity-50">
                {busy ? "…" : creating ? "Créer" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
