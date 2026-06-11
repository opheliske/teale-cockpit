-- ─────────────────────────────────────────────────────────────────────────────
-- État « lu » des fils de discussion, côté serveur (par utilisateur, par fil).
-- Remplace le suivi localStorage : les compteurs de non-lus sont désormais
-- cohérents entre les appareils d'un même utilisateur.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.comment_reads (
  user_id      uuid not null references auth.users (id) on delete cascade,
  thread_id    text not null,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

alter table public.comment_reads enable row level security;

-- Chacun ne lit/écrit que ses propres marqueurs.
drop policy if exists "comment_reads_rw" on public.comment_reads;
create policy "comment_reads_rw" on public.comment_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime : synchronise l'état « lu » entre les appareils du même utilisateur.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comment_reads'
  ) then
    alter publication supabase_realtime add table public.comment_reads;
  end if;
end $$;
