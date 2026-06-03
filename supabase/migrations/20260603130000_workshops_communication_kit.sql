-- ─────────────────────────────────────────────────────────────────────────────
-- Workshops — kit de communication par atelier
-- ─────────────────────────────────────────────────────────────────────────────
-- Chaque atelier peut désormais embarquer un kit de communication propre
-- (visuels, PDF, etc.) que le CSM gère depuis /csm/catalogue et que le
-- client télécharge depuis /catalogue-ateliers. Les fichiers vivent dans
-- le bucket "kit-files" existant (sous workshops/<id>/...), donc pas de
-- nouvelle policy de stockage à appliquer.

alter table public.workshops
  add column if not exists communication_kit jsonb not null default '[]';
