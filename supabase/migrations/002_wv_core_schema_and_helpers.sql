-- Migration: 002_wv_core_schema_and_helpers.sql
-- Description: Creates wv_internal private schema, user_profiles, identities, and their base RLS policies

-- 1. Private internal schema for security functions (never exposed to PostgREST)
CREATE SCHEMA IF NOT EXISTS wv_internal;
REVOKE ALL ON SCHEMA wv_internal FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA wv_internal TO authenticated, service_role;

-- 2. User Profiles (extending auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Identities (Personal, Pseudonymous, Corporate/Entity)
CREATE TABLE IF NOT EXISTS public.identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  handle TEXT,
  type TEXT NOT NULL CHECK (type IN ('personal', 'pseudonymous', 'entity', 'brand')),
  bio TEXT,
  avatar_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_identities_user_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON public.identities(user_id);

-- 4. Row Level Security: user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "user_profiles_delete" ON public.user_profiles
  FOR DELETE TO authenticated
  USING (id = (SELECT auth.uid()));

-- 5. Row Level Security: identities
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "identities_select" ON public.identities
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "identities_insert" ON public.identities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "identities_update" ON public.identities
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "identities_delete" ON public.identities
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));