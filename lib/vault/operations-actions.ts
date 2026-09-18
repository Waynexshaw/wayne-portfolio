'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  Meeting,
  MeetingType,
  MeetingStatus,
  MeetingParticipant,
  ParticipantRole,
  Decision,
  Task,
  TaskStatus,
  TaskPriority,
  OperationsStats,
} from './operations/types'

// Helper to verify user and workspace membership
async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: membership } = await (supabase as any)
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) throw new Error('Unauthorized')
  return { supabase, user, role: membership.role }
}

// ==========================================
// 1. TASKS ACTIONS
// ==========================================

export async function getTasksAction(
  workspaceId: string,
  filters?: {
    projectId?: string
    meetingId?: string
    decisionId?: string
    status?: TaskStatus
    priority?: TaskPriority
    search?: string
    includeArchived?: boolean
  }
): Promise<Task[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  let query = (supabase as any)
    .from('tasks')
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      decision_id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title),
      decision:decisions(id, title)
    `)
    .eq('workspace_id', workspaceId)

  if (!filters?.includeArchived) {
    query = query.is('archived_at', null)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.meetingId) {
    query = query.eq('meeting_id', filters.meetingId)
  }

  if (filters?.decisionId) {
    query = query.eq('decision_id', filters.decisionId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }

  if (filters?.search && filters.search.trim() !== '') {
    const term = `%${filters.search.trim()}%`
    query = query.or(`title.ilike.${term},description.ilike.${term}`)
  }

  query = query
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) {
    console.error('Error fetching tasks:', error)
    throw new Error('Failed to fetch tasks')
  }

  return (data || []).map((t: any) => ({
    ...t,
    project: Array.isArray(t.project) ? t.project[0] || null : t.project,
    meeting: Array.isArray(t.meeting) ? t.meeting[0] || null : t.meeting,
    decision: Array.isArray(t.decision) ? t.decision[0] || null : t.decision,
  }))
}

export async function createTaskAction(
  workspaceId: string,
  input: {
    title: string
    description?: string | null
    status?: TaskStatus
    priority?: TaskPriority
    due_date?: string | null
    project_id?: string | null
    meeting_id?: string | null
    decision_id?: string | null
  }
): Promise<Task> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const trimmedTitle = input.title.trim()
  if (!trimmedTitle) {
    throw new Error('Task title cannot be empty')
  }

  const insertPayload: any = {
    workspace_id: workspaceId,
    title: trimmedTitle,
    description: input.description?.trim() || null,
    status: input.status || 'todo',
    priority: input.priority || 'medium',
    due_date: input.due_date || null,
    project_id: input.project_id || null,
    meeting_id: input.meeting_id || null,
    decision_id: input.decision_id || null,
    created_by: user.id,
  }

  const { data, error } = await (supabase as any)
    .from('tasks')
    .insert(insertPayload)
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      decision_id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title),
      decision:decisions(id, title)
    `)
    .single()

  if (error || !data) {
    console.error('Error creating task:', error)
    throw new Error(error?.message || 'Failed to create task')
  }

  revalidatePath('/vault/operations')
  if (input.project_id) revalidatePath(`/vault/projects/${input.project_id}`)
  if (input.meeting_id) revalidatePath(`/vault/operations/meetings/${input.meeting_id}`)
  if (input.decision_id) revalidatePath(`/vault/operations/decisions/${input.decision_id}`)
  revalidatePath('/vault')

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    meeting: Array.isArray(data.meeting) ? data.meeting[0] || null : data.meeting,
    decision: Array.isArray(data.decision) ? data.decision[0] || null : data.decision,
  }
}

