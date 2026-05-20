-- ─────────────────────────────────────────────────────────────────────────────
-- clients.owner_csm_id — real relation between a client and its CSM profile
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces the free-text `csm` / `csm_label` columns (kept for now, no longer
-- used by the UI) with a proper FK to the CSM's profile. Nullable: existing
-- clients stay unassigned until reassigned.

alter table public.clients
  add column if not exists owner_csm_id uuid references public.profiles (id) on delete set null;

create index if not exists clients_owner_csm_id_idx on public.clients (owner_csm_id);
