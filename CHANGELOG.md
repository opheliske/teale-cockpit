# Changelog

## 2026-05 — Temps réel, stockage & robustesse

### Synchronisation temps réel
- Synchro CSM ↔ portail client en direct : un changement (fiche client, plan
  annuel, événement, document, message, déclaration d'urgence…) est propagé
  sans rechargement — entre onglets d'un même navigateur (`BroadcastChannel`)
  et entre utilisateurs/appareils (Supabase Realtime). La RLS s'applique au
  Realtime : un client ne reçoit que les changements de ses propres lignes.
- ⚠️ **Migration à appliquer** : `supabase/migrations/20260521120000_enable_realtime.sql`
  ajoute les tables de données à la publication `supabase_realtime`. Sans elle,
  la synchro inter-onglets fonctionne, mais pas le temps réel inter-utilisateurs.
- Les canaux Realtime et le `BroadcastChannel` sont fermés à la déconnexion.

### Stockage de fichiers
- Documents et pièces jointes uploadés vers un bucket privé Supabase Storage
  (`client-files`) au lieu de blob URLs éphémères ; téléchargement par URL
  signée. Migration `20260522130000_storage_client_files.sql`.

### Données & intégrité
- Catalogue d'ateliers : 22 ateliers / 5 thèmes (table `workshops`), alimenté
  via `npm run seed-catalog` — plus d'auto-seed concurrent depuis le front.
- Déclarations d'urgence persistées en base (table `urgencies`, RLS + Realtime)
  au lieu de `localStorage`.
- Clés étrangères `client_id → clients(id) ON DELETE CASCADE` sur les tables
  par-client : la suppression d'un client nettoie ses données atomiquement.

### Qualité & sécurité
- Hooks React conditionnels corrigés (crash de la fiche client).
- Rôle utilisateur lu uniquement depuis `app_metadata` (non modifiable côté client).
- En-têtes de sécurité HTTP (`X-Frame-Options`, CSP `frame-ancestors`,
  `X-Content-Type-Options`, `Referrer-Policy`, HSTS).
- Client actif résolu via un contexte React (plus de rechargement de page).
- ESLint : 0 erreur / 0 warning. Tests unitaires + intégration continue.

## 2026-05 — Authentification, RLS & fiabilisation

### Authentification & sécurité
- Authentification Supabase email + mot de passe, deux rôles : `csm` et `client`.
- Table `profiles` liée à `auth.users` (rôle, `client_id`) + trigger d'auto-création.
- Row Level Security activée sur toutes les tables : un CSM lit/écrit tout, un
  client lit uniquement les données de sa société.
- Page `/login`, protection des routes via `src/proxy.ts` (Next.js 16), guard
  client, affichage du nom de l'utilisateur connecté + déconnexion.
- Script admin `npm run create-user` pour créer les comptes (pas de signup public).

### Corrections
- Fin du « Chargement… » infini sur `/csm/clients/[id]` : page 404 propre,
  écran d'erreur avec « Réessayer », skeleton de chargement.
- Création de client fiabilisée de bout en bout (erreurs remontées à l'UI,
  redirection conditionnée au succès).
- CTA « + Ajouter une action » : persiste désormais réellement en base.

### Données réelles (fin du mock)
- KPI et filtres CSM de `/csm/suivi-clients` calculés depuis la base.
- Relation `clients.owner_csm_id → profiles` ; filtres par CSM réels.
- Renouvellements, ARR et churn notices de `/csm` branchés sur les vraies données.
- Tableau de bord client (`/`) câblé aux données du client connecté.

### Divers
- Page `/csm/urgence` retirée du menu CSM.
- Script `npm run seed-demo` pour reconstruire un jeu de démo en une commande.