export async function updateTaskAction(
  workspaceId: string,
  taskId: string,
  input: {
    title?: string
    description?: string | null
    status?: TaskStatus
    priority?: TaskPriority
    due_date?: string | null
    project_id?: string | null
    meeting_id?: string | null
    decision_id?: string | null
  }
): Promise<Task> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const updatePayload: any = {}
  if (input.title !== undefined) {
    const trimmed = input.title.trim()
    if (!trimmed) throw new Error('Task title cannot be empty')
    updatePayload.title = trimmed
  }
  if (input.description !== undefined) {
    updatePayload.description = input.description ? input.description.trim() : null
  }
  if (input.status !== undefined) {
    updatePayload.status = input.status
  }
  if (input.priority !== undefined) {
    updatePayload.priority = input.priority
  }
  if (input.due_date !== undefined) {
    updatePayload.due_date = input.due_date || null
  }
  if (input.project_id !== undefined) {
    updatePayload.project_id = input.project_id || null
  }
  if (input.meeting_id !== undefined) {
    updatePayload.meeting_id = input.meeting_id || null
  }
  if (input.decision_id !== undefined) {
    updatePayload.decision_id = input.decision_id || null
  }

  const { data, error } = await (supabase as any)
    .from('tasks')
    .update(updatePayload)
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      decision_id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title),
      decision:decisions(id, title)
    `)
    .single()

  if (error || !data) {
    console.error('Error updating task:', error)
    throw new Error(error?.message || 'Failed to update task')
  }

  revalidatePath('/vault/operations')
  if (data.project_id) revalidatePath(`/vault/projects/${data.project_id}`)
  if (data.meeting_id) revalidatePath(`/vault/operations/meetings/${data.meeting_id}`)
  if (data.decision_id) revalidatePath(`/vault/operations/decisions/${data.decision_id}`)
  revalidatePath('/vault')

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    meeting: Array.isArray(data.meeting) ? data.meeting[0] || null : data.meeting,
    decision: Array.isArray(data.decision) ? data.decision[0] || null : data.decision,
  }
}

export async function toggleTaskCompleteAction(
  workspaceId: string,
  taskId: string
): Promise<Task> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  // Fetch current status
  const { data: current, error: getErr } = await (supabase as any)
    .from('tasks')
    .select('id, status, project_id, meeting_id, decision_id')
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)
    .single()

  if (getErr || !current) throw new Error('Task not found')

  const nextStatus: TaskStatus = current.status === 'completed' ? 'todo' : 'completed'

  const { data, error } = await (supabase as any)
    .from('tasks')
    .update({ status: nextStatus })
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      decision_id,
      title,
      description,
      status,
      priority,
      due_date,
      completed_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title),
      decision:decisions(id, title)
    `)
    .single()

  if (error || !data) {
    console.error('Error toggling task completion:', error)
    throw new Error(error?.message || 'Failed to toggle task')
  }

  revalidatePath('/vault/operations')
  if (current.project_id) revalidatePath(`/vault/projects/${current.project_id}`)
  revalidatePath('/vault')

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    meeting: Array.isArray(data.meeting) ? data.meeting[0] || null : data.meeting,
    decision: Array.isArray(data.decision) ? data.decision[0] || null : data.decision,
  }
}

export async function archiveTaskAction(workspaceId: string, taskId: string): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/operations')
  revalidatePath('/vault')
}

export async function restoreTaskAction(workspaceId: string, taskId: string): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('tasks')
    .update({ archived_at: null })
    .eq('id', taskId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/operations')
  revalidatePath('/vault')
}

// ==========================================
// 2. MEETINGS ACTIONS
// ==========================================

export async function getMeetingsAction(
  workspaceId: string,
  filters?: {
    projectId?: string
    companyId?: string
    status?: MeetingStatus
    search?: string
    includeArchived?: boolean
  }
): Promise<Meeting[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  let query = (supabase as any)
    .from('meetings')
    .select(`
      id,
      workspace_id,
      project_id,
      company_id,
      title,
      meeting_type,
      status,
      scheduled_at,
      ended_at,
      location_or_channel,
      agenda,
      notes,
      outcomes,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      company:companies(id, name),
      participants:meeting_participants(
        id,
        workspace_id,
        meeting_id,
        contact_id,
        guest_name,
        guest_email,
        role,
        created_at,
        contact:contacts(id, full_name, email, role_title)
      )
    `)
    .eq('workspace_id', workspaceId)

  if (!filters?.includeArchived) {
    query = query.is('archived_at', null)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.companyId) {
    query = query.eq('company_id', filters.companyId)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.search && filters.search.trim() !== '') {
    const term = `%${filters.search.trim()}%`
    query = query.or(`title.ilike.${term},location_or_channel.ilike.${term},agenda.ilike.${term},notes.ilike.${term},outcomes.ilike.${term}`)
  }

  query = query.order('scheduled_at', { ascending: false })

  const { data, error } = await query
  if (error) {
    console.error('Error fetching meetings:', error)
    throw new Error('Failed to fetch meetings')
  }

  return (data || []).map((m: any) => ({
    ...m,
    project: Array.isArray(m.project) ? m.project[0] || null : m.project,
    company: Array.isArray(m.company) ? m.company[0] || null : m.company,
    participants_count: Array.isArray(m.participants) ? m.participants.length : 0,
  }))
}

