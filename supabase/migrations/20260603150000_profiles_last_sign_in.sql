-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles — dernière connexion par compte
-- ─────────────────────────────────────────────────────────────────────────────
-- Le CSM doit voir, sur la fiche détail d'un client, les comptes qui ont accès
-- à l'espace client (nom, email, date de dernière connexion). RLS sur
-- auth.users empêche un select direct côté client : on mirroir
-- auth.users.last_sign_in_at sur public.profiles via un trigger SECURITY
-- DEFINER, puis on lit depuis profiles (déjà readable par le CSM).

alter table public.profiles
  add column if not exists last_sign_in_at timestamptz;

create or replace function public.sync_last_sign_in_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ne tape la table profiles que sur un vrai changement (login). Les autres
  -- mises à jour d'auth.users (changement d'email, métadonnées…) restent
  -- silencieuses ici.
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.profiles
       set last_sign_in_at = new.last_sign_in_at
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_signed_in on auth.users;
create trigger on_auth_user_signed_in
  after update of last_sign_in_at on auth.users
  for each row execute function public.sync_last_sign_in_at();

-- Backfill : copie les last_sign_in_at déjà connus dans auth.users.
update public.profiles p
   set last_sign_in_at = u.last_sign_in_at
  from auth.users u
 where p.id = u.id
   and u.last_sign_in_at is not null
   and p.last_sign_in_at is distinct from u.last_sign_in_at;
