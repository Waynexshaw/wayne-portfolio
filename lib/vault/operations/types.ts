// lib/vault/operations/types.ts

export type MeetingType = 'internal' | 'external' | 'other'
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'
export type ParticipantRole = 'organizer' | 'attendee' | 'speaker' | 'observer'

export interface MeetingParticipant {
  id: string
  workspace_id: string
  meeting_id: string
  contact_id: string | null
  guest_name: string | null
  guest_email: string | null
  role: ParticipantRole
  created_at: string
  contact?: {
    id: string
    full_name: string
    email: string | null
    role_title: string | null
  } | null
}

export interface Meeting {
  id: string
  workspace_id: string
  project_id: string | null
  company_id: string | null
  title: string
  meeting_type: MeetingType
  status: MeetingStatus
  scheduled_at: string
  ended_at: string | null
  location_or_channel: string | null
  agenda: string | null
  notes: string | null
  outcomes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  project?: { id: string; title: string } | null
  company?: { id: string; name: string } | null
  participants?: MeetingParticipant[]
  participants_count?: number
  tasks_count?: number
  decisions_count?: number
}

export interface Decision {
  id: string
  workspace_id: string
  project_id: string | null
  meeting_id: string | null
  title: string
  decision: string
  context: string | null
  reasoning: string | null
  alternatives_considered: string | null
  consequences: string | null
  decided_at: string
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  project?: { id: string; title: string } | null
  meeting?: { id: string; title: string } | null
  tasks_count?: number
}

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  workspace_id: string
  project_id: string | null
  meeting_id: string | null
  decision_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  project?: { id: string; title: string } | null
  meeting?: { id: string; title: string } | null
  decision?: { id: string; title: string } | null
}

export interface OperationsStats {
  activeTasksCount: number
  overdueTasksCount: number
  dueTodayTasksCount: number
  upcomingMeetingsCount: number
  totalDecisionsCount: number
}

export interface OperationsFilters {
  view: 'tasks' | 'meetings' | 'decisions'
  projectId?: string
  status?: string
  priority?: string
  search?: string
  includeArchived?: boolean
}
