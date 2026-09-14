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

export type WorkspaceProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived'
export type WorkspaceProjectPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectLifecycleAction =
  | 'start'
  | 'pause'
  | 'resume'
  | 'complete'
  | 'reopen'
  | 'archive'
  | 'restore'

export interface WorkspaceProjectDetail {
  id: string
  workspace_id: string
  identity_id: string | null
  title: string
  slug: string
  description: string | null
  status: WorkspaceProjectStatus
  priority: WorkspaceProjectPriority
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  archived_at: string | null
  metadata: any
  created_by: string | null
  created_at: string
  updated_at: string
  identity?: {
    id: string
    name: string
    handle?: string
    avatar_url?: string | null
    primary_color?: string | null
  } | null
}

export async function getWorkspaceProjectDetail(
  id: string,
  workspaceId: string
): Promise<WorkspaceProjectDetail | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verify workspace membership
  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return null

  const { data, error } = await (supabase as any)
    .from('workspace_projects')
    .select('*, identity:identities(*)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error || !data) return null
  return data as WorkspaceProjectDetail
}

export async function updateWorkspaceProject(
  id: string,
  workspaceId: string,
  formData: {
    title?: string
    description?: string | null
    priority?: WorkspaceProjectPriority
    identityId?: string | null
    startDate?: string | null
    targetDate?: string | null
  }
): Promise<WorkspaceProjectDetail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify membership
  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Unauthorized')

  // Verify project exists in this workspace
  const { data: existing } = await (supabase as any)
    .from('workspace_projects')
    .select('id, workspace_id, status, identity_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!existing) throw new Error('Project not found or access denied')

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.title !== undefined) {
    const t = formData.title.trim()
    if (!t) throw new Error('Title is required')
    updates.title = t
  }
  if (formData.description !== undefined) {
    updates.description = formData.description?.trim() || null
  }
  if (formData.priority !== undefined) {
    updates.priority = formData.priority
  }
  if (formData.identityId !== undefined) {
    updates.identity_id = formData.identityId || null
  }
  if (formData.startDate !== undefined) {
    updates.start_date = formData.startDate || null
  }
  if (formData.targetDate !== undefined) {
    updates.target_date = formData.targetDate || null
  }

  const { data, error } = await (supabase as any)
    .from('workspace_projects')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*, identity:identities(*)')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/projects')
  revalidatePath(`/vault/projects/${id}`)
  revalidatePath('/vault')

  return data as WorkspaceProjectDetail
}

export async function updateProjectLifecycle(
  id: string,
  workspaceId: string,
  action: ProjectLifecycleAction
): Promise<WorkspaceProjectDetail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify membership
  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Unauthorized')

  // Verify project exists in this workspace
  const { data: existing } = await (supabase as any)
    .from('workspace_projects')
    .select('id, workspace_id, status, completed_at, archived_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!existing) throw new Error('Project not found or access denied')

  const now = new Date().toISOString()
  const updates: any = {
    updated_at: now,
  }

  switch (action) {
    case 'start': // planning -> active
      if (existing.status !== 'planning') {
        throw new Error(`Cannot start project from status '${existing.status}'`)
      }
      updates.status = 'active'
      break

    case 'pause': // active -> paused
      if (existing.status !== 'active') {
        throw new Error(`Cannot pause project from status '${existing.status}'`)
      }
      updates.status = 'paused'
      break

    case 'resume': // paused -> active
      if (existing.status !== 'paused') {
        throw new Error(`Cannot resume project from status '${existing.status}'`)
      }
      updates.status = 'active'
      break

    case 'complete': // active or paused -> completed
      if (existing.status !== 'active' && existing.status !== 'paused') {
        throw new Error(`Cannot complete project from status '${existing.status}'`)
      }
      updates.status = 'completed'
      updates.completed_at = now
      break

    case 'reopen': // completed -> active
      if (existing.status !== 'completed') {
        throw new Error(`Cannot reopen project from status '${existing.status}'`)
      }
      updates.status = 'active'
      updates.completed_at = null
      break

    case 'archive': // from any non-archived state -> archived
      if (existing.status === 'archived') {
        throw new Error('Project is already archived')
      }
      updates.status = 'archived'
      updates.archived_at = now
      // Preserve existing completed_at (per Prompt section 8)
      break

    case 'restore': // archived -> active
      if (existing.status !== 'archived') {
        throw new Error('Project is not archived')
      }
      updates.status = 'active'
      updates.archived_at = null
      // Preserve existing completed_at (per Prompt section 8)
      break

    default:
      throw new Error(`Invalid lifecycle action: ${action}`)
  }

  const { data, error } = await (supabase as any)
    .from('workspace_projects')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*, identity:identities(*)')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/projects')
  revalidatePath(`/vault/projects/${id}`)
  revalidatePath('/vault')

  return data as WorkspaceProjectDetail
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

export type ResearchSourceType =
  | 'article'
  | 'research_report'
  | 'documentation'
  | 'whitepaper'
  | 'official_website'
  | 'social_post'
  | 'interview'
  | 'dataset'
  | 'academic_paper'
  | 'regulatory_document'
  | 'video'
  | 'other'

// ----------------------------------------------------------------------------
// Research Sources Actions
// ----------------------------------------------------------------------------