export async function getMeetingDetailAction(
  workspaceId: string,
  meetingId: string
): Promise<Meeting> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('meetings')
    .select(`
      id,
      workspace_id,
      project_id,
      company_id,
      title,
      meeting_type,
      status,
      scheduled_at,
      ended_at,
      location_or_channel,
      agenda,
      notes,
      outcomes,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      company:companies(id, name),
      participants:meeting_participants(
        id,
        workspace_id,
        meeting_id,
        contact_id,
        guest_name,
        guest_email,
        role,
        created_at,
        contact:contacts(id, full_name, email, role_title)
      )
    `)
    .eq('id', meetingId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) {
    console.error('Error fetching meeting detail:', error)
    throw new Error('Meeting not found')
  }

  // Count linked tasks and decisions
  const [{ count: tasksCount }, { count: decisionsCount }] = await Promise.all([
    (supabase as any)
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('meeting_id', meetingId)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null),
    (supabase as any)
      .from('decisions')
      .select('id', { count: 'exact', head: true })
      .eq('meeting_id', meetingId)
      .eq('workspace_id', workspaceId)
      .is('archived_at', null),
  ])

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    company: Array.isArray(data.company) ? data.company[0] || null : data.company,
    participants_count: Array.isArray(data.participants) ? data.participants.length : 0,
    tasks_count: tasksCount || 0,
    decisions_count: decisionsCount || 0,
  }
}

export async function createMeetingAction(
  workspaceId: string,
  input: {
    title: string
    meeting_type?: MeetingType
    status?: MeetingStatus
    scheduled_at: string
    ended_at?: string | null
    location_or_channel?: string | null
    agenda?: string | null
    notes?: string | null
    outcomes?: string | null
    project_id?: string | null
    company_id?: string | null
  }
): Promise<Meeting> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const trimmedTitle = input.title.trim()
  if (!trimmedTitle) throw new Error('Meeting title cannot be empty')
  if (!input.scheduled_at) throw new Error('Scheduled date and time is required')

  if (input.company_id) {
    const { data: wc, error: wcErr } = await (supabase as any)
      .from('workspace_companies')
      .select('company_id')
      .eq('workspace_id', workspaceId)
      .eq('company_id', input.company_id)
      .maybeSingle()
    if (wcErr || !wc) {
      throw new Error('Company does not belong to the selected workspace')
    }
  }

  const insertPayload: any = {
    workspace_id: workspaceId,
    title: trimmedTitle,
    meeting_type: input.meeting_type || 'internal',
    status: input.status || 'scheduled',
    scheduled_at: input.scheduled_at,
    ended_at: input.ended_at || null,
    location_or_channel: input.location_or_channel?.trim() || null,
    agenda: input.agenda?.trim() || null,
    notes: input.notes?.trim() || null,
    outcomes: input.outcomes?.trim() || null,
    project_id: input.project_id || null,
    company_id: input.company_id || null,
    created_by: user.id,
  }

  const { data, error } = await (supabase as any)
    .from('meetings')
    .insert(insertPayload)
    .select(`
      id,
      workspace_id,
      project_id,
      company_id,
      title,
      meeting_type,
      status,
      scheduled_at,
      ended_at,
      location_or_channel,
      agenda,
      notes,
      outcomes,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      company:companies(id, name)
    `)
    .single()

  if (error || !data) {
    console.error('Error creating meeting:', error)
    throw new Error(error?.message || 'Failed to create meeting')
  }

  revalidatePath('/vault/operations')
  if (input.project_id) revalidatePath(`/vault/projects/${input.project_id}`)
  revalidatePath('/vault')

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    company: Array.isArray(data.company) ? data.company[0] || null : data.company,
    participants: [],
    participants_count: 0,
  }
}

