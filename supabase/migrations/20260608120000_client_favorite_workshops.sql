-- ─────────────────────────────────────────────────────────────────────────────
-- client_favorite_workshops — bibliothèque d'ateliers favoris d'un client.
-- ─────────────────────────────────────────────────────────────────────────────
-- Le client épingle des ateliers du catalogue depuis la page « Catalogue
-- d'ateliers ». L'atelier est identifié par workshop_id (= Workshop.id du
-- catalogue). La clé primaire composite (client_id, workshop_id) garantit
-- qu'un atelier ne figure qu'une fois dans la liste d'un client et rend
-- l'ajout idempotent (upsert).
--
-- Persistance serveur volontaire (pas de localStorage) : la liste est
-- synchronisée entre tous les appareils du client et visible côté CSM.

create table if not exists public.client_favorite_workshops (
  client_id   text not null references public.clients (id) on delete cascade,
  workshop_id text not null,
  created_at  timestamptz not null default now(),
  primary key (client_id, workshop_id)
);

create index if not exists client_favorite_workshops_client_id_idx
  on public.client_favorite_workshops (client_id);

alter table public.client_favorite_workshops enable row level security;

-- Client lit/écrit ses propres favoris ; CSM lit (et peut modérer) ceux des
-- clients qu'il possède. Même modèle que client_atelier_feedback.
drop policy if exists "client_favorite_workshops_select" on public.client_favorite_workshops;
create policy "client_favorite_workshops_select" on public.client_favorite_workshops
  for select using (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );

drop policy if exists "client_favorite_workshops_modify" on public.client_favorite_workshops;
create policy "client_favorite_workshops_modify" on public.client_favorite_workshops
  for all
  using (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  )
  with check (
    (public.is_csm() and public.auth_owns_client(client_id))
    or client_id = public.auth_client_id()
  );

-- Realtime — propagation entre onglets / appareils / CSM.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'client_favorite_workshops'
  ) then
    alter publication supabase_realtime add table public.client_favorite_workshops;
  end if;
end $$;
