'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ClipboardList,
  CheckCircle2,
  Video,
  FileText,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  Calendar,
} from 'lucide-react'
import {
  Task,
  Meeting,
  Decision,
  OperationsStats,
  TaskStatus,
  TaskPriority,
  MeetingStatus,
} from '@/lib/vault/operations/types'
import { TaskList } from './task-list'
import { MeetingList } from './meeting-list'
import { DecisionList } from './decision-list'
import { TaskModal } from './task-modal'
import { MeetingModal } from './meeting-modal'
import { DecisionModal } from './decision-modal'
import { cn } from '@/lib/utils'

interface OperationsViewProps {
  workspaceId: string
  isAdmin?: boolean
  initialTasks: Task[]
  initialMeetings: Meeting[]
  initialDecisions: Decision[]
  stats: OperationsStats
  projects: { id: string; title: string }[]
  companies: { id: string; name: string }[]
  contacts: { id: string; full_name: string; email?: string | null; role_title?: string | null }[]
}

export function OperationsView({
  workspaceId,
  isAdmin = false,
  initialTasks,
  initialMeetings,
  initialDecisions,
  stats,
  projects,
  companies,
  contacts,
}: OperationsViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlView = searchParams.get('view') as 'tasks' | 'meetings' | 'decisions' | null
  const urlProject = searchParams.get('projectId') || searchParams.get('project') || ''

  const [activeTab, setActiveTab] = useState<'tasks' | 'meetings' | 'decisions'>(
    urlView && ['tasks', 'meetings', 'decisions'].includes(urlView) ? urlView : 'tasks'
  )
  const [selectedProject, setSelectedProject] = useState<string>(urlProject)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [showArchived, setShowArchived] = useState(false)

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false)
  const [editingDecision, setEditingDecision] = useState<Decision | null>(null)

  const handleTabChange = (tab: 'tasks' | 'meetings' | 'decisions') => {
    setActiveTab(tab)
    setStatusFilter('all')
    setPriorityFilter('all')
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', tab)
    router.replace(`/vault/operations?${params.toString()}`, { scroll: false })
  }

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return initialTasks.filter((task) => {
      if (!showArchived && task.archived_at) return false
      if (showArchived && !task.archived_at) return false
      if (selectedProject && task.project_id !== selectedProject) return false
      if (statusFilter !== 'all' && task.status !== statusFilter) return false
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(q)
        const matchesDesc = task.description ? task.description.toLowerCase().includes(q) : false
        if (!matchesTitle && !matchesDesc) return false
      }
      return true
    })
  }, [initialTasks, selectedProject, statusFilter, priorityFilter, searchQuery, showArchived])

  // Filter Meetings
  const filteredMeetings = useMemo(() => {
    return initialMeetings.filter((meeting) => {
      if (!showArchived && meeting.archived_at) return false
      if (showArchived && !meeting.archived_at) return false
      if (selectedProject && meeting.project_id !== selectedProject) return false
      if (statusFilter !== 'all' && meeting.status !== statusFilter) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = meeting.title.toLowerCase().includes(q)
        const matchesLoc = meeting.location_or_channel ? meeting.location_or_channel.toLowerCase().includes(q) : false
        if (!matchesTitle && !matchesLoc) return false
      }
      return true
    })
  }, [initialMeetings, selectedProject, statusFilter, searchQuery, showArchived])

  // Filter Decisions
  const filteredDecisions = useMemo(() => {
    return initialDecisions.filter((decision) => {
      if (!showArchived && decision.archived_at) return false
      if (showArchived && !decision.archived_at) return false
      if (selectedProject && decision.project_id !== selectedProject) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesTitle = decision.title.toLowerCase().includes(q)
        const matchesDec = decision.decision.toLowerCase().includes(q)
        if (!matchesTitle && !matchesDec) return false
      }
      return true
    })
  }, [initialDecisions, selectedProject, searchQuery, showArchived])

  const openNewTask = () => {
    setEditingTask(null)
    setIsTaskModalOpen(true)
  }

  const openNewMeeting = () => {
    setEditingMeeting(null)
    setIsMeetingModalOpen(true)
  }

  const openNewDecision = () => {
    setEditingDecision(null)
    setIsDecisionModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Operations
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Waynex Vault Operating System: active tasks, scheduled meetings, and decision ledger.
          </p>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2DB52D]" />
            <span className="text-muted-foreground">Active Tasks:</span>
            <span className="font-mono font-semibold text-foreground">{stats.activeTasksCount}</span>
          </div>

          {stats.overdueTasksCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-[#DC143C]/10 border border-[#DC143C]/30 text-xs flex items-center gap-1.5 text-[#A30F2D] dark:text-[#FF5C77]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Overdue:</span>
              <span className="font-mono font-bold">{stats.overdueTasksCount}</span>
            </div>
          )}

          {stats.dueTodayTasksCount > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex items-center gap-1.5 text-amber-800 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Due Today:</span>
              <span className="font-mono font-bold">{stats.dueTodayTasksCount}</span>
            </div>
          )}

          <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="text-muted-foreground">Next 7d Meetings:</span>
            <span className="font-mono font-semibold text-foreground">{stats.upcomingMeetingsCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Decisions:</span>
            <span className="font-mono font-semibold text-foreground">{stats.totalDecisionsCount}</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/60 border border-border">
          <button
            type="button"
            onClick={() => handleTabChange('tasks')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === 'tasks'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
            <span>Tasks</span>
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground">
              {filteredTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('meetings')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === 'meetings'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Video className="w-3.5 h-3.5 text-primary" />
            <span>Meetings</span>
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground">
              {filteredMeetings.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('decisions')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === 'decisions'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="w-3.5 h-3.5 text-primary" />
            <span>Decisions</span>
            <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-secondary text-muted-foreground">
              {filteredDecisions.length}
            </span>
          </button>
        </div>

        {/* Primary Create Button */}
        <div>
          {activeTab === 'tasks' && (
            <button
              type="button"
              onClick={openNewTask}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
          )}

          {activeTab === 'meetings' && (
            <button
              type="button"
              onClick={openNewMeeting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Meeting</span>
            </button>
          )}

          {activeTab === 'decisions' && (
            <button
              type="button"
              onClick={openNewDecision}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Decision</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Filter / Search Toolbar */}
      <div className="p-3 rounded-xl bg-card border border-border flex flex-wrap items-center gap-3 text-xs">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Project Selector */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        {/* Status Selector (Tasks & Meetings) */}
        {activeTab === 'tasks' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}

        {activeTab === 'meetings' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}

        {/* Priority Selector (Tasks only) */}
        {activeTab === 'tasks' && (
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        )}

        {/* Archived Toggle */}
        <label className="flex items-center gap-1.5 cursor-pointer ml-auto select-none text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-border text-primary focus:ring-primary"
          />
          <span>Show Archived</span>
        </label>
      </div>

      {/* 4. Active Tab Content */}
      <div>
        {activeTab === 'tasks' && (
          <TaskList
            tasks={filteredTasks}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
            onEditTask={(task) => {
              setEditingTask(task)
              setIsTaskModalOpen(true)
            }}
            onRefresh={() => router.refresh()}
          />
        )}

        {activeTab === 'meetings' && (
          <MeetingList
            meetings={filteredMeetings}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
            onEditMeeting={(meeting) => {
              setEditingMeeting(meeting)
              setIsMeetingModalOpen(true)
            }}
            onRefresh={() => router.refresh()}
          />
        )}

        {activeTab === 'decisions' && (
          <DecisionList
            decisions={filteredDecisions}
            workspaceId={workspaceId}
            isAdmin={isAdmin}
            onEditDecision={(decision) => {
              setEditingDecision(decision)
              setIsDecisionModalOpen(true)
            }}
            onRefresh={() => router.refresh()}
          />
        )}
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setEditingTask(null)
        }}
        workspaceId={workspaceId}
        task={editingTask}
        prefill={{ projectId: selectedProject || null }}
        projects={projects}
        meetings={initialMeetings.map((m) => ({ id: m.id, title: m.title }))}
        decisions={initialDecisions.map((d) => ({ id: d.id, title: d.title }))}
        onSuccess={() => router.refresh()}
      />

      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => {
          setIsMeetingModalOpen(false)
          setEditingMeeting(null)
        }}
        workspaceId={workspaceId}
        meeting={editingMeeting}
        prefill={{ projectId: selectedProject || null }}
        projects={projects}
        companies={companies}
        onSuccess={() => router.refresh()}
      />

      <DecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => {
          setIsDecisionModalOpen(false)
          setEditingDecision(null)
        }}
        workspaceId={workspaceId}
        decision={editingDecision}
        prefill={{ projectId: selectedProject || null }}
        projects={projects}
        meetings={initialMeetings.map((m) => ({ id: m.id, title: m.title }))}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
