-- ─────────────────────────────────────────────────────────────────────────────
-- plan_comments — add client_id so the client↔CSM messaging can be RLS-isolated
-- ─────────────────────────────────────────────────────────────────────────────
-- plan_comments only had thread_id, which cannot be mapped to a company at the
-- database level. Adding client_id lets a client read/write ONLY their own
-- thread comments. Pre-existing rows keep client_id = NULL: they stay visible
-- to CSM users and invisible to clients (safe default). The app
-- (comments-store.ts) sets client_id on every new comment.

alter table public.plan_comments
  add column if not exists client_id text references public.clients (id) on delete cascade;

create index if not exists plan_comments_client_id_idx on public.plan_comments (client_id);
