'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  ShawConversation,
  ShawMessage,
  ShawAiRun,
  ShawUserPreferences,
  ShawRoutingMode,
  ShawCapability,
} from './shaw/types'

// Workspace access verification helper
async function requireWorkspaceAccess(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

// ============================================================================
// 1. CONVERSATIONS
// ============================================================================

export async function getShawConversationsAction(
  workspaceId: string,
  options?: { includeArchived?: boolean }
): Promise<ShawConversation[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  let query = (supabase as any)
    .from('shaw_conversations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching SHAW conversations:', error)
    return []
  }

  return (data || []) as ShawConversation[]
}

export async function getShawConversationDetailAction(
  workspaceId: string,
  conversationId: string
): Promise<{ conversation: ShawConversation; messages: ShawMessage[] } | null> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { data: conversation, error: convError } = await (supabase as any)
    .from('shaw_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (convError || !conversation) {
    return null
  }

  const { data: messages, error: msgError } = await (supabase as any)
    .from('shaw_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })

  if (msgError) {
    console.error('Error fetching conversation messages:', msgError)
    return { conversation: conversation as ShawConversation, messages: [] }
  }

  return {
    conversation: conversation as ShawConversation,
    messages: (messages || []) as ShawMessage[],
  }
}

export async function createShawConversationAction(
  workspaceId: string,
  params: {
    title?: string
    identityId?: string | null
    routingMode?: ShawRoutingMode
    capability?: ShawCapability
    selectedModel?: string | null
  }
): Promise<{ success: boolean; conversation?: ShawConversation; error?: string }> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const insertPayload = {
    workspace_id: workspaceId,
    identity_id: params.identityId || null,
    title: params.title?.trim() || 'New Conversation',
    routing_mode: params.routingMode || 'auto_free_first',
    capability: params.capability || 'ask',
    selected_model: params.selectedModel || null,
    created_by: user.id,
    is_archived: false,
  }

  const { data, error } = await (supabase as any)
    .from('shaw_conversations')
    .insert(insertPayload)
    .select('*')
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || 'Failed to create conversation' }
  }

  revalidatePath('/vault/shaw')
  return { success: true, conversation: data as ShawConversation }
}

export async function updateShawConversationAction(
  workspaceId: string,
  conversationId: string,
  updates: {
    title?: string
    is_archived?: boolean
    routing_mode?: ShawRoutingMode
    selected_model?: string | null
    capability?: ShawCapability
  }
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.title !== undefined) updatePayload.title = updates.title.trim()
  if (updates.is_archived !== undefined) updatePayload.is_archived = updates.is_archived
  if (updates.routing_mode !== undefined) updatePayload.routing_mode = updates.routing_mode
  if (updates.selected_model !== undefined) updatePayload.selected_model = updates.selected_model
  if (updates.capability !== undefined) updatePayload.capability = updates.capability

  const { error } = await (supabase as any)
    .from('shaw_conversations')
    .update(updatePayload)
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/vault/shaw')
  return { success: true }
}

export async function deleteShawConversationAction(
  workspaceId: string,
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  const { error } = await (supabase as any)
    .from('shaw_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/vault/shaw')
  return { success: true }
}

// ============================================================================
// 2. USER PREFERENCES
// ============================================================================

export async function getShawUserPreferencesAction(
  workspaceId: string
): Promise<ShawUserPreferences> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const { data, error } = await (supabase as any)
    .from('shaw_user_preferences')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) {
    // Return default preferences
    return {
      id: '',
      user_id: user.id,
      workspace_id: workspaceId,
      routing_mode: 'auto_free_first',
      allow_paid_fallback: false,
      default_voice_profile: 'defiwaynex',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  return data as ShawUserPreferences
}

export async function updateShawUserPreferencesAction(
  workspaceId: string,
  updates: {
    routing_mode?: ShawRoutingMode
    allow_paid_fallback?: boolean
    default_voice_profile?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireWorkspaceAccess(workspaceId)

  const payload: Record<string, any> = {
    user_id: user.id,
    workspace_id: workspaceId,
    updated_at: new Date().toISOString(),
  }

  if (updates.routing_mode !== undefined) payload.routing_mode = updates.routing_mode
  if (updates.allow_paid_fallback !== undefined) payload.allow_paid_fallback = updates.allow_paid_fallback
  if (updates.default_voice_profile !== undefined) payload.default_voice_profile = updates.default_voice_profile

  const { error } = await (supabase as any)
    .from('shaw_user_preferences')
    .upsert(payload, { onConflict: 'user_id,workspace_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================================================
// 3. AI RUN AUDIT
// ============================================================================

export async function getShawAiRunsAction(
  workspaceId: string,
  conversationId?: string,
  limit: number = 30
): Promise<ShawAiRun[]> {
  const { supabase } = await requireWorkspaceAccess(workspaceId)

  let query = (supabase as any)
    .from('shaw_ai_runs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (conversationId) {
    query = query.eq('conversation_id', conversationId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching SHAW AI runs:', error)
    return []
  }

  return (data || []) as ShawAiRun[]
}
