-- ============================================================================
-- CommonGround — revoke anon grants
-- Migration: 20260525140000_revoke_anon_grants.sql
-- ----------------------------------------------------------------------------
-- Supabase's default privileges automatically grant the `anon` role table
-- access on every new table in the `public` schema. The cooperative ledger
-- requires an authenticated session for every operation, so `anon` should hold
-- no grants at all. RLS already denies anon every row (no policy targets it);
-- this revoke makes the denial explicit at the privilege layer too.
-- ============================================================================

begin;

revoke all on public.cooperatives         from anon;
revoke all on public.coop_members         from anon;
revoke all on public.ledger_transactions  from anon;
revoke all on public.ledger_postings      from anon;
revoke all on public.sync_mutations       from anon;
revoke all on public.coop_member_balances from anon;

commit;

-- ============================================================================
-- END — 20260525140000_revoke_anon_grants.sql
-- ============================================================================
