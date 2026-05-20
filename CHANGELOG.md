# Changelog

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
