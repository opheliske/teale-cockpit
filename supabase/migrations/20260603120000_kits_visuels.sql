-- ─────────────────────────────────────────────────────────────────────────────
-- Kits — visuels & icônes teale (logos, icônes, pictos, bannières)
-- ─────────────────────────────────────────────────────────────────────────────
-- Standalone visual catalogue shown on both sides of the app: the CSM
-- uploads/edits/deletes from /csm/kits, every client sees them under
-- /kits-communication and can download via signed URLs.
-- One row = one visual asset (single file, one category).

create table if not exists public.kits_visuels (
  id          text primary key,
  title       text not null,
  category    text not null check (category in ('logo', 'icone', 'picto', 'banniere')),
  path        text not null,         -- storage path inside the "kit-files" bucket
  mime_type   text not null,
  created_at  timestamptz not null default now()
);

create index if not exists kits_visuels_category_idx on public.kits_visuels (category);

-- RLS: catalogue table — every authenticated user reads, only is_csm() writes.
-- Same shape as the other kits_* tables in 20260520140200_rls_policies.sql.
alter table public.kits_visuels enable row level security;

drop policy if exists "kits_visuels_select" on public.kits_visuels;
create policy "kits_visuels_select" on public.kits_visuels
  for select using (auth.uid() is not null);

drop policy if exists "kits_visuels_write" on public.kits_visuels;
create policy "kits_visuels_write" on public.kits_visuels
  for all using (public.is_csm()) with check (public.is_csm());
