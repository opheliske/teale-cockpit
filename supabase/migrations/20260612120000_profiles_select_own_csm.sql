-- ─────────────────────────────────────────────────────────────────────────────
-- Le client peut lire le profil de SON CSM propriétaire (nom affiché dans le
-- chat). Policy SELECT permissive supplémentaire : elle s'ajoute (OR) à
-- profiles_select sans élargir l'accès au-delà du CSM de sa propre société.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "profiles_select_own_csm" on public.profiles;
create policy "profiles_select_own_csm" on public.profiles
  for select using (
    id = (select owner_csm_id from public.clients where id = public.auth_client_id())
  );
