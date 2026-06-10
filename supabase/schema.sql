-- Teale Cockpit — Supabase schema (baseline)
--
-- ⚠️  This file only creates the tables. It does NOT enable Row Level Security.
--     Running it ALONE leaves every table world-readable/writable.
--
-- Correct setup order (see README → "Authentication & roles"):
--   1. Run this schema.sql
--   2. Run every file in supabase/migrations/ in chronological (filename) order
--      → profiles, RLS policies, owner_csm_id, Realtime publication, urgencies…
-- Only after step 2 is the database complete and secured by RLS.

-- ─── Clients (company table) ─────────────────────────────────────────────────
-- Referenced by profiles.client_id and every per-client table. Must exist
-- before the migrations run (the auth_profiles migration FKs to it).
create table if not exists public.clients (
  id             text primary key,
  name           text not null,
  initials       text not null,
  color          text not null,
  collab         integer not null default 0,
  owner_csm_id   uuid,  -- FK to profiles(id) added by the clients_owner_csm migration
  statut         text not null default 'green' check (statut in ('green', 'amber', 'danger')),
  formule        text not null,
  atelier_total  integer not null default 0,
  rdv_par_collab numeric not null default 0,
  contract_start text not null default '',
  contract_end   text not null default '',
  churn_notice   text not null default '',
  produits       jsonb not null default '[]',
  arr            integer not null default 0,
  listing_url    text not null default '',
  listing_enabled boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ─── Workshops ──────────────────────────────────────────────────────────────
-- Full Workshop objects stored as JSON (objectives, programme, targetAudience arrays).
create table if not exists workshops (
  id           text primary key,
  title        text not null,
  subtitle     text,
  theme_id     text not null,
  objectives   jsonb not null default '[]',
  programme    jsonb not null default '[]',
  target_audience jsonb not null default '[]',
  already_animated boolean not null default false,
  communication_kit jsonb not null default '[]',
  created_at   timestamptz not null default now()
);

-- ─── Kits ────────────────────────────────────────────────────────────────────
create table if not exists kits_lancement (
  id       text primary key,
  title    text not null,
  step     text not null check (step in ('before', 'dday', 'after')),
  language text not null check (language in ('FR', 'EN')),
  body     text
);

create table if not exists kits_animation (
  id        text primary key,
  title     text not null,
  month     text not null,
  type      text not null,
  status    text not null,
  landing   text,
  languages jsonb not null default '[]',
  images_fr jsonb not null default '[]',
  images_en jsonb not null default '[]',
  pdf_fr    jsonb not null default '[]',
  pdf_en    jsonb not null default '[]',
  body      text
);

create table if not exists kits_email (
  id       text primary key,
  title    text not null,
  topic    text not null,
  language text not null check (language in ('FR', 'EN')),
  body     text
);

create table if not exists kits_visuels (
  id          text primary key,
  title       text not null,
  category    text not null check (category in ('logo', 'icone', 'picto', 'banniere')),
  files       jsonb not null default '[]',  -- [{id, path, name, mimeType}] dans le bucket "kit-files"
  path        text,                         -- legacy mono-fichier (rétro-compat)
  mime_type   text,                         -- legacy mono-fichier (rétro-compat)
  created_at  timestamptz not null default now()
);
create index if not exists kits_visuels_category_idx on kits_visuels (category);

-- ─── Client actions (CSM home to-do list, per-CSM ownership) ────────────────
create table if not exists client_actions (
  id            bigint primary key generated always as identity,
  text          text not null,
  clients       jsonb not null default '[]',  -- [{ name, color }]
  echeance      text not null,
  overdue       boolean not null default false,
  done          boolean not null default false,
  owner_csm_id  uuid references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists client_actions_owner_csm_id_idx
  on client_actions (owner_csm_id);

-- ─── CSM events (agenda) ─────────────────────────────────────────────────────
create table if not exists csm_events (
  id               bigint primary key generated always as identity,
  client_id        text not null,
  client_name      text not null,
  client_initials  text not null,
  client_color     text not null,
  title            text not null,
  date             text not null,   -- French-formatted, e.g. "15 juin 2026"
  weekday          text not null,   -- e.g. "Lun."
  time             text not null,   -- e.g. "14:00"
  responsable      text not null,
  created_at       timestamptz not null default now()
);

-- ─── Health entries (per client) ─────────────────────────────────────────────
create table if not exists health_entries (
  id         bigint primary key generated always as identity,
  client_id  text not null,
  date       text not null,       -- French label, e.g. "25 mars 2026"
  iso_date   date not null,
  statut     text not null check (statut in ('SAIN', 'VIGILANCE', 'À RISQUE')),
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists health_entries_client_id_idx on health_entries (client_id);

-- ─── Target labels (per client) ──────────────────────────────────────────────
create table if not exists target_labels (
  id        text primary key,
  client_id text not null,
  name      text not null,
  color     text not null
);

create index if not exists target_labels_client_id_idx on target_labels (client_id);

-- ─── Target → plan item assignments ──────────────────────────────────────────
create table if not exists target_item_assignments (
  client_id  text not null,
  item_id    bigint not null,
  label_id   text not null references target_labels (id) on delete cascade,
  primary key (client_id, item_id, label_id)
);

-- ─── Plan state (one row per client) ─────────────────────────────────────────
create table if not exists plan_state (
  client_id   text primary key,
  themes      jsonb not null default '{"Q1":"","Q2":"","Q3":"","Q4":""}',
  next_themes jsonb,
  items       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

-- ─── Documents (per client) ──────────────────────────────────────────────────
create table if not exists documents (
  id         text not null,
  client_id  text not null,
  title      text not null,
  type       text not null,
  size       text not null,
  date       text not null,
  author     text not null,
  files      jsonb not null default '[]',
  primary key (id, client_id)
);

create index if not exists documents_client_id_idx on documents (client_id);

-- ─── Plan comments (messaging between client and CSM) ────────────────────────
-- client_id is added by the plan_comments_client_id migration.
create table if not exists plan_comments (
  id         bigint primary key generated always as identity,
  thread_id  text not null,   -- String(planItemId) or "type:title" for static events
  author     text not null check (author in ('client', 'csm')),
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists plan_comments_thread_id_idx on plan_comments (thread_id);

-- ─── Client notes (CSM-internal per-client notes) ────────────────────────────
create table if not exists public.client_notes (
  id          bigint primary key generated always as identity,
  client_id   text not null references public.clients (id) on delete cascade,
  type        text not null,
  date        text not null,
  text        text not null,
  cta_label   text not null default '',
  cta_variant text not null default 'default',
  alert       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists client_notes_client_id_idx on public.client_notes (client_id);

-- ─── Urgencies (emergency intervention declarations) ─────────────────────────
create table if not exists public.urgencies (
  id                 text primary key,
  client_id          text not null references public.clients (id) on delete cascade,
  created_at         timestamptz not null default now(),
  event_date         text not null,
  type               text not null,
  description        text,
  modalities         jsonb not null default '{}',
  affected_headcount text,
  mode               text not null,
  location           text,
  rh_contact         text
);

create index if not exists urgencies_client_id_idx on public.urgencies (client_id);
