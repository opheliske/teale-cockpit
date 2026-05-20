-- ─────────────────────────────────────────────────────────────────────────────
-- Auth — profiles table, role enum, and auto-provisioning trigger
-- ─────────────────────────────────────────────────────────────────────────────
-- Every auth.users row is mirrored into public.profiles, which carries the
-- application role and (for clients) the company the user belongs to.
-- Accounts are created by the admin via scripts/create-user.ts — there is no
-- public signup.

-- ─── Role enum ───────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('csm', 'client');
  end if;
end $$;

-- ─── profiles table ──────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null,
  -- clients.id is text; NULL for CSM users, required for client users.
  client_id  text references public.clients (id) on delete restrict,
  full_name  text not null default '',
  email      text not null,
  created_at timestamptz not null default now(),
  -- A client must belong to a company; a CSM must not be tied to one.
  constraint profiles_role_client_id_check check (
    (role = 'client' and client_id is not null) or
    (role = 'csm'    and client_id is null)
  )
);

create index if not exists profiles_client_id_idx on public.profiles (client_id);

-- ─── Auto-provisioning trigger ───────────────────────────────────────────────
-- When an auth user is created, mirror it into profiles. Role, client_id and
-- full_name are read from the user metadata set by the admin create-user script.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, client_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'client')::public.user_role,
    nullif(new.raw_user_meta_data ->> 'client_id', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
