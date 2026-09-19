import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface VaultWorkspace {
  id: string
  owner_id: string
  name: string
  slug: string
  workspace_type: string
  description?: string | null
  icon?: string | null
  is_default: boolean
  archived_at?: string | null
  created_at: string
  updated_at: string
  primary_identity?: VaultIdentity | null
}

export interface VaultIdentity {
  id: string
  user_id: string
  name: string
  handle?: string | null
  type: string
  bio?: string | null
  avatar_url?: string | null
  is_default: boolean
}

export interface VaultContextResult {
  user: any
  profile: any
  workspaces: VaultWorkspace[]
  identities: VaultIdentity[]
  activeWorkspace: VaultWorkspace | null
  activeIdentity: VaultIdentity | null
}

/**
 * Request-level cached Vault Context loader.
 * Deduplicates repeated calls across layout.tsx and page components within a single server request.
 * Parallelizes independent workspace, identity, and profile database queries.
 */
export const getVaultContextCached = cache(async (): Promise<VaultContextResult | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Parallelize independent queries
  const [workspacesRes, identitiesRes, profileRes, cookieStore] = await Promise.all([
    (supabase as any)
      .from('workspaces')
      .select('*, primary_identity:identities(*)')
      .order('is_default', { ascending: false }),
    (supabase as any)
      .from('identities')
      .select('*')
      .order('is_default', { ascending: false }),
    (supabase as any)
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(),
    cookies(),
  ])

  const wsList: VaultWorkspace[] = workspacesRes.data || []
  const idList: VaultIdentity[] = identitiesRes.data || []
  const profile = profileRes.data || null

  const activeWorkspaceId = cookieStore.get('wv_active_workspace_id')?.value

  let activeWs = wsList.find((w) => w.id === activeWorkspaceId)
  if (!activeWs) {
    activeWs = wsList.find((w) => w.is_default) || wsList[0] || null
  }

  const activeId =
    activeWs?.primary_identity ||
    idList.find((i) => i.is_default) ||
    idList[0] ||
    null

  return {
    user,
    profile,
    workspaces: wsList,
    identities: idList,
    activeWorkspace: activeWs,
    activeIdentity: activeId,
  }
})
