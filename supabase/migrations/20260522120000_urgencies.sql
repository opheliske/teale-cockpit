-- ─────────────────────────────────────────────────────────────────────────────
-- urgencies — emergency intervention declarations made from the client portal
-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces the previous localStorage-only storage so a declaration (death,
-- suicide, serious accident…) actually reaches the CSM and survives a device
-- change. Columns mirror the Urgency type in src/lib/urgencies.ts.

create table if not exists public.urgencies (
  id                 text primary key,
  client_id          text not null references public.clients (id) on delete cascade,
  created_at         timestamptz not null default now(),
  event_date         text not null,
  type               text not null,
  description        text,
  modalities         jsonb not null default '{}',
  affected_headcount text,
  mode               text not null,
  location           text,
  rh_contact         text
);

create index if not exists urgencies_client_id_idx on public.urgencies (client_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- A client inserts/reads only its own declarations; a CSM reads everything.
alter table public.urgencies enable row level security;

drop policy if exists "urgencies_select" on public.urgencies;
create policy "urgencies_select" on public.urgencies
  for select using (public.is_csm() or client_id = public.auth_client_id());

drop policy if exists "urgencies_insert" on public.urgencies;
create policy "urgencies_insert" on public.urgencies
  for insert with check (public.is_csm() or client_id = public.auth_client_id());

drop policy if exists "urgencies_update" on public.urgencies;
create policy "urgencies_update" on public.urgencies
  for update using (public.is_csm()) with check (public.is_csm());

drop policy if exists "urgencies_delete" on public.urgencies;
create policy "urgencies_delete" on public.urgencies
  for delete using (public.is_csm());

-- ─── Realtime ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'urgencies'
  ) then
    alter publication supabase_realtime add table public.urgencies;
  end if;
end $$;
