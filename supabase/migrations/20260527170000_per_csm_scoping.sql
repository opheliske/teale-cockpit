-- ─────────────────────────────────────────────────────────────────────────────
-- Per-CSM scoping for every per-client table
--
-- Until now the cockpit RLS treated every CSM as omniscient — any logged-in
-- CSM could read and write every other CSM's data (clients, plans, events,
-- notes, etc.). This migration tightens that to a strict ownership model:
-- a CSM only sees the rows attached to clients they own (clients.owner_csm_id
-- = auth.uid()). The client portal access path is preserved untouched.
-- ─────────────────────────────────────────────────────────────────────────────

-- Backfill any client whose owner_csm_id is still null with the earliest
-- CSM. Otherwise the new SELECT policy would hide them from everyone.
do $$
declare default_csm uuid;
begin
  select id into default_csm
  from public.profiles
  where role = 'csm'
  order by created_at asc
  limit 1;
  if default_csm is not null then
    update public.clients
    set owner_csm_id = default_csm
    where owner_csm_id is null;
  end if;
end $$;

-- ─── Helper ──────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so the policy itself bypasses its own RLS while evaluating
-- ownership (otherwise a chicken-and-egg loop would always answer "no").
create or replace function public.auth_owns_client(target_client_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1 from public.clients
    where id = target_client_id
      and owner_csm_id = auth.uid()
  );
$$;

grant execute on function public.auth_owns_client(text) to anon, authenticated;

-- ─── clients ────────────────────────────────────────────────────────────────
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (
    (public.is_csm() and owner_csm_id = auth.uid())
    or id = public.auth_client_id()
  );

-- Single write policy is replaced by per-verb policies so we can:
--   • require an INSERT to set a non-null owner (any CSM is OK — a CSM
--     can create a client directly for a colleague),
--   • require an UPDATE to apply on a row the caller owns, but let it
--     transfer ownership to another CSM,
--   • lock DELETE to the current owner.
drop policy if exists "clients_write" on public.clients;

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert with check (public.is_csm() and owner_csm_id is not null);

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update
  using (public.is_csm() and owner_csm_id = auth.uid())
  with check (public.is_csm() and owner_csm_id is not null);

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete using (public.is_csm() and owner_csm_id = auth.uid());

-- ─── Standard per-client tables (CSM-only on the write side) ────────────────
-- plan_state, documents, csm_events, health_entries, target_labels,
-- target_item_assignments, client_notes. The client portal can read
-- those rows that belong to its company.
do $$
declare t text;
begin
  foreach t in array array[
    'csm_events', 'health_entries', 'target_labels',
    'target_item_assignments', 'plan_state', 'documents', 'client_notes'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format('drop policy if exists %I on public.%I;', t || '_write', t);
    execute format('drop policy if exists %I on public.%I;', t || '_csm_all', t);

    execute format(
      'create policy %I on public.%I for select using ((public.is_csm() and public.auth_owns_client(client_id)) or client_id = public.auth_client_id());',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for all using (public.is_csm() and public.auth_owns_client(client_id)) with check (public.is_csm() and public.auth_owns_client(client_id));',
      t || '_write', t
    );
  end loop;
end $$;

-- ─── plan_comments (clients can post their own messages) ────────────────────
drop policy if exists "plan_comments_select" on public.plan_comments;
create policy "plan_comments_select" on public.plan_comments
  for select using (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );

drop policy if exists "plan_comments_insert" on public.plan_comments;
create policy "plan_comments_insert" on public.plan_comments
  for insert with check (
    (public.is_csm() and public.auth_owns_client(client_id))
    or (client_id = public.auth_client_id() and author = 'client')
  );

drop policy if exists "plan_comments_update" on public.plan_comments;
create policy "plan_comments_update" on public.plan_comments
  for update
  using (public.is_csm() and public.auth_owns_client(client_id))
  with check (public.is_csm() and public.auth_owns_client(client_id));

drop policy if exists "plan_comments_delete" on public.plan_comments;
create policy "plan_comments_delete" on public.plan_comments
  for delete using (public.is_csm() and public.auth_owns_client(client_id));

-- ─── urgencies (client may insert / update their own) ───────────────────────
drop policy if exists "urgencies_select" on public.urgencies;
create policy "urgencies_select" on public.urgencies
  for select using (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );

drop policy if exists "urgencies_insert" on public.urgencies;
create policy "urgencies_insert" on public.urgencies
  for insert with check (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );

drop policy if exists "urgencies_update" on public.urgencies;
create policy "urgencies_update" on public.urgencies
  for update
  using ((public.is_csm() and public.auth_owns_client(client_id)) or client_id = public.auth_client_id())
  with check ((public.is_csm() and public.auth_owns_client(client_id)) or client_id = public.auth_client_id());

drop policy if exists "urgencies_delete" on public.urgencies;
create policy "urgencies_delete" on public.urgencies
  for delete using (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );

-- ─── client_atelier_feedback (client posts their own rating) ────────────────
drop policy if exists "client_atelier_feedback_select" on public.client_atelier_feedback;
create policy "client_atelier_feedback_select" on public.client_atelier_feedback
  for select using (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );

drop policy if exists "client_atelier_feedback_modify" on public.client_atelier_feedback;
create policy "client_atelier_feedback_modify" on public.client_atelier_feedback
  for all
  using (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  )
  with check (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );
