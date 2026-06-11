-- ─────────────────────────────────────────────────────────────────────────────
-- Kits — fiches pratiques (documents téléchargeables, FR ou EN)
-- ─────────────────────────────────────────────────────────────────────────────
-- Rubrique « Divers » du catalogue de communication. Une ligne = une fiche
-- dans une langue (on crée une carte FR et une carte EN). `files` réutilise la
-- forme [{id, path, name, mimeType}] des visuels (bucket "kit-files").
-- Même forme de RLS que les autres kits_* : lecture par tout utilisateur
-- connecté, écriture réservée à is_csm() (admin inclus).

create table if not exists public.kits_fiches (
  id         text primary key,
  title      text not null,
  language   text not null check (language in ('FR', 'EN')),
  files      jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists kits_fiches_language_idx on public.kits_fiches (language);

alter table public.kits_fiches enable row level security;

drop policy if exists "kits_fiches_select" on public.kits_fiches;
create policy "kits_fiches_select" on public.kits_fiches
  for select using (auth.uid() is not null);

drop policy if exists "kits_fiches_write" on public.kits_fiches;
create policy "kits_fiches_write" on public.kits_fiches
  for all using (public.is_csm()) with check (public.is_csm());
