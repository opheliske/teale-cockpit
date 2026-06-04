-- ─────────────────────────────────────────────────────────────────────────────
-- Admin role — superset of CSM
-- ─────────────────────────────────────────────────────────────────────────────
-- An `admin` (single account: ophelie.bazard@teale.io) manages every account and
-- company. Functionally it is a CSM with no ownership restriction:
--   • is_csm() now answers true for admin   → admin passes every CSM policy.
--   • auth_owns_client() is bypassed for admin → admin sees/edits ALL portfolios.
--   • clients select/update/delete add an explicit `or is_admin()`.
-- profiles/auth.users writes still go only through service_role (admin API
-- routes) — there is deliberately no profiles write policy.

-- ─── profiles constraint: allow an admin (no company, like a CSM) ───────────
alter table public.profiles drop constraint if exists profiles_role_client_id_check;
alter table public.profiles add constraint profiles_role_client_id_check check (
  (role = 'client' and client_id is not null) or
  (role in ('csm', 'admin') and client_id is null)
);

-- ─── Helpers ─────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- An admin counts as a CSM everywhere is_csm() gates access.
create or replace function public.is_csm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('csm', 'admin')
  );
$$;

-- Ownership check used by every per-client table. An admin owns everything.
create or replace function public.auth_owns_client(target_client_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or exists(
    select 1 from public.clients
    where id = target_client_id
      and owner_csm_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ─── clients: let an admin read/update/delete any company ───────────────────
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (
    (public.is_csm() and owner_csm_id = auth.uid())
    or public.is_admin()
    or id = public.auth_client_id()
  );

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update
  using ((public.is_csm() and owner_csm_id = auth.uid()) or public.is_admin())
  with check (public.is_csm() and owner_csm_id is not null);

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete using ((public.is_csm() and owner_csm_id = auth.uid()) or public.is_admin());

-- clients_insert already requires (is_csm() and owner_csm_id is not null);
-- an admin satisfies is_csm(), so no change is needed there.
