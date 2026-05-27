-- ─────────────────────────────────────────────────────────────────────────────
-- client_notes — CSM-internal notes per client
-- ─────────────────────────────────────────────────────────────────────────────
-- The "Notes & contexte projet" tab on each client is labelled "uniquement
-- visibles par toi" — strictly CSM-only. Clients never read these rows.

create table if not exists public.client_notes (
  id          bigint primary key generated always as identity,
  client_id   text not null references public.clients (id) on delete cascade,
  type        text not null,
  date        text not null,
  text        text not null,
  cta_label   text not null default '',
  cta_variant text not null default 'default',
  alert       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists client_notes_client_id_idx on public.client_notes (client_id);

alter table public.client_notes enable row level security;

drop policy if exists "client_notes_csm_all" on public.client_notes;
create policy "client_notes_csm_all" on public.client_notes
  for all to authenticated
  using (public.is_csm()) with check (public.is_csm());

-- Realtime — propagate changes between tabs / CSM devices.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_notes'
  ) then
    alter publication supabase_realtime add table public.client_notes;
  end if;
end $$;
