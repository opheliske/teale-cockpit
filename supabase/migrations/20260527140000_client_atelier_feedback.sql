-- ─────────────────────────────────────────────────────────────────────────────
-- client_atelier_feedback — rating + comment laissé par un client sur un
-- atelier de son one-year plan (page « Mes ateliers »).
-- ─────────────────────────────────────────────────────────────────────────────
-- L'atelier est identifié par item_id (= StoredPlanItem.id, unique au sein
-- du plan d'un client). La clé primaire composite (client_id, item_id)
-- garantit un seul feedback par atelier par client.

create table if not exists public.client_atelier_feedback (
  client_id  text not null references public.clients (id) on delete cascade,
  item_id    bigint not null,
  rating     integer not null check (rating >= 1 and rating <= 5),
  comment    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (client_id, item_id)
);

create index if not exists client_atelier_feedback_client_id_idx
  on public.client_atelier_feedback (client_id);

alter table public.client_atelier_feedback enable row level security;

-- Client lit/écrit son propre feedback ; CSM lit tout, peut modérer.
drop policy if exists "client_atelier_feedback_select" on public.client_atelier_feedback;
create policy "client_atelier_feedback_select" on public.client_atelier_feedback
  for select using (public.is_csm() or client_id = public.auth_client_id());

drop policy if exists "client_atelier_feedback_modify" on public.client_atelier_feedback;
create policy "client_atelier_feedback_modify" on public.client_atelier_feedback
  for all
  using (public.is_csm() or client_id = public.auth_client_id())
  with check (public.is_csm() or client_id = public.auth_client_id());

-- Realtime — propagation entre onglets / appareils / CSM.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_atelier_feedback'
  ) then
    alter publication supabase_realtime add table public.client_atelier_feedback;
  end if;
end $$;
