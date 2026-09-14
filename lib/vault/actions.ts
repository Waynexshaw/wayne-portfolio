'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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

// ---------------------------------------------------------------------------
// Workspaces & Identities
// ---------------------------------------------------------------------------

export async function getVaultContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch workspaces where user is member or owner
  const { data: workspaces } = await (supabase as any)
    .from('workspaces')
    .select('*, primary_identity:identities(*)')
    .order('is_default', { ascending: false })

  // Fetch identities owned by user
  const { data: identities } = await (supabase as any)
    .from('identities')
    .select('*')
    .order('is_default', { ascending: false })

  // Fetch user profile
  const { data: profile } = await (supabase as any)
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const wsList: VaultWorkspace[] = workspaces || []
  const idList: VaultIdentity[] = identities || []

  // Read preferred active workspace from cookie
  const cookieStore = await cookies()
  const activeWorkspaceId = cookieStore.get('wv_active_workspace_id')?.value

  // Verify that the requested workspace is in the user's authorized workspaces (Requirement 7)
  let activeWs = wsList.find(w => w.id === activeWorkspaceId)

  // If not found or not a member, fall back to default workspace (PEVRA) (Requirement 8)
  if (!activeWs) {
    activeWs = wsList.find(w => w.is_default) || wsList[0] || null
  }

  // Determine active operating identity:
  // Use the workspace's primary identity if linked and belonging to user,
  // otherwise default to user's default identity (Requirement 9)
  const activeId = activeWs?.primary_identity 
    || idList.find(i => i.is_default) 
    || idList[0] 
    || null

  return {
    user,
    profile,
    workspaces: wsList,
    identities: idList,
    activeWorkspace: activeWs,
    activeIdentity: activeId,
  }
}

