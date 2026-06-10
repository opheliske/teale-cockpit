-- ─────────────────────────────────────────────────────────────────────────────
-- kits_visuels : passage du mono-fichier au multi-fichiers.
--
-- Ajoute une colonne `files` (jsonb : [{id, path, name, mimeType}]), backfille
-- depuis l'ancien couple path/mime_type, puis rend path/mime_type optionnels
-- (conservés pour la rétro-compat : le store écrit toujours le 1er fichier).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.kits_visuels
  add column if not exists files jsonb not null default '[]'::jsonb;

-- Backfill : chaque visuel mono-fichier existant devient un tableau à 1 élément.
-- `name` = nom de fichier sans le préfixe <timestamp>-<rand>- (cf. kitFileLabel).
update public.kits_visuels
set files = jsonb_build_array(
  jsonb_build_object(
    'id', id || '-0',
    'path', path,
    'name', regexp_replace(regexp_replace(path, '^.*/', ''), '^[0-9]+-[a-z0-9]+-', ''),
    'mimeType', coalesce(mime_type, '')
  )
)
where (files is null or files = '[]'::jsonb)
  and path is not null
  and path <> '';

-- Les nouveaux visuels multi-fichiers n'ont plus besoin de ces colonnes.
alter table public.kits_visuels alter column path drop not null;
alter table public.kits_visuels alter column mime_type drop not null;
