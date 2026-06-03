-- ─────────────────────────────────────────────────────────────────────────────
-- Clients — bouton "Mettre à jour mon listing" pilotable par le CSM
-- ─────────────────────────────────────────────────────────────────────────────
-- Le CSM peut maintenant :
--   - choisir l'URL du bouton listing affiché sur le suivi projet client
--   - activer / désactiver l'affichage du bouton par client
-- La synchro côté client passe par la table clients (déjà watchée par
-- csmClientsStore via Supabase realtime), aucune nouvelle policy nécessaire.

alter table public.clients
  add column if not exists listing_url     text    not null default '',
  add column if not exists listing_enabled boolean not null default false;
