-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — enable RLS and define access policies on every table
-- ─────────────────────────────────────────────────────────────────────────────
-- Model:
--   • CSM   → reads ALL client data, and may write (INSERT/UPDATE/DELETE).
--   • Client → reads ONLY rows of its own company (client_id), read-only,
--              except inserting its own plan_comments.
--   • Catalogue tables (workshops, kits_*) → readable by any logged-in user,
--              writable by CSM only.
--   • Not logged in → auth.uid() is NULL → every policy fails → no access.
-- The service_role key (admin scripts) bypasses RLS entirely and is never
-- exposed to the frontend.

-- ─── Helper functions ────────────────────────────────────────────────────────
-- SECURITY DEFINER so they can read public.profiles without being themselves
-- filtered by RLS — this also avoids infinite recursion in profiles policies.

create or replace function public.is_csm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'csm'
  );
$$;

create or replace function public.auth_client_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select client_id from public.profiles where id = auth.uid();
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_csm());
-- No INSERT/UPDATE/DELETE policy: profiles are written only by the
-- handle_new_user() trigger (SECURITY DEFINER) and by the admin service_role.

-- ─── clients (company table — scoping column is `id`) ────────────────────────
alter table public.clients enable row level security;

drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (public.is_csm() or id = public.auth_client_id());

drop policy if exists "clients_write" on public.clients;
create policy "clients_write" on public.clients
  for all using (public.is_csm()) with check (public.is_csm());

-- ─── Standard client-scoped tables (scoping column is `client_id`) ──────────
-- csm_events, health_entries, target_labels, target_item_assignments,
-- plan_state, documents — all share the same policy shape.
do $$
declare
  t text;
begin
  foreach t in array array[
    'csm_events', 'health_entries', 'target_labels',
    'target_item_assignments', 'plan_state', 'documents'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_csm() or client_id = public.auth_client_id());',
      t || '_select', t
    );

    execute format('drop policy if exists %I on public.%I;', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_csm()) with check (public.is_csm());',
      t || '_write', t
    );
  end loop;
end $$;

-- ─── plan_comments (client may insert its own; CSM full access) ─────────────
alter table public.plan_comments enable row level security;

drop policy if exists "plan_comments_select" on public.plan_comments;
create policy "plan_comments_select" on public.plan_comments
  for select using (public.is_csm() or client_id = public.auth_client_id());

drop policy if exists "plan_comments_insert" on public.plan_comments;
create policy "plan_comments_insert" on public.plan_comments
  for insert with check (
    public.is_csm()
    or (client_id = public.auth_client_id() and author = 'client')
  );

drop policy if exists "plan_comments_update" on public.plan_comments;
create policy "plan_comments_update" on public.plan_comments
  for update using (public.is_csm()) with check (public.is_csm());

drop policy if exists "plan_comments_delete" on public.plan_comments;
create policy "plan_comments_delete" on public.plan_comments
  for delete using (public.is_csm());

-- ─── client_actions (CSM-only home to-do list — no client access at all) ────
alter table public.client_actions enable row level security;

drop policy if exists "client_actions_csm_only" on public.client_actions;
create policy "client_actions_csm_only" on public.client_actions
  for all using (public.is_csm()) with check (public.is_csm());

-- ─── Catalogue tables (shared content — any logged-in user reads) ───────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'workshops', 'kits_lancement', 'kits_animation', 'kits_email'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() is not null);',
      t || '_select', t
    );

    execute format('drop policy if exists %I on public.%I;', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_csm()) with check (public.is_csm());',
      t || '_write', t
    );
  end loop;
end $$;
