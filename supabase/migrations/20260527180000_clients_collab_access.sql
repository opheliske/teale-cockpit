-- ─────────────────────────────────────────────────────────────────────────────
-- Collaborative CSM access on shared client tables
--
-- The strict per-owner RLS from 20260527170000 forbade a CSM from opening
-- another CSM's client at all — even just to read context from the Suivi
-- clients page. We now broaden read+write on clients and per-client tables
-- back to any logged-in CSM ("primary CSM" stays an informational attribute
-- carried by clients.owner_csm_id). Per-CSM scoping on the Home / QBR /
-- Agenda is enforced at the app layer instead, by filtering on owner_csm_id.
--
-- client_actions keeps its strict per-CSM ownership (from migration
-- 20260527160000) — each CSM's personal to-do list stays private.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── clients ────────────────────────────────────────────────────────────────
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;
drop policy if exists "clients_write" on public.clients;

create policy "clients_select" on public.clients
  for select using (public.is_csm() or id = public.auth_client_id());

create policy "clients_write" on public.clients
  for all using (public.is_csm()) with check (public.is_csm());

-- ─── Standard per-client tables ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'csm_events', 'health_entries', 'target_labels',
    'target_item_assignments', 'plan_state', 'documents', 'client_notes'
  ]
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format('drop policy if exists %I on public.%I;', t || '_write', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_csm() or client_id = public.auth_client_id());',
      t || '_select', t
    );
    execute format(
      'create policy %I on public.%I for all using (public.is_csm()) with check (public.is_csm());',
      t || '_write', t
    );
  end loop;
end $$;

-- ─── plan_comments (clients post their own messages) ───────────────────────
drop policy if exists "plan_comments_select" on public.plan_comments;
drop policy if exists "plan_comments_insert" on public.plan_comments;
drop policy if exists "plan_comments_update" on public.plan_comments;
drop policy if exists "plan_comments_delete" on public.plan_comments;

create policy "plan_comments_select" on public.plan_comments
  for select using (public.is_csm() or client_id = public.auth_client_id());

create policy "plan_comments_insert" on public.plan_comments
  for insert with check (
    public.is_csm()
    or (client_id = public.auth_client_id() and author = 'client')
  );

create policy "plan_comments_update" on public.plan_comments
  for update using (public.is_csm()) with check (public.is_csm());

create policy "plan_comments_delete" on public.plan_comments
  for delete using (public.is_csm());

-- ─── urgencies (clients can flag their own) ────────────────────────────────
drop policy if exists "urgencies_select" on public.urgencies;
drop policy if exists "urgencies_insert" on public.urgencies;
drop policy if exists "urgencies_update" on public.urgencies;
drop policy if exists "urgencies_delete" on public.urgencies;

create policy "urgencies_select" on public.urgencies
  for select using (public.is_csm() or client_id = public.auth_client_id());

create policy "urgencies_insert" on public.urgencies
  for insert with check (public.is_csm() or client_id = public.auth_client_id());

create policy "urgencies_update" on public.urgencies
  for update using (public.is_csm() or client_id = public.auth_client_id())
            with check (public.is_csm() or client_id = public.auth_client_id());

create policy "urgencies_delete" on public.urgencies
  for delete using (public.is_csm() or client_id = public.auth_client_id());

-- ─── client_atelier_feedback (clients post their own ratings) ──────────────
drop policy if exists "client_atelier_feedback_select" on public.client_atelier_feedback;
drop policy if exists "client_atelier_feedback_modify" on public.client_atelier_feedback;

create policy "client_atelier_feedback_select" on public.client_atelier_feedback
  for select using (public.is_csm() or client_id = public.auth_client_id());

create policy "client_atelier_feedback_modify" on public.client_atelier_feedback
  for all using (public.is_csm() or client_id = public.auth_client_id())
            with check (public.is_csm() or client_id = public.auth_client_id());
