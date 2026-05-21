-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Supabase Realtime on the tables the app keeps in live sync
-- ─────────────────────────────────────────────────────────────────────────────
-- Adds the data tables to the `supabase_realtime` publication so postgres
-- changes are streamed to subscribed clients (CSM ↔ client portal live sync).
-- RLS still applies: a client only receives changes on rows it can read.
-- Idempotent — a table already in the publication is skipped.

do $$
declare
  t text;
begin
  foreach t in array array[
    'clients', 'plan_state', 'csm_events', 'documents', 'plan_comments',
    'client_actions', 'health_entries', 'target_labels', 'target_item_assignments'
  ]
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
