-- ─────────────────────────────────────────────────────────────────────────────
-- Kits — public ciblé (audiences) par carte
-- ─────────────────────────────────────────────────────────────────────────────
-- Chaque kit (lancement, animation, email, visuel, fiche, vidéo) porte une liste
-- de publics ciblés (multi-valué) saisie par le CSM, utilisée pour filtrer côté
-- « Kits de communication ». Stockée en jsonb (tableau d'ids), défaut [].

alter table public.kits_lancement add column if not exists audiences jsonb not null default '[]';
alter table public.kits_animation add column if not exists audiences jsonb not null default '[]';
alter table public.kits_email     add column if not exists audiences jsonb not null default '[]';
alter table public.kits_visuels   add column if not exists audiences jsonb not null default '[]';
alter table public.kits_fiches    add column if not exists audiences jsonb not null default '[]';
alter table public.kits_videos    add column if not exists audiences jsonb not null default '[]';
