-- ─────────────────────────────────────────────────────────────────────────────
-- plan_state — next-year quarter themes
-- ─────────────────────────────────────────────────────────────────────────────
-- The one-year plan editor also lets a CSM set themes for the following year.
-- They were never persisted; this column stores them alongside the current
-- year's `themes`. Plan items already carry a `year` field inside the `items`
-- jsonb, so no change is needed there.

alter table public.plan_state
  add column if not exists next_themes jsonb;
