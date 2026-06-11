-- ─────────────────────────────────────────────────────────────────────────────
-- Accusé de lecture : un participant à un fil peut lire les marqueurs « lu »
-- des AUTRES participants de ce fil (pour afficher « Lu » sous son message).
-- Policy SELECT permissive supplémentaire (s'ajoute en OR à comment_reads_rw,
-- qui reste limité à ses propres lignes en écriture).
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "comment_reads_select_thread" on public.comment_reads;
create policy "comment_reads_select_thread" on public.comment_reads
  for select using (
    exists (
      select 1 from public.plan_comments pc
      where pc.thread_id = comment_reads.thread_id
        and (public.is_csm() or pc.client_id = public.auth_client_id())
    )
  );
