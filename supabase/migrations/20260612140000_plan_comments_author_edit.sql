-- ─────────────────────────────────────────────────────────────────────────────
-- Chacun peut éditer / supprimer SES propres messages.
-- CSM/admin : accès complet (inchangé). Client : ses messages (author='client')
-- de sa propre société. (Avant : update/delete réservés au CSM.)
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "plan_comments_update" on public.plan_comments;
create policy "plan_comments_update" on public.plan_comments
  for update
  using (public.is_csm() or (client_id = public.auth_client_id() and author = 'client'))
  with check (public.is_csm() or (client_id = public.auth_client_id() and author = 'client'));

drop policy if exists "plan_comments_delete" on public.plan_comments;
create policy "plan_comments_delete" on public.plan_comments
  for delete
  using (public.is_csm() or (client_id = public.auth_client_id() and author = 'client'));
