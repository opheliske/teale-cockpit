-- ─────────────────────────────────────────────────────────────────────────────
-- clients — drop the legacy free-text CSM columns
-- ─────────────────────────────────────────────────────────────────────────────
-- The CSM relation is now clients.owner_csm_id (FK profiles); the CSM name is
-- resolved from profiles. The old text columns csm / csm_label are no longer
-- read or written by the app.
--
-- ⚠️ Apply this together with the matching app release: the new code stops
-- writing these columns.

alter table public.clients
  drop column if exists csm,
  drop column if exists csm_label;
