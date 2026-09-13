-- Test Suite: rls_isolation.test.sql
-- Description: Complete pgTAP-compatible RLS security and cross-owner isolation test matrix for Waynex Vault.
-- Run with: supabase test db

BEGIN;

-- 1. Declare Test Plan (21 rigorous security assertions)
SELECT plan(21);

-- 2. Setup Test Fixture Data (inside transaction)
CREATE OR REPLACE FUNCTION tests.authenticate_as(user_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object(
    'sub', user_id::text,
    'role', 'authenticated',
    'aud', 'authenticated',
    'email', user_id::text || '@test.local'
  )::text, true);
  SET LOCAL ROLE authenticated;
END;
$$;

-- Create 5 test users in auth.users
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'owner_a@test.local', '{"provider":"email"}', '{}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'owner_b@test.local', '{"provider":"email"}', '{}', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'member_a@test.local', '{"provider":"email"}', '{}', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'viewer_a@test.local', '{"provider":"email"}', '{}', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'admin_a@test.local', '{"provider":"email"}', '{}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- MATRIX TEST 1: Anonymous Access Denial
-- =========================================================================
SET LOCAL ROLE anon;

-- Anonymous cannot select private workspaces
SELECT is_empty(
  'SELECT * FROM public.workspaces',
  'T1: Anonymous role cannot read private workspaces'
);

-- Anonymous cannot insert into global contacts
SELECT throws_ok(
  'INSERT INTO public.contacts (id, owner_id, full_name) VALUES (gen_random_uuid(), ''11111111-1111-1111-1111-111111111111'', ''Anon Intrusion'')',
  'new row violates row-level security policy for table "contacts"',
  'T2: Anonymous role cannot insert contacts'
);

-- =========================================================================
-- MATRIX TEST 2: Owner Capabilities & Auto-Membership Bootstrap
-- =========================================================================
SELECT tests.authenticate_as('11111111-1111-1111-1111-111111111111');

-- Owner creates an identity
INSERT INTO public.identities (id, user_id, name, type, is_default)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'DeFiwayneX', 'pseudonymous', true);

-- Owner creates workspace
INSERT INTO public.workspaces (id, owner_id, primary_identity_id, name, slug, workspace_type)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PEVRA', 'pevra-ws', 'venture');

-- Verify trigger automatically established owner membership
SELECT results_eq(
  'SELECT role FROM public.workspace_members WHERE workspace_id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'' AND user_id = ''11111111-1111-1111-1111-111111111111''',
  ARRAY['owner']::text[],
  'T3: Workspace creation triggers automatic owner membership in workspace_members'
);

-- Owner adds global contact & links to workspace
INSERT INTO public.contacts (id, owner_id, full_name, email)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Vitalik Buterin', 'vitalik@test.local');

INSERT INTO public.workspace_contacts (workspace_id, contact_id, relationship_stage, relationship_score)
VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'connected', 9);

SELECT results_eq(
  'SELECT relationship_score FROM public.workspace_contacts WHERE workspace_id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  ARRAY[9],
  'T4: Owner can link contacts to workspace with 1-10 relationship score'
);

-- Owner invites User 3 as regular member, User 4 as viewer, and User 5 as admin
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES 
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'member'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'viewer'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'admin');

-- =========================================================================
-- MATRIX TEST 3: Regular Member Permissions & Admin Boundaries
-- =========================================================================
SELECT tests.authenticate_as('33333333-3333-3333-3333-333333333333');

-- Member can read workspace contacts
SELECT results_eq(
  'SELECT contact_id FROM public.workspace_contacts WHERE workspace_id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  ARRAY['cccccccc-cccc-cccc-cccc-cccccccccccc']::uuid[],
  'T5: Member can read workspace contacts'
);

-- Member can log an interaction
INSERT INTO public.interactions (id, workspace_id, contact_id, channel, direction, content)
VALUES ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'x', 'outbound', 'Discussed soulbound telecom standards.');