export async function getResearchSources(
  researchRecordId: string,
  workspaceId: string,
  includeArchived = false
) {
  if (!workspaceId || !researchRecordId) return []
  const supabase = await createClient()

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return []

  let query = (supabase as any)
    .from('research_sources')
    .select('*')
    .eq('research_record_id', researchRecordId)
    .eq('workspace_id', workspaceId)

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function createResearchSource(formData: {
  workspaceId: string
  researchRecordId: string
  title: string
  sourceType?: ResearchSourceType
  url?: string
  publisher?: string
  author?: string
  publishedAt?: string
  accessedAt?: string
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

  // Verify research record belongs to this workspace
  const { data: record } = await (supabase as any)
    .from('research_records')
    .select('id')
    .eq('id', formData.researchRecordId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!record) throw new Error('Research record not found or access denied')

  if (!formData.title || !formData.title.trim()) {
    throw new Error('Title is required')
  }

  const { data, error } = await (supabase as any)
    .from('research_sources')
    .insert({
      workspace_id: formData.workspaceId,
      research_record_id: formData.researchRecordId,
      title: formData.title.trim(),
      source_type: formData.sourceType || 'article',
      url: formData.url?.trim() || null,
      publisher: formData.publisher?.trim() || null,
      author: formData.author?.trim() || null,
      published_at: formData.publishedAt || null,
      accessed_at: formData.accessedAt || new Date().toISOString().split('T')[0],
      notes: formData.notes?.trim() || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${formData.researchRecordId}`)
  revalidatePath('/vault/research')
  return data
}

export async function updateResearchSource(
  id: string,
  formData: {
    workspaceId: string
    title?: string
    sourceType?: ResearchSourceType
    url?: string
    publisher?: string
    author?: string
    publishedAt?: string
    accessedAt?: string
    notes?: string
    archivedAt?: string | null
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

  // Verify source belongs to workspace
  const { data: existing } = await (supabase as any)
    .from('research_sources')
    .select('id, research_record_id, workspace_id')
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Source not found or access denied')

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.title !== undefined) {
    if (!formData.title.trim()) throw new Error('Title cannot be empty')
    updates.title = formData.title.trim()
  }
  if (formData.sourceType !== undefined) updates.source_type = formData.sourceType
  if (formData.url !== undefined) updates.url = formData.url.trim() || null
  if (formData.publisher !== undefined) updates.publisher = formData.publisher.trim() || null
  if (formData.author !== undefined) updates.author = formData.author.trim() || null
  if (formData.publishedAt !== undefined) updates.published_at = formData.publishedAt || null
  if (formData.accessedAt !== undefined) updates.accessed_at = formData.accessedAt || null
  if (formData.notes !== undefined) updates.notes = formData.notes.trim() || null
  if (formData.archivedAt !== undefined) updates.archived_at = formData.archivedAt

  const { data, error } = await (supabase as any)
    .from('research_sources')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')
  return data
}

export async function archiveResearchSource(id: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const { data: existing } = await (supabase as any)
    .from('research_sources')
    .select('id, research_record_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Source not found or access denied')

  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('research_sources')
    .update({
      archived_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')
  return data
}

export async function restoreResearchSource(id: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const { data: existing } = await (supabase as any)
    .from('research_sources')
    .select('id, research_record_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Source not found or access denied')

  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('research_sources')
    .update({
      archived_at: null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')
  return data
}

// ----------------------------------------------------------------------------
// Research Evidence Actions
// ----------------------------------------------------------------------------

export async function getResearchEvidence(
  researchRecordId: string,
  workspaceId: string,
  includeArchived = false
) {
  if (!workspaceId || !researchRecordId) return []
  const supabase = await createClient()

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return []

  let query = (supabase as any)
    .from('research_evidence')
    .select(`
      *,
      source:research_sources(
        id,
        title,
        source_type,
        url,
        publisher,
        author
      )
    `)
    .eq('research_record_id', researchRecordId)
    .eq('workspace_id', workspaceId)

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as any[]
}

export async function createResearchEvidence(formData: {
  workspaceId: string
  researchRecordId: string
  sourceId: string
  evidenceText: string
  claimSummary?: string
  contextLocation?: string
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

  // Verify research record belongs to workspace
  const { data: record } = await (supabase as any)
    .from('research_records')
    .select('id')
    .eq('id', formData.researchRecordId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!record) throw new Error('Research record not found or access denied')

  // Verify source belongs to this workspace AND belongs to this research record
  const { data: source } = await (supabase as any)
    .from('research_sources')
    .select('id, research_record_id, workspace_id')
    .eq('id', formData.sourceId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()

  if (!source) throw new Error('Source not found or access denied')
  if (source.research_record_id !== formData.researchRecordId) {
    throw new Error('Integrity violation: source does not belong to this research record')
  }

  if (!formData.evidenceText || !formData.evidenceText.trim()) {
    throw new Error('Evidence text is required')
  }

  const { data, error } = await (supabase as any)
    .from('research_evidence')
    .insert({
      workspace_id: formData.workspaceId,
      research_record_id: formData.researchRecordId,
      source_id: formData.sourceId,
      evidence_text: formData.evidenceText.trim(),
      claim_summary: formData.claimSummary?.trim() || null,
      context_location: formData.contextLocation?.trim() || null,
      notes: formData.notes?.trim() || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select(`
      *,
      source:research_sources(
        id,
        title,
        source_type,
        url,
        publisher,
        author
      )
    `)
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${formData.researchRecordId}`)
  revalidatePath('/vault/research')
  return data
}

export async function updateResearchEvidence(
  id: string,
  formData: {
    workspaceId: string
    evidenceText?: string
    claimSummary?: string
    contextLocation?: string
    notes?: string
    archivedAt?: string | null
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

  // Verify evidence belongs to workspace
  const { data: existing } = await (supabase as any)
    .from('research_evidence')
    .select('id, research_record_id, workspace_id')
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Evidence not found or access denied')

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.evidenceText !== undefined) {
    if (!formData.evidenceText.trim()) throw new Error('Evidence text cannot be empty')
    updates.evidence_text = formData.evidenceText.trim()
  }
  if (formData.claimSummary !== undefined) updates.claim_summary = formData.claimSummary.trim() || null
  if (formData.contextLocation !== undefined) updates.context_location = formData.contextLocation.trim() || null
  if (formData.notes !== undefined) updates.notes = formData.notes.trim() || null
  if (formData.archivedAt !== undefined) updates.archived_at = formData.archivedAt

  const { data, error } = await (supabase as any)
    .from('research_evidence')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .select(`
      *,
      source:research_sources(
        id,
        title,
        source_type,
        url,
        publisher,
        author
      )
    `)
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')
  return data
}

export async function archiveResearchEvidence(id: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const { data: existing } = await (supabase as any)
    .from('research_evidence')
    .select('id, research_record_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Evidence not found or access denied')

  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('research_evidence')
    .update({
      archived_at: now,
      updated_at: now,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')
  return data
}

export async function restoreResearchEvidence(id: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const { data: existing } = await (supabase as any)
    .from('research_evidence')
    .select('id, research_record_id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Evidence not found or access denied')

  const now = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('research_evidence')
    .update({
      archived_at: null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')
  return data
}

// -------------------------------------------------------------
// WAYNEX VAULT — RESEARCH PHASE 3A: CONNECTIONS
// -------------------------------------------------------------

export type ResearchConnectionType =
  | 'subject'
  | 'stakeholder'
  | 'partner'
  | 'competitor'
  | 'due_diligence'
  | 'supporting'

export interface ResearchConnectionItem {
  id: string
  workspace_id: string
  research_record_id: string
  contact_id: string | null
  company_id: string | null
  opportunity_id: string | null
  project_id: string | null
  relationship_type: ResearchConnectionType
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  contact?: {
    id: string
    full_name: string
    role_title: string | null
    avatar_url?: string | null
    email?: string | null
  } | null
  company?: {
    id: string
    name: string
    industry: string | null
    domain: string | null
  } | null
  opportunity?: {
    id: string
    title: string
    type: string
    pipeline_stage: string
    value_estimate: number | null
    currency: string | null
  } | null
  project?: {
    id: string
    title: string
    status: string
    priority: string
  } | null
}

export async function getResearchConnections(
  researchRecordId: string,
  workspaceId: string
): Promise<ResearchConnectionItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await (supabase as any)
    .from('research_connections')
    .select(`
      id,
      workspace_id,
      research_record_id,
      contact_id,
      company_id,
      opportunity_id,
      project_id,
      relationship_type,
      notes,
      created_by,
      created_at,
      updated_at,
      workspace_contacts(
        contact:contacts(
          id,
          full_name,
          role_title,
          avatar_url,
          email
        )
      ),
      workspace_companies(
        company:companies(
          id,
          name,
          industry,
          domain
        )
      ),
      opportunity:opportunities(
        id,
        title,
        type,
        pipeline_stage,
        value_estimate,
        currency
      ),
      project:workspace_projects(
        id,
        title,
        status,
        priority
      )
    `)
    .eq('research_record_id', researchRecordId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((row: any) => ({
    id: row.id,
    workspace_id: row.workspace_id,
    research_record_id: row.research_record_id,
    contact_id: row.contact_id,
    company_id: row.company_id,
    opportunity_id: row.opportunity_id,
    project_id: row.project_id,
    relationship_type: row.relationship_type,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    contact: row.workspace_contacts?.contact || null,
    company: row.workspace_companies?.company || null,
    opportunity: row.opportunity || null,
    project: row.project || null,
  }))
}

export async function createResearchConnection(formData: {
  workspaceId: string
  researchRecordId: string
  contactId?: string | null
  companyId?: string | null
  opportunityId?: string | null
  projectId?: string | null
  relationshipType?: ResearchConnectionType
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Verify workspace access
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // 2. Verify research record exists and belongs to workspace
  const { data: record } = await (supabase as any)
    .from('research_records')
    .select('id, workspace_id')
    .eq('id', formData.researchRecordId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!record) throw new Error('Research record not found or access denied')

  // 3. Enforce exactly one target entity
  const targets = [
    formData.contactId ? { type: 'contact', id: formData.contactId } : null,
    formData.companyId ? { type: 'company', id: formData.companyId } : null,
    formData.opportunityId ? { type: 'opportunity', id: formData.opportunityId } : null,
    formData.projectId ? { type: 'project', id: formData.projectId } : null,
  ].filter(Boolean)

  if (targets.length !== 1) {
    throw new Error('Exactly one target entity (contact, company, opportunity, or project) must be specified')
  }

  // 4. Validate target entity exists within the same workspace
  if (formData.contactId) {
    const { data: contact } = await (supabase as any)
      .from('workspace_contacts')
      .select('contact_id')
      .eq('workspace_id', formData.workspaceId)
      .eq('contact_id', formData.contactId)
      .maybeSingle()
    if (!contact) throw new Error('Contact not found or not associated with this workspace')
  } else if (formData.companyId) {
    const { data: company } = await (supabase as any)
      .from('workspace_companies')
      .select('company_id')
      .eq('workspace_id', formData.workspaceId)
      .eq('company_id', formData.companyId)
      .maybeSingle()
    if (!company) throw new Error('Company not found or not associated with this workspace')
  } else if (formData.opportunityId) {
    const { data: opp } = await (supabase as any)
      .from('opportunities')
      .select('id')
      .eq('workspace_id', formData.workspaceId)
      .eq('id', formData.opportunityId)
      .maybeSingle()
    if (!opp) throw new Error('Opportunity not found or not associated with this workspace')
  } else if (formData.projectId) {
    const { data: proj } = await (supabase as any)
      .from('workspace_projects')
      .select('id')
      .eq('workspace_id', formData.workspaceId)
      .eq('id', formData.projectId)
      .maybeSingle()
    if (!proj) throw new Error('Project not found or not associated with this workspace')
  }

  // 5. Validate relationship type
  const validRelTypes: ResearchConnectionType[] = [
    'subject',
    'stakeholder',
    'partner',
    'competitor',
    'due_diligence',
    'supporting'
  ]
  const relType = formData.relationshipType || 'subject'
  if (!validRelTypes.includes(relType)) {
    throw new Error(`Invalid relationship type: ${relType}`)
  }

  // 6. Insert connection
  const { data, error } = await (supabase as any)
    .from('research_connections')
    .insert({
      workspace_id: formData.workspaceId,
      research_record_id: formData.researchRecordId,
      contact_id: formData.contactId || null,
      company_id: formData.companyId || null,
      opportunity_id: formData.opportunityId || null,
      project_id: formData.projectId || null,
      relationship_type: relType,
      notes: formData.notes?.trim() || null,
      created_by: user.id
    })
    .select(`
      id,
      workspace_id,
      research_record_id,
      contact_id,
      company_id,
      opportunity_id,
      project_id,
      relationship_type,
      notes,
      created_by,
      created_at,
      updated_at,
      workspace_contacts(
        contact:contacts(
          id,
          full_name,
          role_title,
          avatar_url,
          email
        )
      ),
      workspace_companies(
        company:companies(
          id,
          name,
          industry,
          domain
        )
      ),
      opportunity:opportunities(
        id,
        title,
        type,
        pipeline_stage,
        value_estimate,
        currency
      ),
      project:workspace_projects(
        id,
        title,
        status,
        priority
      )
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This entity is already connected to this research record')
    }
    throw new Error(error.message)
  }

  revalidatePath(`/vault/research/${formData.researchRecordId}`)
  revalidatePath('/vault/research')

  return {
    id: data.id,
    workspace_id: data.workspace_id,
    research_record_id: data.research_record_id,
    contact_id: data.contact_id,
    company_id: data.company_id,
    opportunity_id: data.opportunity_id,
    project_id: data.project_id,
    relationship_type: data.relationship_type,
    notes: data.notes,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    contact: data.workspace_contacts?.contact || null,
    company: data.workspace_companies?.company || null,
    opportunity: data.opportunity || null,
    project: data.project || null,
  }
}

export async function updateResearchConnection(
  connectionId: string,
  formData: {
    workspaceId: string
    relationshipType?: ResearchConnectionType
    notes?: string | null
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

  // Verify connection belongs to workspace
  const { data: existing } = await (supabase as any)
    .from('research_connections')
    .select('id, research_record_id, workspace_id')
    .eq('id', connectionId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Connection not found or access denied')

  const updates: any = {
    updated_at: new Date().toISOString()
  }

  if (formData.relationshipType !== undefined) {
    const validRelTypes: ResearchConnectionType[] = [
      'subject',
      'stakeholder',
      'partner',
      'competitor',
      'due_diligence',
      'supporting'
    ]
    if (!validRelTypes.includes(formData.relationshipType)) {
      throw new Error(`Invalid relationship type: ${formData.relationshipType}`)
    }
    updates.relationship_type = formData.relationshipType
  }

  if (formData.notes !== undefined) {
    updates.notes = formData.notes ? formData.notes.trim() : null
  }

  const { data, error } = await (supabase as any)
    .from('research_connections')
    .update(updates)
    .eq('id', connectionId)
    .eq('workspace_id', formData.workspaceId)
    .select(`
      id,
      workspace_id,
      research_record_id,
      contact_id,
      company_id,
      opportunity_id,
      project_id,
      relationship_type,
      notes,
      created_by,
      created_at,
      updated_at,
      workspace_contacts(
        contact:contacts(
          id,
          full_name,
          role_title,
          avatar_url,
          email
        )
      ),
      workspace_companies(
        company:companies(
          id,
          name,
          industry,
          domain
        )
      ),
      opportunity:opportunities(
        id,
        title,
        type,
        pipeline_stage,
        value_estimate,
        currency
      ),
      project:workspace_projects(
        id,
        title,
        status,
        priority
      )
    `)
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')

  return {
    id: data.id,
    workspace_id: data.workspace_id,
    research_record_id: data.research_record_id,
    contact_id: data.contact_id,
    company_id: data.company_id,
    opportunity_id: data.opportunity_id,
    project_id: data.project_id,
    relationship_type: data.relationship_type,
    notes: data.notes,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
    contact: data.workspace_contacts?.contact || null,
    company: data.workspace_companies?.company || null,
    opportunity: data.opportunity || null,
    project: data.project || null,
  }
}

export async function deleteResearchConnection(connectionId: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const { data: existing } = await (supabase as any)
    .from('research_connections')
    .select('id, research_record_id')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Connection not found or access denied')

  const { error } = await (supabase as any)
    .from('research_connections')
    .delete()
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/research/${existing.research_record_id}`)
  revalidatePath('/vault/research')
  return true
}

export async function getWorkspaceConnectableEntities(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Fetch contacts in this workspace
  const { data: contactsData } = await (supabase as any)
    .from('workspace_contacts')
    .select(`
      contact_id,
      contact:contacts(
        id,
        full_name,
        role_title,
        avatar_url,
        archived_at
      )
    `)
    .eq('workspace_id', workspaceId)

  const contacts = (contactsData || [])
    .filter((c: any) => c.contact && !c.contact.archived_at)
    .map((c: any) => ({
      id: c.contact.id,
      fullName: c.contact.full_name as string,
      roleTitle: (c.contact.role_title || null) as string | null,
      avatarUrl: (c.contact.avatar_url || null) as string | null,
    }))
    .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName))

  // 2. Fetch companies in this workspace
  const { data: companiesData } = await (supabase as any)
    .from('workspace_companies')
    .select(`
      company_id,
      tier,
      company:companies(
        id,
        name,
        industry,
        domain,
        archived_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .neq('tier', 'archived')

  const companies = (companiesData || [])
    .filter((c: any) => c.company && !c.company.archived_at)
    .map((c: any) => ({
      id: c.company.id,
      name: c.company.name as string,
      industry: (c.company.industry || null) as string | null,
      domain: (c.company.domain || null) as string | null,
      tier: c.tier as string,
    }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name))

  // 3. Fetch opportunities in this workspace
  const { data: opportunitiesData } = await (supabase as any)
    .from('opportunities')
    .select('id, title, type, pipeline_stage, value_estimate, currency')
    .eq('workspace_id', workspaceId)
    .order('title', { ascending: true })

  const opportunities = (opportunitiesData || []).map((o: any) => ({
    id: o.id,
    title: o.title as string,
    type: o.type as string,
    pipelineStage: o.pipeline_stage as string,
    valueEstimate: (o.value_estimate || null) as number | null,
    currency: (o.currency || 'USD') as string,
  }))

  // 4. Fetch projects in this workspace
  const { data: projectsData } = await (supabase as any)
    .from('workspace_projects')
    .select('id, title, status, priority')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived')
    .order('title', { ascending: true })

  const projects = (projectsData || []).map((p: any) => ({
    id: p.id,
    title: p.title as string,
    status: p.status as string,
    priority: p.priority as string,
  }))

  return {
    contacts,
    companies,
    opportunities,
    projects,
  }
}

// -------------------------------------------------------------
// WAYNEX VAULT — RESEARCH PHASE 3B: REVERSE RESEARCH VIEWS
// -------------------------------------------------------------

export type RelatedResearchEntityType = 'contact' | 'company' | 'opportunity' | 'project'

export interface RelatedResearchItem {
  id: string
  research_record_id: string
  relationship_type: ResearchConnectionType
  notes: string | null
  created_at: string
  research_record: {
    id: string
    workspace_id: string
    title: string
    research_type: string
    status: string
    priority: string
    research_question: string | null
    objective: string | null
    summary: string | null
    findings: string | null
    conclusion: string | null
    archived_at: string | null
    created_at: string
    updated_at: string
  }
}

export async function getRelatedResearchForEntity(
  entityType: RelatedResearchEntityType,
  entityId: string,
  workspaceId?: string
): Promise<RelatedResearchItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !workspaceId || !entityId) return []

  // 1. Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return []

  // 2. Strict entity type validation and workspace membership check
  if (entityType === 'contact') {
    const { data: contact } = await (supabase as any)
      .from('workspace_contacts')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', entityId)
      .maybeSingle()
    if (!contact) return []
  } else if (entityType === 'company') {
    const { data: company } = await (supabase as any)
      .from('workspace_companies')
      .select('company_id')
      .eq('workspace_id', workspaceId)
      .eq('company_id', entityId)
      .maybeSingle()
    if (!company) return []
  } else if (entityType === 'opportunity') {
    const { data: opp } = await (supabase as any)
      .from('opportunities')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', entityId)
      .maybeSingle()
    if (!opp) return []
  } else if (entityType === 'project') {
    const { data: proj } = await (supabase as any)
      .from('workspace_projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', entityId)
      .maybeSingle()
    if (!proj) return []
  } else {
    return []
  }

  // 3. Map entityType to target column
  const columnMap: Record<RelatedResearchEntityType, string> = {
    contact: 'contact_id',
    company: 'company_id',
    opportunity: 'opportunity_id',
    project: 'project_id',
  }
  const targetCol = columnMap[entityType]

  // 4. Query connections and join research_records
  const { data, error } = await (supabase as any)
    .from('research_connections')
    .select(`
      id,
      relationship_type,
      notes,
      created_at,
      research_record:research_records(
        id,
        workspace_id,
        title,
        research_type,
        status,
        priority,
        research_question,
        objective,
        summary,
        findings,
        conclusion,
        archived_at,
        created_at,
        updated_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq(targetCol, entityId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .filter((row: any) => row.research_record && row.research_record.id)
    .map((row: any) => ({
      id: row.id,
      research_record_id: row.research_record.id,
      relationship_type: row.relationship_type,
      notes: row.notes,
      created_at: row.created_at,
      research_record: row.research_record,
    }))
}

// ---------------------------------------------------------------------------
// REVIEWS ACTIONS (PHASE 1)
// ---------------------------------------------------------------------------

export type ReviewType =
  | 'project'
  | 'campaign'
  | 'growth'
  | 'strategy'
  | 'opportunity'
  | 'partnership'
  | 'period'
  | 'other'

export type ReviewStatus = 'draft' | 'completed' | 'archived'

export interface ReviewItem {
  id: string
  workspace_id: string
  title: string
  review_type: ReviewType
  status: ReviewStatus
  period_start: string | null
  period_end: string | null
  objective: string | null
  expected_outcome: string | null
  actual_outcome: string | null
  what_worked: string | null
  what_did_not_work: string | null
  why: string | null
  lessons: string | null
  next_changes: string | null
  summary: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  archived_at: string | null
}

export async function getReviews(
  workspaceId?: string,
  options?: {
    q?: string
    status?: string
    type?: string
  }
): Promise<ReviewItem[]> {
  if (!workspaceId) return []
  const supabase = await createClient()

  // Verify workspace authorization
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return []

  const q = options?.q?.trim()
  const status = options?.status && options.status !== 'all' ? options.status : undefined
  const type = options?.type && options.type !== 'all' ? options.type : undefined

  let query = (supabase as any)
    .from('reviews')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (status) {
    query = query.eq('status', status)
  } else {
    query = query.neq('status', 'archived')
  }

  if (type) {
    query = query.eq('review_type', type)
  }

  if (q) {
    const sanitizedQuery = q.replace(/[,()]/g, ' ').trim()
    if (sanitizedQuery) {
      const orClauses = [
        `title.ilike.%${sanitizedQuery}%`,
        `objective.ilike.%${sanitizedQuery}%`,
        `expected_outcome.ilike.%${sanitizedQuery}%`,
        `actual_outcome.ilike.%${sanitizedQuery}%`,
        `what_worked.ilike.%${sanitizedQuery}%`,
        `what_did_not_work.ilike.%${sanitizedQuery}%`,
        `why.ilike.%${sanitizedQuery}%`,
        `lessons.ilike.%${sanitizedQuery}%`,
        `next_changes.ilike.%${sanitizedQuery}%`,
        `summary.ilike.%${sanitizedQuery}%`,
      ]
      query = query.or(orClauses.join(','))
    }
  }

  query = query.order('updated_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as ReviewItem[]
}

export async function getReviewDetail(id: string, workspaceId?: string): Promise<ReviewItem | null> {
  if (!workspaceId || !id) return null
  const supabase = await createClient()

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) return null

  const { data, error } = await (supabase as any)
    .from('reviews')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  return (data || null) as ReviewItem | null
}

export async function createReview(formData: {
  workspaceId: string
  title: string
  reviewType?: ReviewType
  status?: ReviewStatus
  periodStart?: string | null
  periodEnd?: string | null
  objective?: string | null
  expectedOutcome?: string | null
  actualOutcome?: string | null
  whatWorked?: string | null
  whatDidNotWork?: string | null
  why?: string | null
  lessons?: string | null
  nextChanges?: string | null
  summary?: string | null
}): Promise<ReviewItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  if (!formData.title || !formData.title.trim()) {
    throw new Error('Title is required')
  }

  const periodStart = formData.periodStart || null
  const periodEnd = formData.periodEnd || null
  if (periodStart && periodEnd && periodStart > periodEnd) {
    throw new Error('Period start date cannot be after period end date')
  }

  const now = new Date().toISOString()
  const status = formData.status || 'draft'
  const completedAt = status === 'completed' ? now : null

  const { data, error } = await (supabase as any)
    .from('reviews')
    .insert({
      workspace_id: formData.workspaceId,
      title: formData.title.trim(),
      review_type: formData.reviewType || 'other',
      status,
      period_start: periodStart,
      period_end: periodEnd,
      objective: formData.objective?.trim() || null,
      expected_outcome: formData.expectedOutcome?.trim() || null,
      actual_outcome: formData.actualOutcome?.trim() || null,
      what_worked: formData.whatWorked?.trim() || null,
      what_did_not_work: formData.whatDidNotWork?.trim() || null,
      why: formData.why?.trim() || null,
      lessons: formData.lessons?.trim() || null,
      next_changes: formData.nextChanges?.trim() || null,
      summary: formData.summary?.trim() || null,
      created_by: user.id,
      completed_at: completedAt,
      archived_at: null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/reviews')
  revalidatePath('/vault')
  return data as ReviewItem
}

export async function updateReview(
  id: string,
  formData: {
    workspaceId: string
    title?: string
    reviewType?: ReviewType
    status?: ReviewStatus
    periodStart?: string | null
    periodEnd?: string | null
    objective?: string | null
    expectedOutcome?: string | null
    actualOutcome?: string | null
    whatWorked?: string | null
    whatDidNotWork?: string | null
    why?: string | null
    lessons?: string | null
    nextChanges?: string | null
    summary?: string | null
  }
): Promise<ReviewItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await (supabase as any)
    .from('reviews')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Review not found or access denied')

  const periodStart = formData.periodStart !== undefined ? (formData.periodStart || null) : existing.period_start
  const periodEnd = formData.periodEnd !== undefined ? (formData.periodEnd || null) : existing.period_end
  if (periodStart && periodEnd && periodStart > periodEnd) {
    throw new Error('Period start date cannot be after period end date')
  }

  const now = new Date().toISOString()
  const updates: any = {
    updated_at: now,
  }

  if (formData.title !== undefined) updates.title = formData.title.trim()
  if (formData.reviewType !== undefined) updates.review_type = formData.reviewType
  if (formData.periodStart !== undefined) updates.period_start = formData.periodStart || null
  if (formData.periodEnd !== undefined) updates.period_end = formData.periodEnd || null
  if (formData.objective !== undefined) updates.objective = formData.objective?.trim() || null
  if (formData.expectedOutcome !== undefined) updates.expected_outcome = formData.expectedOutcome?.trim() || null
  if (formData.actualOutcome !== undefined) updates.actual_outcome = formData.actualOutcome?.trim() || null
  if (formData.whatWorked !== undefined) updates.what_worked = formData.whatWorked?.trim() || null
  if (formData.whatDidNotWork !== undefined) updates.what_did_not_work = formData.whatDidNotWork?.trim() || null
  if (formData.why !== undefined) updates.why = formData.why?.trim() || null
  if (formData.lessons !== undefined) updates.lessons = formData.lessons?.trim() || null
  if (formData.nextChanges !== undefined) updates.next_changes = formData.nextChanges?.trim() || null
  if (formData.summary !== undefined) updates.summary = formData.summary?.trim() || null

  if (formData.status !== undefined) {
    updates.status = formData.status
    if (formData.status === 'completed') {
      updates.completed_at = now
      updates.archived_at = null
    } else if (formData.status === 'draft') {
      updates.completed_at = null
      updates.archived_at = null
    } else if (formData.status === 'archived') {
      updates.archived_at = now
    }
  }

  const { data, error } = await (supabase as any)
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', formData.workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/reviews/${id}`)
  revalidatePath('/vault/reviews')
  revalidatePath('/vault')
  return data as ReviewItem
}

export async function setReviewStatus(
  id: string,
  workspaceId: string,
  status: ReviewStatus
): Promise<ReviewItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const now = new Date().toISOString()
  const updates: any = {
    status,
    updated_at: now,
  }

  if (status === 'completed') {
    updates.completed_at = now
    updates.archived_at = null
  } else if (status === 'draft') {
    updates.completed_at = null
    updates.archived_at = null
  } else if (status === 'archived') {
    updates.archived_at = now
  }

  const { data, error } = await (supabase as any)
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/reviews/${id}`)
  revalidatePath('/vault/reviews')
  revalidatePath('/vault')
  return data as ReviewItem
}

export async function archiveReview(id: string, workspaceId: string): Promise<ReviewItem> {
  return setReviewStatus(id, workspaceId, 'archived')
}

export async function restoreReview(id: string, workspaceId: string): Promise<ReviewItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: current } = await (supabase as any)
    .from('reviews')
    .select('completed_at')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (!current) throw new Error('Review not found or access denied')

  const now = new Date().toISOString()
  const targetStatus: ReviewStatus = current.completed_at ? 'completed' : 'draft'

  const { data, error } = await (supabase as any)
    .from('reviews')
    .update({
      status: targetStatus,
      archived_at: null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/reviews/${id}`)
  revalidatePath('/vault/reviews')
  revalidatePath('/vault')
  return data as ReviewItem
}

// ---------------------------------------------------------------------------
// REVIEW CONNECTIONS (PHASE 2)
// ---------------------------------------------------------------------------

export type ReviewConnectionRelationshipType =
  | 'subject'
  | 'informed_by'
  | 'stakeholder'
  | 'resulted_in'

export interface ReviewConnectionItem {
  id: string
  workspace_id: string
  review_id: string
  project_id: string | null
  opportunity_id: string | null
  research_record_id: string | null
  company_id: string | null
  contact_id: string | null
  relationship_type: ReviewConnectionRelationshipType
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  project?: {
    id: string
    title: string
    status: string
    priority: string
  } | null
  opportunity?: {
    id: string
    title: string
    type: string
    pipeline_stage: string
    value_estimate: number | null
    currency: string | null
  } | null
  research?: {
    id: string
    title: string
    research_question?: string | null
    objective: string | null
    status: string
  } | null
  company?: {
    id: string
    name: string
    industry: string | null
    domain: string | null
  } | null
  contact?: {
    id: string
    full_name: string
    role_title: string | null
    avatar_url?: string | null
    email?: string | null
  } | null
}

// Compatibility matrix: which relationship types are valid for each entity category
const REVIEW_CONNECTION_COMPATIBILITY: Record<string, ReviewConnectionRelationshipType[]> = {
  project: ['subject', 'resulted_in'],
  opportunity: ['subject', 'resulted_in'],
  research: ['informed_by', 'resulted_in'],
  company: ['subject', 'stakeholder'],
  contact: ['subject', 'stakeholder'],
}

const REVIEW_CONNECTION_SELECT = `
  id,
  workspace_id,
  review_id,
  project_id,
  opportunity_id,
  research_record_id,
  company_id,
  contact_id,
  relationship_type,
  notes,
  created_by,
  created_at,
  updated_at,
  workspace_contacts(
    contact:contacts(
      id,
      full_name,
      role_title,
      avatar_url,
      email
    )
  ),
  workspace_companies(
    company:companies(
      id,
      name,
      industry,
      domain
    )
  ),
  opportunity:opportunities(
    id,
    title,
    type,
    pipeline_stage,
    value_estimate,
    currency
  ),
  project:workspace_projects(
    id,
    title,
    status,
    priority
  ),
  research:research_records(
    id,
    title,
    research_question,
    objective,
    status
  )
`

function mapReviewConnectionRow(row: any): ReviewConnectionItem {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    review_id: row.review_id,
    project_id: row.project_id,
    opportunity_id: row.opportunity_id,
    research_record_id: row.research_record_id,
    company_id: row.company_id,
    contact_id: row.contact_id,
    relationship_type: row.relationship_type,
    notes: row.notes,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    contact: row.workspace_contacts?.contact || null,
    company: row.workspace_companies?.company || null,
    opportunity: row.opportunity || null,
    project: row.project || null,
    research: row.research || null,
  }
}

export async function getReviewConnections(
  reviewId: string,
  workspaceId: string
): Promise<ReviewConnectionItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await (supabase as any)
    .from('review_connections')
    .select(REVIEW_CONNECTION_SELECT)
    .eq('review_id', reviewId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map(mapReviewConnectionRow)
}

export async function getReviewConnectableEntities(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Contacts
  const { data: contactsData } = await (supabase as any)
    .from('workspace_contacts')
    .select(`
      contact_id,
      contact:contacts(
        id,
        full_name,
        role_title,
        avatar_url,
        archived_at
      )
    `)
    .eq('workspace_id', workspaceId)

  const contacts = (contactsData || [])
    .filter((c: any) => c.contact && !c.contact.archived_at)
    .map((c: any) => ({
      id: c.contact.id,
      fullName: c.contact.full_name as string,
      roleTitle: (c.contact.role_title || null) as string | null,
      avatarUrl: (c.contact.avatar_url || null) as string | null,
    }))
    .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName))

  // 2. Companies
  const { data: companiesData } = await (supabase as any)
    .from('workspace_companies')
    .select(`
      company_id,
      tier,
      company:companies(
        id,
        name,
        industry,
        domain,
        archived_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .neq('tier', 'archived')

  const companies = (companiesData || [])
    .filter((c: any) => c.company && !c.company.archived_at)
    .map((c: any) => ({
      id: c.company.id,
      name: c.company.name as string,
      industry: (c.company.industry || null) as string | null,
      domain: (c.company.domain || null) as string | null,
      tier: c.tier as string,
    }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name))

  // 3. Opportunities
  const { data: opportunitiesData } = await (supabase as any)
    .from('opportunities')
    .select('id, title, type, pipeline_stage, value_estimate, currency')
    .eq('workspace_id', workspaceId)
    .order('title', { ascending: true })

  const opportunities = (opportunitiesData || []).map((o: any) => ({
    id: o.id,
    title: o.title as string,
    type: o.type as string,
    pipelineStage: o.pipeline_stage as string,
    valueEstimate: (o.value_estimate || null) as number | null,
    currency: (o.currency || 'USD') as string,
  }))

  // 4. Projects
  const { data: projectsData } = await (supabase as any)
    .from('workspace_projects')
    .select('id, title, status, priority')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived')
    .order('title', { ascending: true })

  const projects = (projectsData || []).map((p: any) => ({
    id: p.id,
    title: p.title as string,
    status: p.status as string,
    priority: p.priority as string,
  }))

  // 5. Research records
  const { data: researchData } = await (supabase as any)
    .from('research_records')
    .select('id, title, research_question, objective, status')
    .eq('workspace_id', workspaceId)
    .neq('status', 'archived')
    .order('title', { ascending: true })

  const researchRecords = (researchData || []).map((r: any) => ({
    id: r.id,
    title: r.title as string,
    researchQuestion: (r.research_question || null) as string | null,
    objective: (r.objective || null) as string | null,
    status: r.status as string,
  }))

  return {
    contacts,
    companies,
    opportunities,
    projects,
    researchRecords,
  }
}

export async function createReviewConnection(formData: {
  workspaceId: string
  reviewId: string
  projectId?: string | null
  opportunityId?: string | null
  researchRecordId?: string | null
  companyId?: string | null
  contactId?: string | null
  relationshipType: ReviewConnectionRelationshipType
  notes?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // 1. Verify workspace access
  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', formData.workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  // 2. Verify review exists and belongs to workspace
  const { data: review } = await (supabase as any)
    .from('reviews')
    .select('id, workspace_id')
    .eq('id', formData.reviewId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!review) throw new Error('Review not found or access denied')

  // 3. Enforce exactly one target entity
  const targets = [
    formData.projectId ? { type: 'project', id: formData.projectId } : null,
    formData.opportunityId ? { type: 'opportunity', id: formData.opportunityId } : null,
    formData.researchRecordId ? { type: 'research', id: formData.researchRecordId } : null,
    formData.companyId ? { type: 'company', id: formData.companyId } : null,
    formData.contactId ? { type: 'contact', id: formData.contactId } : null,
  ].filter(Boolean)

  if (targets.length !== 1) {
    throw new Error('Exactly one target entity must be specified')
  }

  const targetType = targets[0]!.type

  // 4. Enforce compatibility matrix
  const compatibleTypes = REVIEW_CONNECTION_COMPATIBILITY[targetType]
  if (!compatibleTypes || !compatibleTypes.includes(formData.relationshipType)) {
    throw new Error(`Relationship type '${formData.relationshipType}' is not valid for ${targetType} entities`)
  }

  // 5. Validate target entity exists within same workspace
  if (formData.contactId) {
    const { data: contact } = await (supabase as any)
      .from('workspace_contacts')
      .select('contact_id')
      .eq('workspace_id', formData.workspaceId)
      .eq('contact_id', formData.contactId)
      .maybeSingle()
    if (!contact) throw new Error('Contact not found or not associated with this workspace')
  } else if (formData.companyId) {
    const { data: company } = await (supabase as any)
      .from('workspace_companies')
      .select('company_id')
      .eq('workspace_id', formData.workspaceId)
      .eq('company_id', formData.companyId)
      .maybeSingle()
    if (!company) throw new Error('Company not found or not associated with this workspace')
  } else if (formData.opportunityId) {
    const { data: opp } = await (supabase as any)
      .from('opportunities')
      .select('id')
      .eq('workspace_id', formData.workspaceId)
      .eq('id', formData.opportunityId)
      .maybeSingle()
    if (!opp) throw new Error('Opportunity not found or not associated with this workspace')
  } else if (formData.projectId) {
    const { data: proj } = await (supabase as any)
      .from('workspace_projects')
      .select('id')
      .eq('workspace_id', formData.workspaceId)
      .eq('id', formData.projectId)
      .maybeSingle()
    if (!proj) throw new Error('Project not found or not associated with this workspace')
  } else if (formData.researchRecordId) {
    const { data: rec } = await (supabase as any)
      .from('research_records')
      .select('id')
      .eq('workspace_id', formData.workspaceId)
      .eq('id', formData.researchRecordId)
      .maybeSingle()
    if (!rec) throw new Error('Research record not found or not associated with this workspace')
  }

  // 6. Insert connection
  const { data, error } = await (supabase as any)
    .from('review_connections')
    .insert({
      workspace_id: formData.workspaceId,
      review_id: formData.reviewId,
      project_id: formData.projectId || null,
      opportunity_id: formData.opportunityId || null,
      research_record_id: formData.researchRecordId || null,
      company_id: formData.companyId || null,
      contact_id: formData.contactId || null,
      relationship_type: formData.relationshipType,
      notes: formData.notes?.trim() || null,
      created_by: user.id,
    })
    .select(REVIEW_CONNECTION_SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This entity is already connected to this review')
    }
    if (error.code === '23514') {
      throw new Error('Invalid entity/relationship combination. Check compatibility matrix.')
    }
    throw new Error(error.message)
  }

  revalidatePath(`/vault/reviews/${formData.reviewId}`)
  revalidatePath('/vault/reviews')

  return mapReviewConnectionRow(data)
}

export async function updateReviewConnection(
  connectionId: string,
  formData: {
    workspaceId: string
    relationshipType?: ReviewConnectionRelationshipType
    notes?: string | null
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

  // Verify connection belongs to workspace and get current data for compatibility check
  const { data: existing } = await (supabase as any)
    .from('review_connections')
    .select('id, review_id, workspace_id, project_id, opportunity_id, research_record_id, company_id, contact_id')
    .eq('id', connectionId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Connection not found or access denied')

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.relationshipType !== undefined) {
    // Determine entity category for compatibility check
    let entityCategory = ''
    if (existing.project_id) entityCategory = 'project'
    else if (existing.opportunity_id) entityCategory = 'opportunity'
    else if (existing.research_record_id) entityCategory = 'research'
    else if (existing.company_id) entityCategory = 'company'
    else if (existing.contact_id) entityCategory = 'contact'

    const compatibleTypes = REVIEW_CONNECTION_COMPATIBILITY[entityCategory]
    if (!compatibleTypes || !compatibleTypes.includes(formData.relationshipType)) {
      throw new Error(`Relationship type '${formData.relationshipType}' is not valid for ${entityCategory} entities`)
    }
    updates.relationship_type = formData.relationshipType
  }

  if (formData.notes !== undefined) {
    updates.notes = formData.notes ? formData.notes.trim() : null
  }

  const { data, error } = await (supabase as any)
    .from('review_connections')
    .update(updates)
    .eq('id', connectionId)
    .eq('workspace_id', formData.workspaceId)
    .select(REVIEW_CONNECTION_SELECT)
    .single()

  if (error) {
    if (error.code === '23514') {
      throw new Error('Invalid entity/relationship combination. Check compatibility matrix.')
    }
    throw new Error(error.message)
  }

  revalidatePath(`/vault/reviews/${existing.review_id}`)
  revalidatePath('/vault/reviews')

  return mapReviewConnectionRow(data)
}

export async function deleteReviewConnection(connectionId: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: ws } = await (supabase as any)
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()
  if (!ws) throw new Error('Workspace not found or access denied')

  const { data: existing } = await (supabase as any)
    .from('review_connections')
    .select('id, review_id')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Connection not found or access denied')

  const { error } = await (supabase as any)
    .from('review_connections')
    .delete()
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/reviews/${existing.review_id}`)
  revalidatePath('/vault/reviews')
  return true
}

export type RelatedReviewEntityType = 'contact' | 'company' | 'opportunity' | 'project' | 'research'

export interface RelatedReviewItem {
  id: string
  review_id: string
  relationship_type: string
  notes: string | null
  created_at: string
  review: {
    id: string
    workspace_id: string
    title: string
    review_type: ReviewType
    status: ReviewStatus
    period_start: string | null
    period_end: string | null
    summary: string | null
    created_at: string
    updated_at: string
    archived_at: string | null
    completed_at: string | null
  }
}

export async function getRelatedReviewsForEntity(
  workspaceId: string,
  entityType: RelatedReviewEntityType,
  entityId: string
): Promise<RelatedReviewItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. Verify workspace membership
  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return []

  // 2. Verify target entity exists in workspace
  if (entityType === 'contact') {
    const { data: contact } = await (supabase as any)
      .from('workspace_contacts')
      .select('contact_id')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', entityId)
      .maybeSingle()
    if (!contact) return []
  } else if (entityType === 'company') {
    const { data: company } = await (supabase as any)
      .from('workspace_companies')
      .select('company_id')
      .eq('workspace_id', workspaceId)
      .eq('company_id', entityId)
      .maybeSingle()
    if (!company) return []
  } else if (entityType === 'opportunity') {
    const { data: opp } = await (supabase as any)
      .from('opportunities')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', entityId)
      .maybeSingle()
    if (!opp) return []
  } else if (entityType === 'project') {
    const { data: proj } = await (supabase as any)
      .from('workspace_projects')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', entityId)
      .maybeSingle()
    if (!proj) return []
  } else if (entityType === 'research') {
    const { data: res } = await (supabase as any)
      .from('research_records')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('id', entityId)
      .maybeSingle()
    if (!res) return []
  } else {
    return []
  }

  // 3. Map entityType to target column
  const columnMap: Record<RelatedReviewEntityType, string> = {
    contact: 'contact_id',
    company: 'company_id',
    opportunity: 'opportunity_id',
    project: 'project_id',
    research: 'research_record_id',
  }
  const targetCol = columnMap[entityType]

  // 4. Query review_connections and join reviews
  const { data, error } = await (supabase as any)
    .from('review_connections')
    .select(`
      id,
      relationship_type,
      notes,
      created_at,
      review:reviews(
        id,
        workspace_id,
        title,
        review_type,
        status,
        period_start,
        period_end,
        summary,
        created_at,
        updated_at,
        archived_at,
        completed_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .eq(targetCol, entityId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data
    .filter((row: any) => row.review && row.review.id)
    .map((row: any) => ({
      id: row.id,
      review_id: row.review.id,
      relationship_type: row.relationship_type,
      notes: row.notes,
      created_at: row.created_at,
      review: row.review,
    }))
}

// ---------------------------------------------------------------------------
// METRICS & PERFORMANCE (PHASE 1)
// ---------------------------------------------------------------------------

export type MetricCategory =
  | 'growth'
  | 'financial'
  | 'operational'
  | 'product'
  | 'marketing'
  | 'community'
  | 'other'

export type MetricUnitType =
  | 'count'
  | 'currency'
  | 'percentage'
  | 'duration'
  | 'score'

export type MetricDirection =
  | 'higher_is_better'
  | 'lower_is_better'
  | 'neutral'

export type MetricMeasurementType =
  | 'point'
  | 'period'

export type MetricCadence =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'ad_hoc'

export type MetricStatus =
  | 'active'
  | 'paused'
  | 'archived'

export interface WorkspaceMetricItem {
  id: string
  workspace_id: string
  project_id: string | null
  name: string
  key: string
  description: string | null
  category: MetricCategory
  unit_type: MetricUnitType
  unit_symbol: string | null
  direction: MetricDirection
  measurement_type: MetricMeasurementType
  cadence: MetricCadence | null
  status: MetricStatus
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  project?: {
    id: string
    title: string
  } | null
  latest_observation?: MetricObservationItem | null
  current_target?: MetricTargetItem | null
  // Derived runtime helpers
  current_actual?: number | null
  current_target_value?: number | null
  active_target?: MetricTargetItem | null
  attainment_rate?: number | null
  observations_count?: number
  targets_count?: number
}

export interface WorkspaceMetricDetail extends WorkspaceMetricItem {
  targets: MetricTargetItem[]
  observations: MetricObservationItem[]
}

export interface MetricTargetItem {
  id: string
  workspace_id: string
  metric_id: string
  target_value: number
  baseline_value: number | null
  period_start: string | null
  period_end: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MetricObservationItem {
  id: string
  workspace_id: string
  metric_id: string
  value: number
  observed_at: string
  period_start: string | null
  period_end: string | null
  notes: string | null
  source_label: string | null
  source_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

function calculateAttainment(
  actual: number | null | undefined,
  target: number | null | undefined,
  direction: MetricDirection,
  baseline?: number | null | undefined
): number | null {
  if (actual === null || actual === undefined || target === null || target === undefined) {
    return null
  }
  const act = Number(actual)
  const tgt = Number(target)
  if (isNaN(act) || isNaN(tgt)) return null

  if (direction === 'neutral') {
    if (tgt === 0) return 100
    return Math.round((act / tgt) * 1000) / 10
  }

  if (direction === 'lower_is_better') {
    if (act <= tgt) {
      if (act === 0) return 100
      return Math.round((tgt / act) * 1000) / 10
    }
    return Math.max(0, Math.round((tgt / act) * 1000) / 10)
  }

  // higher_is_better (default)
  if (baseline !== null && baseline !== undefined && !isNaN(Number(baseline))) {
    const base = Number(baseline)
    const needed = tgt - base
    if (needed > 0) {
      const progress = act - base
      return Math.max(0, Math.round((progress / needed) * 1000) / 10)
    }
  }

  if (tgt === 0) return act >= 0 ? 100 : 0
  return Math.max(0, Math.round((act / tgt) * 1000) / 10)
}

/**
 * Resolves the current/relevant target from a list of targets for a metric.
 *
 * Rules:
 * Priority 1: Current bounded target where (period_start is null or <= today) AND (period_end is null or >= today).
 *             Among those, prefer bounded targets with dates, tie-broken by most recent created_at.
 * Priority 2: Open-ended target where period_start IS NULL AND period_end IS NULL.
 *             Prefer most recently created.
 * Priority 3: Historical target (ended in the past).
 *             Prefer most recently ended (period_end DESC, created_at DESC).
 * Note: Future targets (period_start > today) are never considered current before their period begins.
 */
function normalizeDateStr(d: any): string | null {
  if (!d) return null
  if (d instanceof Date) return d.toISOString().split('T')[0]
  if (typeof d === 'string') return d.includes('T') ? d.split('T')[0] : d
  return String(d)
}

function resolveCurrentTarget(targets: MetricTargetItem[], todayStr?: string): MetricTargetItem | null {
  if (!targets || targets.length === 0) return null

  const today = todayStr || new Date().toISOString().split('T')[0]

  // Filter 1: Valid current-period candidates
  // Must satisfy: (start is null or <= today) AND (end is null or >= today)
  const currentCandidates = targets.filter((t) => {
    const startStr = normalizeDateStr(t.period_start)
    const endStr = normalizeDateStr(t.period_end)
    const validStart = !startStr || startStr <= today
    const validEnd = !endStr || endStr >= today
    return validStart && validEnd
  })

  // Priority 1: Current bounded target (at least one of period_start or period_end is provided)
  const boundedCurrent = currentCandidates.filter((t) => t.period_start || t.period_end)
  if (boundedCurrent.length > 0) {
    // Prefer fully bounded (both start & end), then partially bounded, then newest created_at
    boundedCurrent.sort((a, b) => {
      const aSpecificity = (a.period_start && a.period_end) ? 2 : 1
      const bSpecificity = (b.period_start && b.period_end) ? 2 : 1
      if (bSpecificity !== aSpecificity) return bSpecificity - aSpecificity
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return boundedCurrent[0]
  }

  // Priority 2: Open-ended target (both period_start and period_end are null)
  const openEnded = targets.filter((t) => !t.period_start && !t.period_end)
  if (openEnded.length > 0) {
    openEnded.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return openEnded[0]
  }

  // Priority 3: Historical target (already ended: period_end < today)
  const historical = targets.filter((t) => {
    const endStr = normalizeDateStr(t.period_end)
    return endStr && endStr < today
  })
  if (historical.length > 0) {
    historical.sort((a, b) => {
      const aEnd = normalizeDateStr(a.period_end) || ''
      const bEnd = normalizeDateStr(b.period_end) || ''
      if (aEnd !== bEnd) {
        return bEnd.localeCompare(aEnd)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return historical[0]
  }

  // If all remaining targets are in the future, do not label them current before their period begins
  return null
}

export async function getWorkspaceMetrics(
  workspaceId: string,
  options?: {
    status?: string
    category?: string
    direction?: string
    measurementType?: string
    cadence?: string
    search?: string
    projectId?: string
  }
): Promise<WorkspaceMetricItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  let query = (supabase as any)
    .from('workspace_metrics')
    .select(`
      id,
      workspace_id,
      project_id,
      name,
      key,
      description,
      category,
      unit_type,
      unit_symbol,
      direction,
      measurement_type,
      cadence,
      status,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(
        id,
        title
      )
    `)
    .eq('workspace_id', workspaceId)

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status)
  } else if (!options?.status) {
    query = query.neq('status', 'archived')
  }

  if (options?.category && options.category !== 'all') {
    query = query.eq('category', options.category)
  }

  if (options?.direction && options.direction !== 'all') {
    query = query.eq('direction', options.direction)
  }

  if (options?.measurementType && options.measurementType !== 'all') {
    query = query.eq('measurement_type', options.measurementType)
  }

  if (options?.cadence && options.cadence !== 'all') {
    query = query.eq('cadence', options.cadence)
  }

  if (options?.projectId && options.projectId !== 'all') {
    query = query.eq('project_id', options.projectId)
  }

  if (options?.search) {
    const s = options.search.trim()
    query = query.or(`name.ilike.%${s}%,key.ilike.%${s}%,description.ilike.%${s}%`)
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const metrics: WorkspaceMetricItem[] = data || []
  if (metrics.length === 0) return []

  const metricIds = metrics.map((m) => m.id)

  // Fetch observations for metrics
  const { data: obsData } = await (supabase as any)
    .from('workspace_metric_observations')
    .select('*')
    .in('metric_id', metricIds)
    .eq('workspace_id', workspaceId)
    .order('observed_at', { ascending: false })
    .order('created_at', { ascending: false })

  const obsByMetric: Record<string, MetricObservationItem> = {}
  const obsCountByMetric: Record<string, number> = {}
  for (const obs of obsData || []) {
    obsCountByMetric[obs.metric_id] = (obsCountByMetric[obs.metric_id] || 0) + 1
    if (!obsByMetric[obs.metric_id]) {
      obsByMetric[obs.metric_id] = {
        ...obs,
        value: Number(obs.value),
      }
    }
  }

  // Fetch targets for metrics
  const { data: targetData } = await (supabase as any)
    .from('workspace_metric_targets')
    .select('*')
    .in('metric_id', metricIds)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  const targetsByMetric: Record<string, MetricTargetItem[]> = {}
  for (const t of targetData || []) {
    if (!targetsByMetric[t.metric_id]) {
      targetsByMetric[t.metric_id] = []
    }
    targetsByMetric[t.metric_id].push({
      ...t,
      target_value: Number(t.target_value),
      baseline_value: t.baseline_value !== null ? Number(t.baseline_value) : null,
      period_start: normalizeDateStr(t.period_start),
      period_end: normalizeDateStr(t.period_end),
    })
  }

  return metrics.map((m) => {
    const latestObs = obsByMetric[m.id] || null
    const mTargets = targetsByMetric[m.id] || []
    const currentTarget = resolveCurrentTarget(mTargets)
    const actualVal = latestObs ? latestObs.value : null
    const targetVal = currentTarget ? currentTarget.target_value : null
    const attainment = calculateAttainment(
      actualVal,
      targetVal,
      m.direction,
      currentTarget?.baseline_value
    )

    return {
      ...m,
      latest_observation: latestObs,
      current_target: currentTarget,
      current_actual: actualVal,
      current_target_value: targetVal,
      active_target: currentTarget,
      attainment_rate: attainment,
      observations_count: obsCountByMetric[m.id] || 0,
      targets_count: mTargets.length,
    }
  })
}

export async function getWorkspaceMetricDetail(
  id: string,
  workspaceId: string
): Promise<WorkspaceMetricDetail> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await (supabase as any)
    .from('workspace_metrics')
    .select(`
      id,
      workspace_id,
      project_id,
      name,
      key,
      description,
      category,
      unit_type,
      unit_symbol,
      direction,
      measurement_type,
      cadence,
      status,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(
        id,
        title
      )
    `)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Metric not found or access denied')

  // Fetch all targets and observations for this metric
  const [targets, observations] = await Promise.all([
    getMetricTargets(id, workspaceId),
    getMetricObservations(id, workspaceId),
  ])

  const latestObs = observations[0] || null
  const currentTarget = resolveCurrentTarget(targets)
  const actualVal = latestObs ? latestObs.value : null
  const targetVal = currentTarget ? currentTarget.target_value : null
  const attainment = calculateAttainment(
    actualVal,
    targetVal,
    data.direction,
    currentTarget?.baseline_value
  )

  return {
    ...data,
    targets,
    observations,
    latest_observation: latestObs,
    current_target: currentTarget,
    current_actual: actualVal,
    current_target_value: targetVal,
    active_target: currentTarget,
    attainment_rate: attainment,
    observations_count: observations.length,
    targets_count: targets.length,
  } as WorkspaceMetricDetail
}

export async function createWorkspaceMetric(formData: {
  workspaceId: string
  projectId?: string | null
  name: string
  key: string
  description?: string | null
  category: MetricCategory
  unitType: MetricUnitType
  unitSymbol?: string | null
  direction: MetricDirection
  measurementType: MetricMeasurementType
  cadence?: MetricCadence | null
}): Promise<WorkspaceMetricItem> {
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

  // If projectId supplied, verify it belongs to this workspace
  if (formData.projectId) {
    const { data: proj } = await (supabase as any)
      .from('workspace_projects')
      .select('id')
      .eq('id', formData.projectId)
      .eq('workspace_id', formData.workspaceId)
      .maybeSingle()
    if (!proj) throw new Error('Project not found or not in this workspace')
  }

  // Format machine key
  const cleanKey = formData.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')

  const { data, error } = await (supabase as any)
    .from('workspace_metrics')
    .insert({
      workspace_id: formData.workspaceId,
      project_id: formData.projectId || null,
      name: formData.name.trim(),
      key: cleanKey,
      description: formData.description?.trim() || null,
      category: formData.category,
      unit_type: formData.unitType,
      unit_symbol: formData.unitSymbol?.trim() || null,
      direction: formData.direction,
      measurement_type: formData.measurementType,
      cadence: formData.cadence || null,
      status: 'active',
      created_by: user.id,
    })
    .select(`
      id,
      workspace_id,
      project_id,
      name,
      key,
      description,
      category,
      unit_type,
      unit_symbol,
      direction,
      measurement_type,
      cadence,
      status,
      created_by,
      created_at,
      updated_at,
      archived_at
    `)
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`A metric with key '${cleanKey}' already exists in this workspace`)
    }
    throw new Error(error.message)
  }

  revalidatePath('/vault/metrics')
  return data as WorkspaceMetricItem
}

export async function updateWorkspaceMetric(
  id: string,
  workspaceId: string,
  formData: {
    projectId?: string | null
    name?: string
    description?: string | null
    category?: MetricCategory
    unitType?: MetricUnitType
    unitSymbol?: string | null
    direction?: MetricDirection
    measurementType?: MetricMeasurementType
    cadence?: MetricCadence | null
  }
): Promise<WorkspaceMetricItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify metric exists in workspace
  const { data: existing } = await (supabase as any)
    .from('workspace_metrics')
    .select('id')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Metric not found or access denied')

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.name !== undefined) updates.name = formData.name.trim()
  if (formData.description !== undefined) updates.description = formData.description?.trim() || null
  if (formData.category !== undefined) updates.category = formData.category
  if (formData.unitType !== undefined) updates.unit_type = formData.unitType
  if (formData.unitSymbol !== undefined) updates.unit_symbol = formData.unitSymbol?.trim() || null
  if (formData.direction !== undefined) updates.direction = formData.direction
  if (formData.measurementType !== undefined) updates.measurement_type = formData.measurementType
  if (formData.cadence !== undefined) updates.cadence = formData.cadence || null

  if (formData.projectId !== undefined) {
    if (formData.projectId) {
      const { data: proj } = await (supabase as any)
        .from('workspace_projects')
        .select('id')
        .eq('id', formData.projectId)
        .eq('workspace_id', workspaceId)
        .maybeSingle()
      if (!proj) throw new Error('Project not found or not in this workspace')
      updates.project_id = formData.projectId
    } else {
      updates.project_id = null
    }
  }

  const { data, error } = await (supabase as any)
    .from('workspace_metrics')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select(`
      id,
      workspace_id,
      project_id,
      name,
      key,
      description,
      category,
      unit_type,
      unit_symbol,
      direction,
      measurement_type,
      cadence,
      status,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(
        id,
        title
      )
    `)
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/metrics')
  revalidatePath(`/vault/metrics/${id}`)
  return data as WorkspaceMetricItem
}

export async function archiveWorkspaceMetric(id: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await (supabase as any)
    .from('workspace_metrics')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('id, status')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/metrics')
  revalidatePath(`/vault/metrics/${id}`)
  return data
}

export async function restoreWorkspaceMetric(id: string, workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await (supabase as any)
    .from('workspace_metrics')
    .update({
      status: 'active',
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('id, status')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath('/vault/metrics')
  revalidatePath(`/vault/metrics/${id}`)
  return data
}

// ---------------------------------------------------------------------------
// TARGETS ACTIONS
// ---------------------------------------------------------------------------

export async function getMetricTargets(
  metricId: string,
  workspaceId: string
): Promise<MetricTargetItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await (supabase as any)
    .from('workspace_metric_targets')
    .select('*')
    .eq('metric_id', metricId)
    .eq('workspace_id', workspaceId)
    .order('period_end', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((t: any) => ({
    ...t,
    target_value: Number(t.target_value),
    baseline_value: t.baseline_value !== null ? Number(t.baseline_value) : null,
    period_start: normalizeDateStr(t.period_start),
    period_end: normalizeDateStr(t.period_end),
  }))
}

export async function createMetricTarget(formData: {
  workspaceId: string
  metricId: string
  targetValue: number
  baselineValue?: number | null
  periodStart?: string | null
  periodEnd?: string | null
  notes?: string | null
}): Promise<MetricTargetItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify metric exists in workspace
  const { data: metric } = await (supabase as any)
    .from('workspace_metrics')
    .select('id')
    .eq('id', formData.metricId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!metric) throw new Error('Metric not found or access denied')

  if (formData.periodStart && formData.periodEnd && formData.periodEnd < formData.periodStart) {
    throw new Error('Target period end date cannot be earlier than start date')
  }

  const { data, error } = await (supabase as any)
    .from('workspace_metric_targets')
    .insert({
      workspace_id: formData.workspaceId,
      metric_id: formData.metricId,
      target_value: formData.targetValue,
      baseline_value: formData.baselineValue !== undefined && formData.baselineValue !== null ? formData.baselineValue : null,
      period_start: formData.periodStart || null,
      period_end: formData.periodEnd || null,
      notes: formData.notes?.trim() || null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/metrics/${formData.metricId}`)
  revalidatePath('/vault/metrics')
  return {
    ...data,
    target_value: Number(data.target_value),
    baseline_value: data.baseline_value !== null ? Number(data.baseline_value) : null,
  }
}

export async function updateMetricTarget(
  id: string,
  workspaceId: string,
  formData: {
    targetValue?: number
    baselineValue?: number | null
    periodStart?: string | null
    periodEnd?: string | null
    notes?: string | null
  }
): Promise<MetricTargetItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await (supabase as any)
    .from('workspace_metric_targets')
    .select('id, metric_id, period_start, period_end')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Target not found or access denied')

  const pStart = formData.periodStart !== undefined ? formData.periodStart : existing.period_start
  const pEnd = formData.periodEnd !== undefined ? formData.periodEnd : existing.period_end
  if (pStart && pEnd && pEnd < pStart) {
    throw new Error('Target period end date cannot be earlier than start date')
  }

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.targetValue !== undefined) updates.target_value = formData.targetValue
  if (formData.baselineValue !== undefined) updates.baseline_value = formData.baselineValue
  if (formData.periodStart !== undefined) updates.period_start = formData.periodStart || null
  if (formData.periodEnd !== undefined) updates.period_end = formData.periodEnd || null
  if (formData.notes !== undefined) updates.notes = formData.notes?.trim() || null

  const { data, error } = await (supabase as any)
    .from('workspace_metric_targets')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/metrics/${existing.metric_id}`)
  revalidatePath('/vault/metrics')
  return {
    ...data,
    target_value: Number(data.target_value),
    baseline_value: data.baseline_value !== null ? Number(data.baseline_value) : null,
  }
}

// ---------------------------------------------------------------------------
// OBSERVATIONS ACTIONS
// ---------------------------------------------------------------------------

export async function getMetricObservations(
  metricId: string,
  workspaceId: string
): Promise<MetricObservationItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await (supabase as any)
    .from('workspace_metric_observations')
    .select('*')
    .eq('metric_id', metricId)
    .eq('workspace_id', workspaceId)
    .order('observed_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data || []).map((o: any) => ({
    ...o,
    value: Number(o.value),
  }))
}

export async function createMetricObservation(formData: {
  workspaceId: string
  metricId: string
  value: number
  observedAt?: string
  periodStart?: string | null
  periodEnd?: string | null
  notes?: string | null
  sourceLabel?: string | null
  sourceUrl?: string | null
}): Promise<MetricObservationItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify metric exists in workspace
  const { data: metric } = await (supabase as any)
    .from('workspace_metrics')
    .select('id')
    .eq('id', formData.metricId)
    .eq('workspace_id', formData.workspaceId)
    .maybeSingle()
  if (!metric) throw new Error('Metric not found or access denied')

  if (formData.periodStart && formData.periodEnd && formData.periodEnd < formData.periodStart) {
    throw new Error('Observation period end date cannot be earlier than start date')
  }

  const { data, error } = await (supabase as any)
    .from('workspace_metric_observations')
    .insert({
      workspace_id: formData.workspaceId,
      metric_id: formData.metricId,
      value: formData.value,
      observed_at: formData.observedAt || new Date().toISOString().split('T')[0],
      period_start: formData.periodStart || null,
      period_end: formData.periodEnd || null,
      notes: formData.notes?.trim() || null,
      source_label: formData.sourceLabel?.trim() || null,
      source_url: formData.sourceUrl?.trim() || null,
      created_by: user.id,
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/metrics/${formData.metricId}`)
  revalidatePath('/vault/metrics')
  return {
    ...data,
    value: Number(data.value),
  }
}

