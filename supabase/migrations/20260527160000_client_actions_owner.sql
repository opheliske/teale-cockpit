-- ─────────────────────────────────────────────────────────────────────────────
-- Per-CSM ownership for client_actions
--
-- Until now, every CSM could see (and edit) every other CSM's to-do items —
-- the home "Mes actions" panel was effectively shared. This migration adds
-- an `owner_csm_id` column, backfills existing rows to the earliest CSM so
-- nothing becomes invisible, and tightens RLS to per-owner scoping.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.client_actions
  add column if not exists owner_csm_id uuid references auth.users(id) on delete cascade;

create index if not exists client_actions_owner_csm_id_idx
  on public.client_actions (owner_csm_id);

-- Backfill: any pre-existing row gets attached to the earliest CSM in the
-- profiles table, so the actions stay visible to someone (typically the
-- single CSM that has been using the cockpit so far) instead of becoming
-- invisible orphans for every user once the new RLS lands.
do $$
declare
  default_csm uuid;
begin
  select id into default_csm
  from public.profiles
  where role = 'csm'
  order by created_at asc
  limit 1;

  if default_csm is not null then
    update public.client_actions
    set owner_csm_id = default_csm
    where owner_csm_id is null;
  end if;
end $$;

-- Replace the "any logged-in CSM sees everything" policy with per-owner
-- scoping. Each CSM only sees, inserts, updates and deletes their own rows.
drop policy if exists "client_actions_csm_only" on public.client_actions;

drop policy if exists "client_actions_select_own" on public.client_actions;
create policy "client_actions_select_own" on public.client_actions
  for select using (public.is_csm() and owner_csm_id = auth.uid());

drop policy if exists "client_actions_insert_own" on public.client_actions;
create policy "client_actions_insert_own" on public.client_actions
  for insert with check (public.is_csm() and owner_csm_id = auth.uid());

drop policy if exists "client_actions_update_own" on public.client_actions;
create policy "client_actions_update_own" on public.client_actions
  for update using (public.is_csm() and owner_csm_id = auth.uid())
            with check (public.is_csm() and owner_csm_id = auth.uid());

drop policy if exists "client_actions_delete_own" on public.client_actions;
create policy "client_actions_delete_own" on public.client_actions
  for delete using (public.is_csm() and owner_csm_id = auth.uid());