export async function updateMeetingAction(
  workspaceId: string,
  meetingId: string,
  input: {
    title?: string
    meeting_type?: MeetingType
    status?: MeetingStatus
    scheduled_at?: string
    ended_at?: string | null
    location_or_channel?: string | null
    agenda?: string | null
    notes?: string | null
    outcomes?: string | null
    project_id?: string | null
    company_id?: string | null
  }
): Promise<Meeting> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const updatePayload: any = {}
  if (input.title !== undefined) {
    const trimmed = input.title.trim()
    if (!trimmed) throw new Error('Meeting title cannot be empty')
    updatePayload.title = trimmed
  }
  if (input.meeting_type !== undefined) updatePayload.meeting_type = input.meeting_type
  if (input.status !== undefined) updatePayload.status = input.status
  if (input.scheduled_at !== undefined) updatePayload.scheduled_at = input.scheduled_at
  if (input.ended_at !== undefined) updatePayload.ended_at = input.ended_at || null
  if (input.location_or_channel !== undefined) {
    updatePayload.location_or_channel = input.location_or_channel ? input.location_or_channel.trim() : null
  }
  if (input.agenda !== undefined) {
    updatePayload.agenda = input.agenda ? input.agenda.trim() : null
  }
  if (input.notes !== undefined) {
    updatePayload.notes = input.notes ? input.notes.trim() : null
  }
  if (input.outcomes !== undefined) {
    updatePayload.outcomes = input.outcomes ? input.outcomes.trim() : null
  }
  if (input.project_id !== undefined) updatePayload.project_id = input.project_id || null
  if (input.company_id !== undefined) {
    if (input.company_id) {
      const { data: wc, error: wcErr } = await (supabase as any)
        .from('workspace_companies')
        .select('company_id')
        .eq('workspace_id', workspaceId)
        .eq('company_id', input.company_id)
        .maybeSingle()
      if (wcErr || !wc) {
        throw new Error('Company does not belong to the selected workspace')
      }
    }
    updatePayload.company_id = input.company_id || null
  }

  const { data, error } = await (supabase as any)
    .from('meetings')
    .update(updatePayload)
    .eq('id', meetingId)
    .eq('workspace_id', workspaceId)
    .select(`
      id,
      workspace_id,
      project_id,
      company_id,
      title,
      meeting_type,
      status,
      scheduled_at,
      ended_at,
      location_or_channel,
      agenda,
      notes,
      outcomes,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      company:companies(id, name)
    `)
    .single()

  if (error || !data) {
    console.error('Error updating meeting:', error)
    throw new Error(error?.message || 'Failed to update meeting')
  }

  revalidatePath('/vault/operations')
  revalidatePath(`/vault/operations/meetings/${meetingId}`)
  if (data.project_id) revalidatePath(`/vault/projects/${data.project_id}`)
  revalidatePath('/vault')

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    company: Array.isArray(data.company) ? data.company[0] || null : data.company,
  }
}

export async function archiveMeetingAction(workspaceId: string, meetingId: string): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('meetings')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', meetingId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/operations')
  revalidatePath(`/vault/operations/meetings/${meetingId}`)
  revalidatePath('/vault')
}

export async function restoreMeetingAction(workspaceId: string, meetingId: string): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('meetings')
    .update({ archived_at: null })
    .eq('id', meetingId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/operations')
  revalidatePath(`/vault/operations/meetings/${meetingId}`)
  revalidatePath('/vault')
}

// ==========================================
// 3. MEETING PARTICIPANTS ACTIONS
// ==========================================

export async function addMeetingParticipantAction(
  workspaceId: string,
  meetingId: string,
  input: {
    contact_id?: string | null
    guest_name?: string | null
    guest_email?: string | null
    role?: ParticipantRole
  }
): Promise<MeetingParticipant> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  // Enforce single identity source
  const hasContact = Boolean(input.contact_id)
  const hasGuest = Boolean(input.guest_name && input.guest_name.trim())

  if ((hasContact && hasGuest) || (!hasContact && !hasGuest)) {
    throw new Error('Participant must provide either an existing contact or a guest name, not both and not neither.')
  }

  const payload: any = {
    workspace_id: workspaceId,
    meeting_id: meetingId,
    contact_id: hasContact ? input.contact_id : null,
    guest_name: hasGuest ? input.guest_name!.trim() : null,
    guest_email: hasGuest && input.guest_email ? input.guest_email.trim() : null,
    role: input.role || 'attendee',
  }

  const { data, error } = await (supabase as any)
    .from('meeting_participants')
    .insert(payload)
    .select(`
      id,
      workspace_id,
      meeting_id,
      contact_id,
      guest_name,
      guest_email,
      role,
      created_at,
      contact:contacts(id, full_name, email, role_title)
    `)
    .single()

  if (error || !data) {
    console.error('Error adding meeting participant:', error)
    throw new Error(error?.message || 'Failed to add participant')
  }

  revalidatePath(`/vault/operations/meetings/${meetingId}`)
  revalidatePath('/vault/operations')

  return {
    ...data,
    contact: Array.isArray(data.contact) ? data.contact[0] || null : data.contact,
  }
}

