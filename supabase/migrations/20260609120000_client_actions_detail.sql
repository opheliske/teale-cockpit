-- ─────────────────────────────────────────────────────────────────────────────
-- client_actions.detail — note libre attachée à une action prioritaire.
-- ─────────────────────────────────────────────────────────────────────────────
-- Permet au CSM de saisir plus de contexte à la création d'une action
-- prioritaire, puis de le relire / le modifier en rouvrant l'action.
-- Colonne nullable-safe (default '') : les actions existantes restent valides.

alter table public.client_actions
  add column if not exists detail text not null default '';