export async function setActiveWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Requirement 7: A user must never be able to select a workspace they are not a member of
  // Through RLS, this query will only succeed if the user is owner or member
  const { data: ws, error } = await (supabase as any)
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .maybeSingle()

  if (error || !ws) {
    throw new Error('Workspace not found or access denied')
  }

  const cookieStore = await cookies()
  cookieStore.set('wv_active_workspace_id', workspaceId, {
    path: '/',
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  revalidatePath('/vault')
  revalidatePath('/vault/contacts')
  revalidatePath('/vault/companies')
  revalidatePath('/vault/interactions')
  revalidatePath('/vault/follow-ups')
  revalidatePath('/vault/opportunities')
  revalidatePath('/vault/projects')

  return ws
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function getContacts(
  workspaceId?: string,
  options?: {
    q?: string
    stage?: string
    priority?: string
  }
) {
  const supabase = await createClient()
  const q = options?.q?.trim()
  const stage = options?.stage && options.stage !== 'all' ? options.stage : undefined
  const priority = options?.priority && options.priority !== 'all' ? options.priority : undefined

  // If search query is provided, find matching company IDs for cross-entity matching
  let matchedCompanyIds: string[] = []
  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const { data: matchedCompanies } = await (supabase as any)
        .from('companies')
        .select('id')
        .ilike('name', `%${sanitizedQuery}%`)
      if (matchedCompanies && matchedCompanies.length > 0) {
        matchedCompanyIds = matchedCompanies.map((c: any) => c.id)
      }
    }
  }
  
  if (workspaceId) {
    let query = (supabase as any)
      .from('contacts')
      .select(`
        *,
        company:companies(*),
        workspace_contacts!inner(*),
        social_profiles(*)
      `)
      .eq('workspace_contacts.workspace_id', workspaceId)
      .is('archived_at', null)

    if (stage) {
      query = query.eq('workspace_contacts.relationship_stage', stage)
    }

    if (priority) {
      query = query.eq('workspace_contacts.priority', priority)
    }

    if (q) {
      const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
      if (sanitizedQuery) {
        const orClauses = [
          `full_name.ilike.%${sanitizedQuery}%`,
          `role_title.ilike.%${sanitizedQuery}%`
        ]
        if (matchedCompanyIds.length > 0) {
          orClauses.push(`company_id.in.(${matchedCompanyIds.join(',')})`)
        }
        query = query.or(orClauses.join(','))
      }
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []) as any[]
  }

  let query = (supabase as any)
    .from('contacts')
    .select(`
      *,
      company:companies(*),
      workspace_contacts(*),
      social_profiles(*)
    `)
    .is('archived_at', null)

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const orClauses = [
        `full_name.ilike.%${sanitizedQuery}%`,
        `role_title.ilike.%${sanitizedQuery}%`
      ]
      if (matchedCompanyIds.length > 0) {
        orClauses.push(`company_id.in.(${matchedCompanyIds.join(',')})`)
      }
      query = query.or(orClauses.join(','))
    }
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function createContact(formData: {
  fullName: string
  email?: string
  phone?: string
  roleTitle?: string
  location?: string
  bio?: string
  companyId?: string
  workspaceId: string
  relationshipType?: string
  relationshipStage: 'lead' | 'outreach' | 'connected' | 'in_discussion' | 'partner' | 'investor' | 'client' | 'dormant' | 'archived'
  relationshipScore: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // Validate companyId if provided
  let validatedCompanyId: string | null = null
  if (formData.companyId) {
    const { data: comp } = await (supabase as any)
      .from('companies')
      .select('id, workspace_companies!inner(workspace_id)')
      .eq('id', formData.companyId)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .eq('workspace_companies.workspace_id', formData.workspaceId)
      .maybeSingle()

    if (!comp) {
      throw new Error('Invalid organization or organization not associated with this workspace')
    }
    validatedCompanyId = comp.id
  }

  // 1. Create global contact
  const { data: contact, error: contactError } = await (supabase as any)
    .from('contacts')
    .insert({
      owner_id: user.id,
      full_name: formData.fullName,
      email: formData.email || null,
      phone: formData.phone || null,
      role_title: formData.roleTitle || null,
      location: formData.location || null,
      bio: formData.bio || null,
      company_id: validatedCompanyId,
    })
    .select()
    .single()

  if (contactError) throw new Error(contactError.message)

  // 2. Link to workspace
  const { error: wsError } = await (supabase as any)
    .from('workspace_contacts')
    .insert({
      workspace_id: formData.workspaceId,
      contact_id: contact.id,
      relationship_type: formData.relationshipType || 'professional',
      relationship_stage: formData.relationshipStage,
      relationship_score: formData.relationshipScore,
      priority: formData.priority,
      notes: formData.notes || null,
      created_by: user.id,
    })

  if (wsError) throw new Error(wsError.message)

  if (formData.companyId) {
    revalidatePath(`/vault/companies/${formData.companyId}`)
  }
  revalidatePath('/vault/contacts')
  revalidatePath('/vault')
  return contact
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function getCompanies(
  workspaceId?: string,
  options?: {
    q?: string
    tier?: string
    status?: string
  }
) {
  const supabase = await createClient()
  const q = options?.q?.trim()
  const tier = options?.tier && options.tier !== 'all' ? options.tier : undefined
  const status = options?.status && options.status !== 'all' ? options.status : undefined
  
  if (workspaceId) {
    let query = (supabase as any)
      .from('companies')
      .select(`
        *,
        workspace_companies!inner(*),
        contacts:contacts(count)
      `)
      .eq('workspace_companies.workspace_id', workspaceId)
      .is('archived_at', null)

    if (tier) {
      query = query.eq('workspace_companies.tier', tier)
    }

    if (status) {
      query = query.eq('workspace_companies.status', status)
    }

    if (q) {
      const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
      if (sanitizedQuery) {
        query = query.or(
          `name.ilike.%${sanitizedQuery}%,industry.ilike.%${sanitizedQuery}%,domain.ilike.%${sanitizedQuery}%,website.ilike.%${sanitizedQuery}%`
        )
      }
    }

    query = query.order('name', { ascending: true })

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []) as any[]
  }

  let query = (supabase as any)
    .from('companies')
    .select(`
      *,
      workspace_companies(*),
      contacts:contacts(count)
    `)
    .is('archived_at', null)

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      query = query.or(
        `name.ilike.%${sanitizedQuery}%,industry.ilike.%${sanitizedQuery}%,domain.ilike.%${sanitizedQuery}%,website.ilike.%${sanitizedQuery}%`
      )
    }
  }

  query = query.order('name', { ascending: true })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function createCompany(formData: {
  name: string
  domain?: string
  industry?: string
  website?: string
  linkedinUrl?: string
  xHandle?: string
  description?: string
  workspaceId: string
  tier: 'tier_1' | 'tier_2' | 'tier_3' | 'archived'
  status: 'prospect' | 'active' | 'partner' | 'portfolio' | 'vendor' | 'past'
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // 1. Create global company
  const { data: company, error: compError } = await (supabase as any)
    .from('companies')
    .insert({
      owner_id: user.id,
      name: formData.name,
      domain: formData.domain || null,
      industry: formData.industry || null,
      website: formData.website || null,
      linkedin_url: formData.linkedinUrl || null,
      x_handle: formData.xHandle || null,
      description: formData.description || null,
    })
    .select()
    .single()

  if (compError) throw new Error(compError.message)

  // 2. Link to workspace
  const { error: wsError } = await (supabase as any)
    .from('workspace_companies')
    .insert({
      workspace_id: formData.workspaceId,
      company_id: company.id,
      tier: formData.tier,
      status: formData.status,
      notes: formData.notes || null,
      created_by: user.id,
    })

  if (wsError) throw new Error(wsError.message)

  revalidatePath('/vault/companies')
  revalidatePath('/vault')
  return company
}

export async function getCompanyDetail(companyId: string, workspaceId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !workspaceId) return null

  // 0. Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return null

  // 1. Fetch global company record, ensuring it belongs to owner and is not archived
  const { data: company, error: companyError } = await (supabase as any)
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .maybeSingle()

  if (companyError || !company) return null

  // 2. Fetch and verify workspace relationship
  const { data: wsCompany, error: wsError } = await (supabase as any)
    .from('workspace_companies')
    .select('*')
    .eq('company_id', companyId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  // Enforce strict workspace isolation: do not reveal company existence if not linked to active workspace
  if (wsError || !wsCompany) return null

  // 3. Fetch connected contacts in this workspace
  const { data: contacts } = await (supabase as any)
    .from('contacts')
    .select(`
      *,
      workspace_contacts!inner(*, identity:identities(*))
    `)
    .eq('company_id', companyId)
    .eq('workspace_contacts.workspace_id', workspaceId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  // 4. Fetch connected opportunities in this workspace
  const { data: opportunities } = await (supabase as any)
    .from('opportunities')
    .select(`
      *,
      contact:contacts(id, full_name, email)
    `)
    .eq('company_id', companyId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  return {
    company,
    workspaceRelationship: wsCompany,
    contacts: contacts || [],
    opportunities: opportunities || [],
  }
}

export async function updateWorkspaceCompany(
  workspaceId: string,
  companyId: string,
  data: {
    tier?: string
    status?: string
    notes?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }
  if (data.tier !== undefined) updatePayload.tier = data.tier
  if (data.status !== undefined) updatePayload.status = data.status
  if (data.notes !== undefined) updatePayload.notes = data.notes || null

  const { error } = await (supabase as any)
    .from('workspace_companies')
    .update(updatePayload)
    .eq('workspace_id', workspaceId)
    .eq('company_id', companyId)

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/companies/${companyId}`)
  revalidatePath('/vault/companies')
  revalidatePath('/vault')
  return true
}

export async function updateCompanyGlobal(
  companyId: string,
  data: {
    name: string
    domain?: string
    industry?: string
    website?: string
    linkedinUrl?: string
    xHandle?: string
    description?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await (supabase as any)
    .from('companies')
    .update({
      name: data.name,
      domain: data.domain || null,
      industry: data.industry || null,
      website: data.website || null,
      linkedin_url: data.linkedinUrl || null,
      x_handle: data.xHandle || null,
      description: data.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId)
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/companies/${companyId}`)
  revalidatePath('/vault/companies')
  revalidatePath('/vault')
  return true
}

export async function archiveCompany(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await (supabase as any)
    .from('companies')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId)
    .eq('owner_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/companies')
  revalidatePath(`/vault/companies/${companyId}`)
  revalidatePath('/vault')
  return true
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export async function getInteractions(
  workspaceId?: string,
  options?: {
    q?: string
    channel?: string
    direction?: string
    identityId?: string
  }
) {
  const supabase = await createClient()
  const q = options?.q?.trim()
  const channel = options?.channel && options.channel !== 'all' ? options.channel : undefined
  const direction = options?.direction && options.direction !== 'all' ? options.direction : undefined
  const identityId = options?.identityId && options.identityId !== 'all' ? options.identityId : undefined

  if (!workspaceId) return []

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return []

  let matchedContactIds: string[] = []

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const [contactRes, companyRes] = await Promise.all([
        (supabase as any)
          .from('contacts')
          .select('id')
          .ilike('full_name', `%${sanitizedQuery}%`),
        (supabase as any)
          .from('companies')
          .select('id')
          .ilike('name', `%${sanitizedQuery}%`),
      ])

      if (contactRes.data && contactRes.data.length > 0) {
        matchedContactIds.push(...contactRes.data.map((c: any) => c.id))
      }
      if (companyRes.data && companyRes.data.length > 0) {
        const compIds = companyRes.data.map((c: any) => c.id)
        const { data: compContacts } = await (supabase as any)
          .from('contacts')
          .select('id')
          .in('company_id', compIds)
        if (compContacts && compContacts.length > 0) {
          matchedContactIds.push(...compContacts.map((c: any) => c.id))
        }
      }
      matchedContactIds = Array.from(new Set(matchedContactIds))
    }
  }

  let query = (supabase as any)
    .from('interactions')
    .select(`
      *,
      contact:contacts(
        id,
        full_name,
        email,
        role_title,
        company:companies(id, name)
      ),
      identity:identities(id, name, handle, type),
      workspace:workspaces(id, name)
    `)
    .eq('workspace_id', workspaceId)

  if (channel) {
    query = query.eq('channel', channel)
  }

  if (direction) {
    query = query.eq('direction', direction)
  }

  if (identityId) {
    query = query.eq('identity_id', identityId)
  }

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const orClauses = [
        `content.ilike.%${sanitizedQuery}%`,
        `purpose.ilike.%${sanitizedQuery}%`,
        `response.ilike.%${sanitizedQuery}%`,
        `next_action.ilike.%${sanitizedQuery}%`,
        `subject.ilike.%${sanitizedQuery}%`,
      ]
      if (matchedContactIds.length > 0) {
        orClauses.push(`contact_id.in.(${matchedContactIds.join(',')})`)
      }
      query = query.or(orClauses.join(','))
    }
  }

  query = query.order('interaction_date', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function logInteraction(formData: {
  workspaceId: string
  contactId: string
  identityId?: string
  channel: 'x' | 'telegram' | 'linkedin' | 'email' | 'call' | 'meeting' | 'in_person' | 'other'
  direction: 'inbound' | 'outbound' | 'internal_note'
  purpose?: string
  subject?: string
  content: string
  response?: string
  status?: 'planned' | 'completed' | 'cancelled' | 'no_response'
  sentiment?: 'positive' | 'neutral' | 'negative' | 'critical'
  nextAction?: string
  followUpAt?: string
  notes?: string
  interactionDate?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // 2. Verify contact exists, belongs to authenticated owner, and is linked to workspace
  const { data: contact } = await (supabase as any)
    .from('contacts')
    .select('id, workspace_contacts!inner(workspace_id)')
    .eq('id', formData.contactId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .eq('workspace_contacts.workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!contact) throw new Error('Contact not found or not associated with this workspace')

  // 3. Verify identity if supplied (must exist and belong to owner)
  let validatedIdentityId: string | null = null
  if (formData.identityId) {
    const { data: ident } = await (supabase as any)
      .from('identities')
      .select('id')
      .eq('id', formData.identityId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!ident) throw new Error('Operating identity not found or access denied')
    validatedIdentityId = ident.id
  }

  // 4. Validate and parse interaction_date
  let parsedDate = new Date().toISOString()
  if (formData.interactionDate) {
    const customDate = new Date(formData.interactionDate)
    if (!isNaN(customDate.getTime())) {
      parsedDate = customDate.toISOString()
    }
  }

  // 5. Insert interaction
  const { data, error } = await (supabase as any)
    .from('interactions')
    .insert({
      workspace_id: formData.workspaceId,
      contact_id: formData.contactId,
      identity_id: validatedIdentityId,
      channel: formData.channel,
      direction: formData.direction,
      purpose: formData.purpose || null,
      subject: formData.subject || null,
      content: formData.content,
      response: formData.response || null,
      status: formData.status || 'completed',
      sentiment: formData.sentiment || null,
      next_action: formData.nextAction || null,
      follow_up_at: formData.followUpAt || null,
      notes: formData.notes || null,
      interaction_date: parsedDate,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 6. Update contact's last_contacted_at in workspace_contacts
  await (supabase as any)
    .from('workspace_contacts')
    .update({ 
      last_contacted_at: parsedDate,
      ...(formData.followUpAt ? { next_follow_up_at: formData.followUpAt } : {})
    })
    .match({ workspace_id: formData.workspaceId, contact_id: formData.contactId })

  revalidatePath('/vault/interactions')
  revalidatePath('/vault/contacts')
  revalidatePath(`/vault/contacts/${formData.contactId}`)
  revalidatePath('/vault')
  return data
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export async function getFollowUps(
  workspaceId?: string,
  options?: {
    q?: string
    status?: string
    priority?: string
    dateState?: string
  }
) {
  const supabase = await createClient()
  const q = options?.q?.trim()
  const status = options?.status && options.status !== 'all' ? options.status : undefined
  const priority = options?.priority && options.priority !== 'all' ? options.priority : undefined
  const dateState = options?.dateState && options.dateState !== 'all' ? options.dateState : undefined

  if (!workspaceId) return []

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return []

  let matchedContactIds: string[] = []

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const [contactRes, companyRes] = await Promise.all([
        (supabase as any)
          .from('contacts')
          .select('id')
          .ilike('full_name', `%${sanitizedQuery}%`),
        (supabase as any)
          .from('companies')
          .select('id')
          .ilike('name', `%${sanitizedQuery}%`),
      ])

      if (contactRes.data && contactRes.data.length > 0) {
        matchedContactIds.push(...contactRes.data.map((c: any) => c.id))
      }
      if (companyRes.data && companyRes.data.length > 0) {
        const compIds = companyRes.data.map((c: any) => c.id)
        const { data: compContacts } = await (supabase as any)
          .from('contacts')
          .select('id')
          .in('company_id', compIds)
        if (compContacts && compContacts.length > 0) {
          matchedContactIds.push(...compContacts.map((c: any) => c.id))
        }
      }
      matchedContactIds = Array.from(new Set(matchedContactIds))
    }
  }

  let query = (supabase as any)
    .from('follow_ups')
    .select(`
      *,
      contact:contacts(
        id, 
        full_name, 
        email, 
        role_title,
        company:companies(id, name)
      ),
      interaction:interactions(
        id,
        channel,
        direction,
        interaction_date,
        purpose
      ),
      workspace:workspaces(id, name)
    `)
    .eq('workspace_id', workspaceId)

  if (priority) {
    query = query.eq('priority', priority)
  }

  if (status) {
    if (status === 'open') {
      query = query.eq('status', 'pending')
    } else {
      query = query.eq('status', status)
    }
  }

  if (dateState) {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString()
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()

    if (dateState === 'overdue') {
      query = query.eq('status', 'pending').lt('due_date', startOfToday)
    } else if (dateState === 'today') {
      query = query.eq('status', 'pending').gte('due_date', startOfToday).lte('due_date', endOfToday)
    } else if (dateState === 'upcoming') {
      query = query.eq('status', 'pending').gt('due_date', endOfToday)
    } else if (dateState === 'completed') {
      query = query.eq('status', 'completed')
    }
  }

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const orClauses = [
        `title.ilike.%${sanitizedQuery}%`,
        `description.ilike.%${sanitizedQuery}%`,
      ]
      if (matchedContactIds.length > 0) {
        orClauses.push(`contact_id.in.(${matchedContactIds.join(',')})`)
      }
      query = query.or(orClauses.join(','))
    }
  }

  if (status === 'completed' || dateState === 'completed') {
    query = query.order('completed_at', { ascending: false, nullsFirst: false }).order('due_date', { ascending: true })
  } else {
    query = query.order('due_date', { ascending: true })
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function toggleFollowUpStatus(id: string, currentStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify follow-up exists and retrieve its workspace_id and contact_id
  const { data: existing } = await (supabase as any)
    .from('follow_ups')
    .select('id, workspace_id, contact_id, status')
    .eq('id', id)
    .maybeSingle()

  if (!existing) throw new Error('Follow-up not found or access denied')

  // Verify user has membership access to this workspace
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', existing.workspace_id)
    .maybeSingle()
  if (!ws) throw new Error('Workspace access denied')

  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null

  const { error } = await (supabase as any)
    .from('follow_ups')
    .update({ 
      status: newStatus,
      completed_at: completedAt,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) throw new Error(error.message)

  // Recalculate earliest next_follow_up_at for this contact in this workspace
  const { data: nextPending } = await (supabase as any)
    .from('follow_ups')
    .select('due_date')
    .eq('workspace_id', existing.workspace_id)
    .eq('contact_id', existing.contact_id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  await (supabase as any)
    .from('workspace_contacts')
    .update({ next_follow_up_at: nextPending?.due_date || null })
    .match({ workspace_id: existing.workspace_id, contact_id: existing.contact_id })

  revalidatePath('/vault/follow-ups')
  revalidatePath('/vault')
  revalidatePath('/vault/contacts')
  revalidatePath(`/vault/contacts/${existing.contact_id}`)
  return newStatus
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------

export async function getOpportunities(
  workspaceId?: string,
  options?: {
    q?: string
    stage?: string
    type?: string
  }
) {
  const supabase = await createClient()
  const q = options?.q?.trim()
  const stage = options?.stage && options.stage !== 'all' ? options.stage : undefined
  const type = options?.type && options.type !== 'all' ? options.type : undefined

  let matchedContactIds: string[] = []
  let matchedCompanyIds: string[] = []

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const [contactRes, companyRes] = await Promise.all([
        (supabase as any)
          .from('contacts')
          .select('id')
          .ilike('full_name', `%${sanitizedQuery}%`),
        (supabase as any)
          .from('companies')
          .select('id')
          .ilike('name', `%${sanitizedQuery}%`),
      ])

      if (contactRes.data && contactRes.data.length > 0) {
        matchedContactIds = contactRes.data.map((c: any) => c.id)
      }
      if (companyRes.data && companyRes.data.length > 0) {
        matchedCompanyIds = companyRes.data.map((c: any) => c.id)
      }
    }
  }

  let query = (supabase as any)
    .from('opportunities')
    .select(`
      *,
      contact:contacts(id, full_name, email),
      company:companies(id, name),
      workspace:workspaces(id, name)
    `)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  if (stage) {
    query = query.eq('pipeline_stage', stage)
  }

  if (type) {
    query = query.eq('type', type)
  }

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const orClauses = [`title.ilike.%${sanitizedQuery}%`]
      if (matchedContactIds.length > 0) {
        orClauses.push(`contact_id.in.(${matchedContactIds.join(',')})`)
      }
      if (matchedCompanyIds.length > 0) {
        orClauses.push(`company_id.in.(${matchedCompanyIds.join(',')})`)
      }
      query = query.or(orClauses.join(','))
    }
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getWorkspaceProjects(workspaceId?: string) {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('workspace_projects')
    .select('*, identity:identities(*)')
    .order('created_at', { ascending: false })

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function createWorkspaceProject(formData: {
  workspaceId: string
  identityId?: string
  title: string
  description?: string
  status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  targetDate?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const baseSlug = formData.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'project'
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`

  const { data, error } = await (supabase as any)
    .from('workspace_projects')
    .insert({
      workspace_id: formData.workspaceId,
      identity_id: formData.identityId || null,
      title: formData.title.trim(),
      slug,
      description: formData.description?.trim() || null,
      status: formData.status || 'active',
      priority: formData.priority || 'medium',
      start_date: formData.startDate || null,
      target_date: formData.targetDate || null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/projects')
  revalidatePath('/vault')
  return data
}

// ---------------------------------------------------------------------------
// Contact Detail & Relationship Management
// ---------------------------------------------------------------------------

export async function getContactDetail(contactId: string, workspaceId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Fetch Contact
  const { data: contact, error: contactError } = await (supabase as any)
    .from('contacts')
    .select(`
      *,
      company:companies(*),
      social_profiles(*)
    `)
    .eq('id', contactId)
    .maybeSingle()

  if (contactError || !contact) return null

  // 2. Fetch Workspace Relationship (if workspaceId is provided)
  let wsContact: any = null
  let interactions: any[] = []
  let followUps: any[] = []
  let opportunities: any[] = []

  if (workspaceId) {
    const { data: wsData } = await (supabase as any)
      .from('workspace_contacts')
      .select(`
        *,
        identity:identities(*)
      `)
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    wsContact = wsData

    // Fetch workspace-scoped interactions
    const { data: interData } = await (supabase as any)
      .from('interactions')
      .select(`
        *,
        identity:identities(id, name, handle)
      `)
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('interaction_date', { ascending: false })

    interactions = interData || []

    // Fetch workspace-scoped follow-ups
    const { data: followData } = await (supabase as any)
      .from('follow_ups')
      .select('*')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true })

    followUps = followData || []

    // Fetch workspace-scoped opportunities
    const { data: oppData } = await (supabase as any)
      .from('opportunities')
      .select(`
        *,
        company:companies(id, name)
      `)
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    opportunities = oppData || []
  }

  return {
    contact,
    workspaceRelationship: wsContact,
    interactions,
    followUps,
    opportunities,
  }
}

export async function updateWorkspaceRelationship(
  workspaceId: string,
  contactId: string,
  data: {
    relationshipType?: string
    relationshipStage?: string
    relationshipScore?: number
    priority?: string
    primaryIdentityId?: string | null
    notes?: string
    nextFollowUpAt?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString()
  }
  if (data.relationshipType !== undefined) updatePayload.relationship_type = data.relationshipType
  if (data.relationshipStage !== undefined) updatePayload.relationship_stage = data.relationshipStage
  if (data.relationshipScore !== undefined) updatePayload.relationship_score = data.relationshipScore
  if (data.priority !== undefined) updatePayload.priority = data.priority
  if (data.primaryIdentityId !== undefined) updatePayload.primary_identity_id = data.primaryIdentityId || null
  if (data.notes !== undefined) updatePayload.notes = data.notes || null
  if (data.nextFollowUpAt !== undefined) updatePayload.next_follow_up_at = data.nextFollowUpAt || null

  const { error } = await (supabase as any)
    .from('workspace_contacts')
    .update(updatePayload)
    .eq('workspace_id', workspaceId)
    .eq('contact_id', contactId)

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/contacts/${contactId}`)
  revalidatePath('/vault/contacts')
  revalidatePath('/vault')
  return true
}

export async function updateContactGlobal(
  contactId: string,
  data: {
    fullName: string
    email?: string
    phone?: string
    roleTitle?: string
    location?: string
    bio?: string
    companyId?: string | null
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await (supabase as any)
    .from('contacts')
    .update({
      full_name: data.fullName,
      email: data.email || null,
      phone: data.phone || null,
      role_title: data.roleTitle || null,
      location: data.location || null,
      bio: data.bio || null,
      company_id: data.companyId || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId)

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/contacts/${contactId}`)
  revalidatePath('/vault/contacts')
  revalidatePath('/vault')
  return true
}

export async function archiveContact(contactId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await (supabase as any)
    .from('contacts')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', contactId)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/contacts')
  revalidatePath('/vault')
  return true
}

export async function createFollowUp(formData: {
  workspaceId: string
  contactId: string
  interactionId?: string
  title: string
  description?: string
  dueDate: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // 2. Contact authorization (must belong to owner, not archived, linked to workspace)
  const { data: contact } = await (supabase as any)
    .from('contacts')
    .select('id, workspace_contacts!inner(workspace_id)')
    .eq('id', formData.contactId)
    .eq('owner_id', user.id)
    .is('archived_at', null)
    .eq('workspace_contacts.workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!contact) throw new Error('Contact not found or not associated with this workspace')

  // 3. Interaction authorization (if provided)
  let validatedInteractionId: string | null = null
  if (formData.interactionId) {
    const { data: inter } = await (supabase as any)
      .from('interactions')
      .select('id')
      .eq('id', formData.interactionId)
      .eq('workspace_id', formData.workspaceId)
      .eq('contact_id', formData.contactId)
      .maybeSingle()
    if (!inter) throw new Error('Originating interaction not found or not associated with this contact and workspace')
    validatedInteractionId = inter.id
  }

  // 4. Validate dueDate
  const parsedDueDate = new Date(formData.dueDate)
  if (isNaN(parsedDueDate.getTime())) {
    throw new Error('Invalid due date provided')
  }

  // 5. Insert follow_up
  const { data, error } = await (supabase as any)
    .from('follow_ups')
    .insert({
      workspace_id: formData.workspaceId,
      contact_id: formData.contactId,
      interaction_id: validatedInteractionId,
      title: formData.title.trim(),
      description: formData.description?.trim() || null,
      due_date: parsedDueDate.toISOString(),
      status: 'pending',
      priority: formData.priority || 'medium',
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 6. Recalculate earliest next_follow_up_at in workspace_contacts
  const { data: nextPending } = await (supabase as any)
    .from('follow_ups')
    .select('due_date')
    .eq('workspace_id', formData.workspaceId)
    .eq('contact_id', formData.contactId)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  await (supabase as any)
    .from('workspace_contacts')
    .update({ next_follow_up_at: nextPending?.due_date || parsedDueDate.toISOString() })
    .match({ workspace_id: formData.workspaceId, contact_id: formData.contactId })

  revalidatePath(`/vault/contacts/${formData.contactId}`)
  revalidatePath('/vault/contacts')
  revalidatePath('/vault/follow-ups')
  revalidatePath('/vault')
  return data
}

export async function createOpportunity(formData: {
  workspaceId: string
  contactId?: string
  companyId?: string
  title: string
  type: string
  description?: string
  valueEstimate?: number
  currency?: string
  pipelineStage: string
  probability: number
  nextAction?: string
  expectedCloseDate?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // Validate companyId if provided
  let validatedCompanyId: string | null = null
  if (formData.companyId) {
    const { data: comp } = await (supabase as any)
      .from('companies')
      .select('id, workspace_companies!inner(workspace_id)')
      .eq('id', formData.companyId)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .eq('workspace_companies.workspace_id', formData.workspaceId)
      .maybeSingle()

    if (!comp) {
      throw new Error('Invalid organization or organization not associated with this workspace')
    }
    validatedCompanyId = comp.id
  }

  // Validate contactId if provided
  let validatedContactId: string | null = null
  if (formData.contactId) {
    const { data: ct } = await (supabase as any)
      .from('contacts')
      .select('id, workspace_contacts!inner(workspace_id)')
      .eq('id', formData.contactId)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .eq('workspace_contacts.workspace_id', formData.workspaceId)
      .maybeSingle()

    if (!ct) {
      throw new Error('Invalid contact or contact not associated with this workspace')
    }
    validatedContactId = ct.id
  }

  const { data, error } = await (supabase as any)
    .from('opportunities')
    .insert({
      workspace_id: formData.workspaceId,
      contact_id: validatedContactId,
      company_id: validatedCompanyId,
      title: formData.title,
      type: formData.type || 'growth_strategy',
      description: formData.description || null,
      value_estimate: formData.valueEstimate || null,
      currency: formData.currency || 'USD',
      pipeline_stage: formData.pipelineStage || 'lead',
      probability: formData.probability !== undefined ? formData.probability : 20,
      next_action: formData.nextAction || null,
      expected_close_date: formData.expectedCloseDate || null,
      notes: formData.notes || null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (formData.contactId) {
    revalidatePath(`/vault/contacts/${formData.contactId}`)
  }
  if (formData.companyId) {
    revalidatePath(`/vault/companies/${formData.companyId}`)
  }
  revalidatePath('/vault/opportunities')
  revalidatePath('/vault')
  return data
}

// ---------------------------------------------------------------------------
// RESEARCH RECORDS ACTIONS (PHASE 1)
// ---------------------------------------------------------------------------

export type ResearchType =
  | 'protocol'
  | 'market'
  | 'tokenomics'
  | 'growth'
  | 'company'
  | 'person'
  | 'product'
  | 'technology'
  | 'regulatory'
  | 'pevra'
  | 'other'

export type ResearchStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived'
export type ResearchPriority = 'low' | 'medium' | 'high' | 'urgent'

export async function getResearchRecords(
  workspaceId?: string,
  options?: {
    q?: string
    status?: string
    type?: string
    priority?: string
  }
) {
  const supabase = await createClient()
  const q = options?.q?.trim()
  const status = options?.status && options.status !== 'all' ? options.status : undefined
  const type = options?.type && options.type !== 'all' ? options.type : undefined
  const priority = options?.priority && options.priority !== 'all' ? options.priority : undefined

  if (!workspaceId) return []

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return []

  let query = (supabase as any)
    .from('research_records')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (status) {
    query = query.eq('status', status)
  } else {
    // By default exclude archived unless explicitly requested
    query = query.neq('status', 'archived')
  }

  if (type) {
    query = query.eq('research_type', type)
  }

  if (priority) {
    query = query.eq('priority', priority)
  }

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const orClauses = [
        `title.ilike.%${sanitizedQuery}%`,
        `research_question.ilike.%${sanitizedQuery}%`,
        `objective.ilike.%${sanitizedQuery}%`,
        `summary.ilike.%${sanitizedQuery}%`,
        `findings.ilike.%${sanitizedQuery}%`,
        `conclusion.ilike.%${sanitizedQuery}%`,
        `next_action.ilike.%${sanitizedQuery}%`,
      ]
      query = query.or(orClauses.join(','))
    }
  }

  query = query.order('updated_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function getResearchDetail(id: string, workspaceId?: string) {
  if (!workspaceId || !id) return null
  const supabase = await createClient()

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return null

  const { data, error } = await (supabase as any)
    .from('research_records')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function createResearchRecord(formData: {
  workspaceId: string
  title: string
  researchType?: ResearchType
  status?: ResearchStatus
  priority?: ResearchPriority
  researchQuestion?: string
  objective?: string
  summary?: string
  findings?: string
  conclusion?: string
  nextAction?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  if (!formData.title || !formData.title.trim()) {
    throw new Error('Title is required')
  }

  const { data, error } = await (supabase as any)
    .from('research_records')
    .insert({
      workspace_id: formData.workspaceId,
      title: formData.title.trim(),
      research_type: formData.researchType || 'market',
      status: formData.status || 'planning',
      priority: formData.priority || 'medium',
      research_question: formData.researchQuestion?.trim() || null,
      objective: formData.objective?.trim() || null,
      summary: formData.summary?.trim() || null,
      findings: formData.findings?.trim() || null,
      conclusion: formData.conclusion?.trim() || null,
      next_action: formData.nextAction?.trim() || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
      archived_at: formData.status === 'archived' ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/research')
  revalidatePath('/vault')
  return data
}

export async function updateResearchRecord(
  id: string,
  formData: {
    workspaceId: string
    title?: string
    researchType?: ResearchType
    status?: ResearchStatus
    priority?: ResearchPriority
    researchQuestion?: string
    objective?: string
    summary?: string
    findings?: string
    conclusion?: string
    nextAction?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // Verify record exists in workspace
  const { data: existing } = await (supabase as any)
    .from('research_records')
    .select('id, status')
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Research record not found or access denied')

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.title !== undefined) updates.title = formData.title.trim()
  if (formData.researchType !== undefined) updates.research_type = formData.researchType
  if (formData.status !== undefined) {
    updates.status = formData.status
    if (formData.status === 'completed') {
      updates.completed_at = new Date().toISOString()
    } else if (existing.status === 'completed') {
      updates.completed_at = null
    }
    if (formData.status === 'archived') {
      updates.archived_at = new Date().toISOString()
    } else if (existing.status === 'archived') {
      updates.archived_at = null
    }
  }
  if (formData.priority !== undefined) updates.priority = formData.priority
  if (formData.researchQuestion !== undefined) updates.research_question = formData.researchQuestion.trim() || null
  if (formData.objective !== undefined) updates.objective = formData.objective.trim() || null
  if (formData.summary !== undefined) updates.summary = formData.summary.trim() || null
  if (formData.findings !== undefined) updates.findings = formData.findings.trim() || null
  if (formData.conclusion !== undefined) updates.conclusion = formData.conclusion.trim() || null
  if (formData.nextAction !== undefined) updates.next_action = formData.nextAction.trim() || null

  const { data, error } = await (supabase as any)
    .from('research_records')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${id}`)
  revalidatePath('/vault/research')
  revalidatePath('/vault')
  return data
}

export async function archiveResearchRecord(id: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('research_records')
    .update({
      status: 'archived',
      archived_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${id}`)
  revalidatePath('/vault/research')
  revalidatePath('/vault')
  return data
}