export async function updateMetricObservation(
  id: string,
  workspaceId: string,
  formData: {
    value?: number
    observedAt?: string
    periodStart?: string | null
    periodEnd?: string | null
    notes?: string | null
    sourceLabel?: string | null
    sourceUrl?: string | null
  }
): Promise<MetricObservationItem> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: existing } = await (supabase as any)
    .from('workspace_metric_observations')
    .select('id, metric_id, period_start, period_end')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (!existing) throw new Error('Observation not found or access denied')

  const pStart = formData.periodStart !== undefined ? formData.periodStart : existing.period_start
  const pEnd = formData.periodEnd !== undefined ? formData.periodEnd : existing.period_end
  if (pStart && pEnd && pEnd < pStart) {
    throw new Error('Observation period end date cannot be earlier than start date')
  }

  const updates: any = {
    updated_at: new Date().toISOString(),
  }

  if (formData.value !== undefined) updates.value = formData.value
  if (formData.observedAt !== undefined) updates.observed_at = formData.observedAt
  if (formData.periodStart !== undefined) updates.period_start = formData.periodStart || null
  if (formData.periodEnd !== undefined) updates.period_end = formData.periodEnd || null
  if (formData.notes !== undefined) updates.notes = formData.notes?.trim() || null
  if (formData.sourceLabel !== undefined) updates.source_label = formData.sourceLabel?.trim() || null
  if (formData.sourceUrl !== undefined) updates.source_url = formData.sourceUrl?.trim() || null

  const { data, error } = await (supabase as any)
    .from('workspace_metric_observations')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(`/vault/metrics/${existing.metric_id}`)
  revalidatePath('/vault/metrics')
  return {
    ...data,
    value: Number(data.value),
  }
}