SELECT is(
  (SELECT COUNT(*)::int FROM public.interactions WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  1,
  'T6: Member can log interactions for workspace contact'
);

-- Member cannot delete workspace contacts (admin or owner only)
DELETE FROM public.workspace_contacts WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SELECT is(
  (SELECT COUNT(*)::int FROM public.workspace_contacts WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'T7: Regular member cannot delete workspace contacts (RLS blocks delete)'
);

-- Member cannot change workspace ownership
SELECT throws_ok(
  'UPDATE public.workspaces SET owner_id = ''33333333-3333-3333-3333-333333333333'' WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'new row violates row-level security policy for table "workspaces"',
  'T8: Regular member cannot alter workspace ownership'
);

-- =========================================================================
-- MATRIX TEST 3B: Workspace Admin Permissions & Immutability Protections
-- =========================================================================
SELECT tests.authenticate_as('55555555-5555-5555-5555-555555555555');

-- Admin can update permitted workspace metadata (name/description)
UPDATE public.workspaces SET description = 'Admin updated description' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SELECT results_eq(
  'SELECT description FROM public.workspaces WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  ARRAY['Admin updated description']::text[],
  'T9: Workspace admin can legitimately update workspace metadata'
);

-- Admin cannot transfer/take over workspace ownership (blocked by immutability trigger)
SELECT throws_ok(
  'UPDATE public.workspaces SET owner_id = ''55555555-5555-5555-5555-555555555555'' WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'Transfer of workspace owner_id via UPDATE is not permitted',
  'T10: Workspace admin cannot hijack workspace by altering owner_id'
);

-- Owner cannot change workspace owner_id via UPDATE either
SELECT tests.authenticate_as('11111111-1111-1111-1111-111111111111');
SELECT throws_ok(
  'UPDATE public.workspaces SET owner_id = ''55555555-5555-5555-5555-555555555555'' WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'Transfer of workspace owner_id via UPDATE is not permitted',
  'T11: Workspace owner cannot transfer owner_id via standard UPDATE'
);

-- =========================================================================
-- MATRIX TEST 4: Viewer Read-Only Permissions
-- =========================================================================
SELECT tests.authenticate_as('44444444-4444-4444-4444-444444444444');

-- Viewer can read workspace records
SELECT is(
  (SELECT COUNT(*)::int FROM public.interactions WHERE workspace_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'T12: Viewer can read interactions in workspace'
);

-- =========================================================================
-- MATRIX TEST 5: Non-Member Complete Isolation
-- =========================================================================
SELECT tests.authenticate_as('22222222-2222-2222-2222-222222222222');

-- User B cannot select User A workspaces
SELECT is_empty(
  'SELECT * FROM public.workspaces WHERE id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'T13: Non-member cannot read User A workspace'
);

-- User B cannot read User A workspace contacts
SELECT is_empty(
  'SELECT * FROM public.workspace_contacts WHERE workspace_id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'T14: Non-member cannot read User A workspace contacts'
);

-- User B cannot read User A interactions
SELECT is_empty(
  'SELECT * FROM public.interactions WHERE workspace_id = ''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb''',
  'T15: Non-member cannot read User A interactions'
);

-- User B cannot read User A global contacts
SELECT is_empty(
  'SELECT * FROM public.contacts WHERE id = ''cccccccc-cccc-cccc-cccc-cccccccccccc''',
  'T16: Non-member cannot read User A global contacts'
);

-- User B cannot insert records into User A workspace
SELECT throws_ok(
  'INSERT INTO public.interactions (workspace_id, contact_id, channel, content) VALUES (''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'', ''cccccccc-cccc-cccc-cccc-cccccccccccc'', ''email'', ''Malicious injection'')',
  'new row violates row-level security policy for table "interactions"',
  'T17: Non-member cannot insert interactions into foreign workspace'
);

-- =========================================================================
-- MATRIX TEST 6: Cross-Owner Entity Reference Protections
-- =========================================================================
-- User B creates their own workspace
INSERT INTO public.workspaces (id, owner_id, name, slug, workspace_type)
VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', 'User B Workspace', 'ws-b', 'personal');

-- User B attempts to attach User A Contact into Workspace B (Must Fail Trigger/RLS)
SELECT throws_ok(
  'INSERT INTO public.workspace_contacts (workspace_id, contact_id, relationship_stage) VALUES (''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'', ''cccccccc-cccc-cccc-cccc-cccccccccccc'', ''lead'')',
  'Cross-owner violation: Contact cccccccc-cccc-cccc-cccc-cccccccccccc does not belong to owner of workspace eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'T18: Cross-owner violation prevented when attaching foreign contact to workspace'
);

-- User B attempts to use User A Identity as primary identity (Must Fail Trigger)
SELECT throws_ok(
  'INSERT INTO public.workspaces (owner_id, primary_identity_id, name, slug) VALUES (''22222222-2222-2222-2222-222222222222'', ''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'', ''Spoofed WS'', ''spoofed-ws'')',
  'Cross-owner violation: Primary identity aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa does not belong to workspace owner 22222222-2222-2222-2222-222222222222',
  'T19: Cross-owner violation prevented when using foreign identity as workspace primary identity'
);

-- =========================================================================
-- MATRIX TEST 7: Historical Deletion Resistance (Archive-First)
-- =========================================================================
SELECT tests.authenticate_as('11111111-1111-1111-1111-111111111111');

-- Attempting hard delete on Contact that has interactions must fail via RESTRICT constraint
SELECT throws_ok(
  'DELETE FROM public.contacts WHERE id = ''cccccccc-cccc-cccc-cccc-cccccccccccc''',
  'update or delete on table "contacts" violates foreign key constraint',
  'T20: Hard deletion of contact with interaction history is blocked by ON DELETE RESTRICT'
);

-- Archiving contact succeeds without data destruction
UPDATE public.contacts SET archived_at = NOW() WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
SELECT is(
  (SELECT (archived_at IS NOT NULL)::boolean FROM public.contacts WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  true,
  'T21: Contact archiving succeeds while preserving complete interaction history'
);

-- 3. Conclude pgTAP Test Execution
SELECT * FROM finish();

ROLLBACK;