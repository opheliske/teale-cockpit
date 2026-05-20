-- ═════════════════════════════════════════════════════════════════════════════
-- RLS access test — verifies that the policies block cross-client access.
-- ═════════════════════════════════════════════════════════════════════════════
-- HOW TO RUN
--   Run this in the Supabase SQL editor AFTER applying the three migrations
--   and creating at least: 1 CSM user + 2 client users tied to 2 different
--   companies, each company having some health_entries / documents rows.
--
--   Fill in the four placeholders below with real ids (from auth.users.id and
--   public.clients.id), then run each block. The expected result is noted in
--   comments. Each block runs inside its own transaction and rolls back, so it
--   never modifies data.
--
-- The trick: we impersonate a user by setting `role` + the JWT `sub` claim,
-- exactly like Supabase does for a real request. auth.uid() then resolves to
-- that user and the policies kick in.
-- ─────────────────────────────────────────────────────────────────────────────

-- ╔═══ PLACEHOLDERS — replace these four values ═══════════════════════════════╗
--   :csm_user_id        a uuid from auth.users for a role='csm' account
--   :client_a_user_id   a uuid from auth.users for a role='client' account (company A)
--   :client_b_user_id   a uuid from auth.users for a role='client' account (company B)
--   :client_a_company   the clients.id of company A
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ─── TEST 1 — CSM sees ALL companies ────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<csm_user_id>","role":"authenticated"}';

  -- EXPECTED: equals the total number of rows in public.clients.
  select 'TEST 1 — csm clients visible' as test, count(*) from public.clients;
rollback;

-- ─── TEST 2 — Client A sees ONLY its own company ────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<client_a_user_id>","role":"authenticated"}';

  -- EXPECTED: exactly 1 (company A only).
  select 'TEST 2 — client A clients visible' as test, count(*) from public.clients;

  -- EXPECTED: the only id returned is company A's id.
  select 'TEST 2 — client A company id' as test, id from public.clients;
rollback;

-- ─── TEST 3 — Client A sees ONLY its own client data ────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<client_a_user_id>","role":"authenticated"}';

  -- EXPECTED: every row has client_id = company A. No company B rows.
  select 'TEST 3 — health_entries visible' as test,
         client_id, count(*)
  from public.health_entries
  group by client_id;

  -- EXPECTED: 0 — company B's data is invisible to client A.
  select 'TEST 3 — leak check (must be 0)' as test, count(*)
  from public.health_entries
  where client_id <> '<client_a_company>';
rollback;

-- ─── TEST 4 — Client A CANNOT write ─────────────────────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<client_a_user_id>","role":"authenticated"}';

  -- EXPECTED: raises "new row violates row-level security policy". If you see
  -- the NOTICE below instead, RLS is NOT protecting writes — that is a failure.
  do $$
  begin
    insert into public.health_entries (client_id, date, iso_date, statut)
    values ('<client_a_company>', 'test', current_date, 'SAIN');
    raise notice 'FAIL — client A was able to INSERT into health_entries';
  exception when insufficient_privilege or others then
    raise notice 'OK — client A write was blocked by RLS (%).', sqlerrm;
  end $$;
rollback;

-- ─── TEST 5 — Client B cannot reach Client A's data ─────────────────────────
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"<client_b_user_id>","role":"authenticated"}';

  -- EXPECTED: 0 — company A's documents are invisible to client B.
  select 'TEST 5 — cross-client leak (must be 0)' as test, count(*)
  from public.documents
  where client_id = '<client_a_company>';
rollback;

-- ─── TEST 6 — anonymous (not logged in) sees nothing ────────────────────────
begin;
  set local role anon;

  -- EXPECTED: 0 for both — no session, no access.
  select 'TEST 6 — anon clients (must be 0)' as test, count(*) from public.clients;
  select 'TEST 6 — anon health (must be 0)' as test, count(*) from public.health_entries;
rollback;