export async function removeMeetingParticipantAction(
  workspaceId: string,
  meetingId: string,
  participantId: string
): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('meeting_participants')
    .delete()
    .eq('id', participantId)
    .eq('meeting_id', meetingId)
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error removing participant:', error)
    throw new Error(error.message || 'Failed to remove participant')
  }

  revalidatePath(`/vault/operations/meetings/${meetingId}`)
  revalidatePath('/vault/operations')
}

// ==========================================
// 4. DECISIONS ACTIONS
// ==========================================

export async function getDecisionsAction(
  workspaceId: string,
  filters?: {
    projectId?: string
    meetingId?: string
    search?: string
    includeArchived?: boolean
  }
): Promise<Decision[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  let query = (supabase as any)
    .from('decisions')
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      title,
      decision,
      context,
      reasoning,
      alternatives_considered,
      consequences,
      decided_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title)
    `)
    .eq('workspace_id', workspaceId)

  if (!filters?.includeArchived) {
    query = query.is('archived_at', null)
  }

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.meetingId) {
    query = query.eq('meeting_id', filters.meetingId)
  }

  if (filters?.search && filters.search.trim() !== '') {
    const term = `%${filters.search.trim()}%`
    query = query.or(`title.ilike.${term},decision.ilike.${term},context.ilike.${term},reasoning.ilike.${term}`)
  }

  query = query
    .order('decided_at', { ascending: false })
    .order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) {
    console.error('Error fetching decisions:', error)
    throw new Error('Failed to fetch decisions')
  }

  return (data || []).map((d: any) => ({
    ...d,
    project: Array.isArray(d.project) ? d.project[0] || null : d.project,
    meeting: Array.isArray(d.meeting) ? d.meeting[0] || null : d.meeting,
  }))
}

export async function getDecisionDetailAction(
  workspaceId: string,
  decisionId: string
): Promise<Decision> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('decisions')
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      title,
      decision,
      context,
      reasoning,
      alternatives_considered,
      consequences,
      decided_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title)
    `)
    .eq('id', decisionId)
    .eq('workspace_id', workspaceId)
    .single()

  if (error || !data) {
    console.error('Error fetching decision detail:', error)
    throw new Error('Decision not found')
  }

  const { count: tasksCount } = await (supabase as any)
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('decision_id', decisionId)
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    meeting: Array.isArray(data.meeting) ? data.meeting[0] || null : data.meeting,
    tasks_count: tasksCount || 0,
  }
}

