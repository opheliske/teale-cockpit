-- ─────────────────────────────────────────────────────────────────────────────
-- Referential integrity — client_id foreign keys
-- ─────────────────────────────────────────────────────────────────────────────
-- The per-client tables stored client_id as a plain text column with no
-- foreign key. This migration adds the missing FK to public.clients with
-- ON DELETE CASCADE, so deleting a client cleans up its data atomically.
--
-- Any orphan rows (non-null client_id pointing to a client that no longer
-- exists) are removed first — they are unreachable garbage and would block
-- the constraint. NULL client_id rows are left untouched (a FK permits NULL).

do $$
declare
  t text;
begin
  foreach t in array array[
    'csm_events', 'health_entries', 'documents', 'plan_state',
    'target_labels', 'target_item_assignments', 'plan_comments'
  ]
  loop
    execute format(
      'delete from public.%I where client_id is not null '
      || 'and client_id not in (select id from public.clients)',
      t
    );

    if not exists (
      select 1 from pg_constraint
      where conname = t || '_client_id_fkey'
        and conrelid = ('public.' || t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I '
        || 'foreign key (client_id) references public.clients (id) on delete cascade',
        t, t || '_client_id_fkey'
      );
    end if;
  end loop;
end $$;
