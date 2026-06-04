"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import type { AdminUser, AdminCompany, ManagedRole } from "@/lib/admin-types";

const ROLE_LABEL: Record<string, string> = { csm: "CSM", client: "Client", admin: "Admin" };

function formatDate(iso: string | null): string {
  if (!iso) return "Jamais";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type Draft = {
  fullName: string;
  email: string;
  role: ManagedRole;
  clientId: string;
  password: string;
};

const EMPTY_DRAFT: Draft = { fullName: "", email: "", role: "csm", clientId: "", password: "" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // modal: null = closed; {id?} = create when no id, edit otherwise
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [createdPassword, setCreatedPassword] = useState<{ email: string; password: string } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [u, c] = await Promise.all([adminApi.listUsers(), adminApi.listCompanies()]);
      setUsers(u);
      setCompanies(c);
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
        const [u, c] = await Promise.all([adminApi.listUsers(), adminApi.listCompanies()]);
        if (!active) return;
        setUsers(u);
        setCompanies(c);
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

  const companyOptions = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setCreating(true);
    setEditing(null);
    setError("");
  };

  const openEdit = (u: AdminUser) => {
    setDraft({
      fullName: u.fullName,
      email: u.email,
      role: u.role === "admin" ? "csm" : u.role,
      clientId: u.clientId ?? "",
      password: "",
    });
    setEditing(u);
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
      if (draft.role === "client" && !draft.clientId) {
        throw new Error("Sélectionnez une entreprise pour un compte client.");
      }
      if (creating) {
        const res = await adminApi.createUser({
          email: draft.email,
          role: draft.role,
          clientId: draft.role === "client" ? draft.clientId : null,
          fullName: draft.fullName,
        });
        setCreatedPassword({ email: res.email, password: res.password });
        closeModal();
      } else if (editing) {
        await adminApi.updateUser(editing.id, {
          fullName: draft.fullName,
          email: draft.email,
          role: draft.role,
          clientId: draft.role === "client" ? draft.clientId : null,
          password: draft.password || undefined,
        });
        closeModal();
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'opération");
    } finally {
      setBusy(false);
    }
  };

  const toggleDisabled = async (u: AdminUser) => {
    const verb = u.disabled ? "réactiver" : "désactiver";
    if (!window.confirm(`Voulez-vous ${verb} le compte de ${u.email} ?`)) return;
    setBusy(true);
    try {
      await adminApi.updateUser(u.id, { disabled: !u.disabled });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: AdminUser) => {
    if (!window.confirm(`Supprimer définitivement le compte ${u.email} ? Cette action est irréversible.`)) return;
    setBusy(true);
    try {
      await adminApi.deleteUser(u.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec");
      window.alert(e instanceof Error ? e.message : "Échec");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-8 py-8 text-brand-cream">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#e8f5ef]">Utilisateurs</h1>
          <p className="mt-1 text-[13px] text-[#94a8a0]">
            Gérez les accès des CSM et des clients.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-[9px] bg-[#5eead4] px-4 py-2.5 text-[13px] font-semibold text-[#042f2a] transition-opacity hover:opacity-90"
        >
          + Ajouter un utilisateur
        </button>
      </header>

      {error && !creating && !editing && (
        <p className="mb-4 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">{error}</p>
      )}

      {createdPassword && (
        <div className="mb-4 rounded-[10px] border border-[rgba(94,234,212,0.3)] bg-[rgba(14,37,32,0.6)] p-4">
          <p className="text-[13px] text-[#a8e895]">
            Compte créé pour <strong>{createdPassword.email}</strong>. Mot de passe à transmettre (affiché une seule fois) :
          </p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-[#06231f] px-3 py-1.5 text-[13px] text-[#e8f5ef]">{createdPassword.password}</code>
            <button
              onClick={() => void navigator.clipboard?.writeText(createdPassword.password)}
              className="rounded-[7px] border border-[rgba(94,234,212,0.3)] px-2.5 py-1 text-[12px] hover:bg-[rgba(94,234,212,0.1)]"
            >
              Copier
            </button>
            <button
              onClick={() => setCreatedPassword(null)}
              className="ml-auto text-[12px] text-[#94a8a0] hover:text-brand-cream"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[13px] text-[#94a8a0]">Chargement…</p>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-[#1a3530]">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[rgba(14,37,32,0.6)] text-[11px] uppercase tracking-wide text-[rgba(94,234,212,0.6)]">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Dernière connexion</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[#1a3530]">
                  <td className="px-4 py-3">{u.fullName || "—"}</td>
                  <td className="px-4 py-3 text-[#cbd9d3]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[rgba(94,234,212,0.12)] px-2 py-0.5 text-[11px] text-[#a8e895]">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#cbd9d3]">{u.clientName ?? (u.role === "client" ? "—" : "")}</td>
                  <td className="px-4 py-3 text-[#94a8a0]">{formatDate(u.lastSignInAt)}</td>
                  <td className="px-4 py-3">
                    {u.disabled ? (
                      <span className="text-[12px] text-[#fca5a5]">Désactivé</span>
                    ) : (
                      <span className="text-[12px] text-[#7fd1a8]">Actif</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.role !== "admin" && (
                        <>
                          <button onClick={() => openEdit(u)} className="text-[12px] text-[#5eead4] hover:underline">
                            Modifier
                          </button>
                          <button onClick={() => void toggleDisabled(u)} disabled={busy} className="text-[12px] text-[#e8c07f] hover:underline disabled:opacity-50">
                            {u.disabled ? "Réactiver" : "Désactiver"}
                          </button>
                          <button onClick={() => void remove(u)} disabled={busy} className="text-[12px] text-[#fca5a5] hover:underline disabled:opacity-50">
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-[#94a8a0]">Aucun utilisateur.</td>
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
              {creating ? "Nouvel utilisateur" : "Modifier l'utilisateur"}
            </h2>

            <label className="mb-1 block text-[12px] text-[#94a8a0]">Nom complet</label>
            <input
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              className="mb-3 w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
            />

            <label className="mb-1 block text-[12px] text-[#94a8a0]">Email</label>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="mb-3 w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
            />

            <label className="mb-1 block text-[12px] text-[#94a8a0]">Rôle</label>
            <select
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as ManagedRole })}
              className="mb-3 w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
            >
              <option value="csm">CSM</option>
              <option value="client">Client</option>
            </select>

            {draft.role === "client" && (
              <>
                <label className="mb-1 block text-[12px] text-[#94a8a0]">Entreprise</label>
                <select
                  value={draft.clientId}
                  onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}
                  className="mb-3 w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
                >
                  <option value="">— Sélectionner —</option>
                  {companyOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </>
            )}

            {editing && (
              <>
                <label className="mb-1 block text-[12px] text-[#94a8a0]">Nouveau mot de passe (laisser vide pour inchangé)</label>
                <input
                  type="text"
                  value={draft.password}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  className="mb-3 w-full rounded-[8px] border border-[#1a3530] bg-[rgba(6,26,22,0.6)] px-3 py-2 text-[13px] text-[#e8f5ef] outline-none focus:border-[rgba(94,234,212,0.4)]"
                />
              </>
            )}

            {creating && (
              <p className="mb-3 text-[12px] text-[#94a8a0]">
                Un mot de passe sera généré et affiché une fois après la création.
              </p>
            )}

            {error && (creating || editing) && (
              <p className="mb-3 rounded-[8px] bg-[rgba(239,68,68,0.1)] px-3 py-2 text-[12px] text-[#fca5a5]">{error}</p>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <button onClick={closeModal} disabled={busy} className="rounded-[8px] border border-[#1a3530] px-3 py-2 text-[13px] text-[#94a8a0] hover:text-brand-cream disabled:opacity-50">
                Annuler
              </button>
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