export async function createDecisionAction(
  workspaceId: string,
  input: {
    title: string
    decision: string
    context?: string | null
    reasoning?: string | null
    alternatives_considered?: string | null
    consequences?: string | null
    decided_at?: string
    project_id?: string | null
    meeting_id?: string | null
  }
): Promise<Decision> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const trimmedTitle = input.title.trim()
  const trimmedDecision = input.decision.trim()
  if (!trimmedTitle) throw new Error('Decision title cannot be empty')
  if (!trimmedDecision) throw new Error('Decision statement cannot be empty')

  const insertPayload: any = {
    workspace_id: workspaceId,
    title: trimmedTitle,
    decision: trimmedDecision,
    context: input.context?.trim() || null,
    reasoning: input.reasoning?.trim() || null,
    alternatives_considered: input.alternatives_considered?.trim() || null,
    consequences: input.consequences?.trim() || null,
    decided_at: input.decided_at || new Date().toISOString().split('T')[0],
    project_id: input.project_id || null,
    meeting_id: input.meeting_id || null,
    created_by: user.id,
  }

  const { data, error } = await (supabase as any)
    .from('decisions')
    .insert(insertPayload)
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      title,
      decision,
      context,
      reasoning,
      alternatives_considered,
      consequences,
      decided_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title)
    `)
    .single()

  if (error || !data) {
    console.error('Error creating decision:', error)
    throw new Error(error?.message || 'Failed to create decision')
  }

  revalidatePath('/vault/operations')
  if (input.project_id) revalidatePath(`/vault/projects/${input.project_id}`)
  if (input.meeting_id) revalidatePath(`/vault/operations/meetings/${input.meeting_id}`)
  revalidatePath('/vault')

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    meeting: Array.isArray(data.meeting) ? data.meeting[0] || null : data.meeting,
    tasks_count: 0,
  }
}

export async function updateDecisionAction(
  workspaceId: string,
  decisionId: string,
  input: {
    title?: string
    decision?: string
    context?: string | null
    reasoning?: string | null
    alternatives_considered?: string | null
    consequences?: string | null
    decided_at?: string
    project_id?: string | null
    meeting_id?: string | null
  }
): Promise<Decision> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const updatePayload: any = {}
  if (input.title !== undefined) {
    const trimmed = input.title.trim()
    if (!trimmed) throw new Error('Decision title cannot be empty')
    updatePayload.title = trimmed
  }
  if (input.decision !== undefined) {
    const trimmed = input.decision.trim()
    if (!trimmed) throw new Error('Decision statement cannot be empty')
    updatePayload.decision = trimmed
  }
  if (input.context !== undefined) updatePayload.context = input.context ? input.context.trim() : null
  if (input.reasoning !== undefined) updatePayload.reasoning = input.reasoning ? input.reasoning.trim() : null
  if (input.alternatives_considered !== undefined) updatePayload.alternatives_considered = input.alternatives_considered ? input.alternatives_considered.trim() : null
  if (input.consequences !== undefined) updatePayload.consequences = input.consequences ? input.consequences.trim() : null
  if (input.decided_at !== undefined) updatePayload.decided_at = input.decided_at
  if (input.project_id !== undefined) updatePayload.project_id = input.project_id || null
  if (input.meeting_id !== undefined) updatePayload.meeting_id = input.meeting_id || null

  const { data, error } = await (supabase as any)
    .from('decisions')
    .update(updatePayload)
    .eq('id', decisionId)
    .eq('workspace_id', workspaceId)
    .select(`
      id,
      workspace_id,
      project_id,
      meeting_id,
      title,
      decision,
      context,
      reasoning,
      alternatives_considered,
      consequences,
      decided_at,
      created_by,
      created_at,
      updated_at,
      archived_at,
      project:workspace_projects(id, title),
      meeting:meetings(id, title)
    `)
    .single()

  if (error || !data) {
    console.error('Error updating decision:', error)
    throw new Error(error?.message || 'Failed to update decision')
  }

  revalidatePath('/vault/operations')
  revalidatePath(`/vault/operations/decisions/${decisionId}`)
  if (data.project_id) revalidatePath(`/vault/projects/${data.project_id}`)
  if (data.meeting_id) revalidatePath(`/vault/operations/meetings/${data.meeting_id}`)
  revalidatePath('/vault')

  return {
    ...data,
    project: Array.isArray(data.project) ? data.project[0] || null : data.project,
    meeting: Array.isArray(data.meeting) ? data.meeting[0] || null : data.meeting,
  }
}

export async function archiveDecisionAction(workspaceId: string, decisionId: string): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('decisions')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', decisionId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/operations')
  revalidatePath(`/vault/operations/decisions/${decisionId}`)
  revalidatePath('/vault')
}

export async function restoreDecisionAction(workspaceId: string, decisionId: string): Promise<void> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('decisions')
    .update({ archived_at: null })
    .eq('id', decisionId)
    .eq('workspace_id', workspaceId)

  if (error) throw new Error(error.message)

  revalidatePath('/vault/operations')
  revalidatePath(`/vault/operations/decisions/${decisionId}`)
  revalidatePath('/vault')
}

// ==========================================
// 5. STATS & AGGREGATES
// ==========================================

export async function getOperationsStatsAction(
  workspaceId: string,
  projectId?: string
): Promise<OperationsStats> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const todayStr = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  let activeTasksQ = (supabase as any)
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['todo', 'in_progress', 'blocked'])
    .is('archived_at', null)

  let overdueTasksQ = (supabase as any)
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['todo', 'in_progress', 'blocked'])
    .lt('due_date', todayStr)
    .is('archived_at', null)

  let dueTodayTasksQ = (supabase as any)
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .in('status', ['todo', 'in_progress', 'blocked'])
    .eq('due_date', todayStr)
    .is('archived_at', null)

  let upcomingMeetingsQ = (supabase as any)
    .from('meetings')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', nowIso)
    .lte('scheduled_at', in7Days)
    .is('archived_at', null)

  let decisionsQ = (supabase as any)
    .from('decisions')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .is('archived_at', null)

  if (projectId) {
    activeTasksQ = activeTasksQ.eq('project_id', projectId)
    overdueTasksQ = overdueTasksQ.eq('project_id', projectId)
    dueTodayTasksQ = dueTodayTasksQ.eq('project_id', projectId)
    upcomingMeetingsQ = upcomingMeetingsQ.eq('project_id', projectId)
    decisionsQ = decisionsQ.eq('project_id', projectId)
  }

  const [activeRes, overdueRes, dueTodayRes, meetingsRes, decisionsRes] = await Promise.all([
    activeTasksQ,
    overdueTasksQ,
    dueTodayTasksQ,
    upcomingMeetingsQ,
    decisionsQ,
  ])

  return {
    activeTasksCount: activeRes.count || 0,
    overdueTasksCount: overdueRes.count || 0,
    dueTodayTasksCount: dueTodayRes.count || 0,
    upcomingMeetingsCount: meetingsRes.count || 0,
    totalDecisionsCount: decisionsRes.count || 0,
  }
}

export async function getProjectOperationsCountsAction(
  workspaceId: string,
  projectId: string
): Promise<{ activeTasks: number; upcomingMeetings: number; decisionsCount: number }> {
  const stats = await getOperationsStatsAction(workspaceId, projectId)
  return {
    activeTasks: stats.activeTasksCount,
    upcomingMeetings: stats.upcomingMeetingsCount,
    decisionsCount: stats.totalDecisionsCount,
  }
}

export async function getCommandCenterOperationsAttentionAction(
  workspaceId: string
): Promise<{ overdueTasks: Task[]; dueTodayTasks: Task[]; upcomingMeetings: Meeting[] }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const todayStr = new Date().toISOString().split('T')[0]
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  const [overdueRes, dueTodayRes, meetingsRes] = await Promise.all([
    (supabase as any)
      .from('tasks')
      .select('id, workspace_id, project_id, title, status, priority, due_date, project:workspace_projects(id, title)')
      .eq('workspace_id', workspaceId)
      .in('status', ['todo', 'in_progress', 'blocked'])
      .lt('due_date', todayStr)
      .is('archived_at', null)
      .order('due_date', { ascending: true })
      .limit(10),
    (supabase as any)
      .from('tasks')
      .select('id, workspace_id, project_id, title, status, priority, due_date, project:workspace_projects(id, title)')
      .eq('workspace_id', workspaceId)
      .in('status', ['todo', 'in_progress', 'blocked'])
      .eq('due_date', todayStr)
      .is('archived_at', null)
      .order('priority', { ascending: false })
      .limit(10),
    (supabase as any)
      .from('meetings')
      .select('id, workspace_id, project_id, company_id, title, meeting_type, status, scheduled_at, location_or_channel, project:workspace_projects(id, title), company:companies(id, name)')
      .eq('workspace_id', workspaceId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', nowIso)
      .lte('scheduled_at', in7Days)
      .is('archived_at', null)
      .order('scheduled_at', { ascending: true })
      .limit(10),
  ])

  const overdueTasks = (overdueRes.data || []).map((t: any) => ({
    ...t,
    project: Array.isArray(t.project) ? t.project[0] || null : t.project,
  }))

  const dueTodayTasks = (dueTodayRes.data || []).map((t: any) => ({
    ...t,
    project: Array.isArray(t.project) ? t.project[0] || null : t.project,
  }))

  const upcomingMeetings = (meetingsRes.data || []).map((m: any) => ({
    ...m,
    project: Array.isArray(m.project) ? m.project[0] || null : m.project,
    company: Array.isArray(m.company) ? m.company[0] || null : m.company,
  }))

  return {
    overdueTasks,
    dueTodayTasks,
    upcomingMeetings,
  }
}
