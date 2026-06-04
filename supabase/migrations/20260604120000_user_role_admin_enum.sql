-- ─────────────────────────────────────────────────────────────────────────────
-- Auth — add the `admin` value to the user_role enum
-- ─────────────────────────────────────────────────────────────────────────────
-- MUST stay alone in its own migration: Postgres lets ALTER TYPE ... ADD VALUE
-- run inside a transaction (PG12+), but the new value can't be *used* until that
-- transaction commits. Everything that references 'admin' (constraint, helper
-- functions, policies) therefore lives in the next migration file.
alter type public.user_role add value if not exists 'admin';
