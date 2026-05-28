-- ─── Kit "body" — CSM-authored text the client can copy ─────────────────────
-- A free-form text field on every communication kit (launch emails, monthly
-- animation items, topic emails). The CSM fills it in from the catalogue
-- admin; the client sees it on their kits page and can copy it to their
-- clipboard. When the field is blank the client falls back to the previously
-- auto-generated default template (preserves behaviour for legacy rows).

alter table kits_lancement add column if not exists body text;
alter table kits_animation add column if not exists body text;
alter table kits_email      add column if not exists body text;
