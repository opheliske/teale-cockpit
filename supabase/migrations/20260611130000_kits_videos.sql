-- ─────────────────────────────────────────────────────────────────────────────
-- Kits — vidéos (lien et/ou fichiers, FR ou EN)
-- ─────────────────────────────────────────────────────────────────────────────
-- Rubrique « Divers » du catalogue de communication. Une ligne = une vidéo dans
-- une langue (on crée une carte FR et une carte EN). Une vidéo porte un lien
-- (YouTube/Vimeo/Loom/mp4) et/ou des fichiers uploadés (`files`, même forme que
-- les visuels, bucket "kit-files"). RLS comme les autres kits_* : lecture par
-- tout utilisateur connecté, écriture réservée à is_csm() (admin inclus).

create table if not exists public.kits_videos (
  id         text primary key,
  title      text not null,
  language   text not null check (language in ('FR', 'EN')),
  url        text,
  files      jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists kits_videos_language_idx on public.kits_videos (language);

alter table public.kits_videos enable row level security;

drop policy if exists "kits_videos_select" on public.kits_videos;
create policy "kits_videos_select" on public.kits_videos
  for select using (auth.uid() is not null);

drop policy if exists "kits_videos_write" on public.kits_videos;
create policy "kits_videos_write" on public.kits_videos
  for all using (public.is_csm()) with check (public.is_csm());
