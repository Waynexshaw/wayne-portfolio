/**
 * Waynex Vault — VaultRetrievalService
 *
 * Implements bounded, whitelisted, workspace-scoped retrieval contracts
 * across the 10 core Waynex Vault domains.
 * Enforces strict relational semantics (no fabricated relationships),
 * multi-tenant workspace isolation, and epistemic classification.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import {
  RetrievalPlan,
  VaultContextEnvelope,
  VaultRecord,
  AmbiguityItem,
  NotFoundItem,
  RetrievalDomain,
  EpistemicClass,
  CollectionCompleteness,
  ResultScope,
  QueryMode,
  ReasoningPlan,
  DomainOutcome,
  DomainOutcomeStatus,
  ReasoningDomainRequest,
} from './types'

const MAX_TOTAL_RECORDS = 40
const MAX_DOC_TEXT_LENGTH = 1500

export class VaultRetrievalService {
  private supabase: any
  private workspaceId: string

  constructor(supabase: SupabaseClient<any, any, any> | any, workspaceId: string) {
    this.supabase = supabase
    this.workspaceId = workspaceId
  }

  async executePlan(plan: RetrievalPlan): Promise<VaultContextEnvelope> {
    const startTime = Date.now()
    const records: VaultRecord[] = []
    const ambiguities: AmbiguityItem[] = []
    const emptyStates: NotFoundItem[] = []
    const completeness: CollectionCompleteness[] = []
    let truncated = false

    const domainsQueried: RetrievalDomain[] = []

    for (const intent of plan.intents) {
      if (records.length >= MAX_TOTAL_RECORDS) {
        truncated = true
        break
      }

      if (!domainsQueried.includes(intent.domain)) {
        domainsQueried.push(intent.domain)
      }

      switch (intent.domain) {
        case 'project':
          await this.retrieveProjectContext(intent.entityQuery, records, ambiguities, emptyStates, completeness)
          break

        case 'crm':
          await this.retrieveCrmContext(intent.entityQuery, records, ambiguities, emptyStates, completeness)
          break

        case 'task':
          await this.retrieveTasks(intent, records, ambiguities, emptyStates, completeness)
          break

        case 'decision':
          await this.retrieveDecisions(intent.entityQuery, records, ambiguities, emptyStates, completeness)
          break

        case 'research':
          await this.retrieveResearch(intent.entityQuery, records, ambiguities, emptyStates, completeness)
          break

        case 'meeting':
          await this.retrieveMeetings(intent, records, ambiguities, emptyStates, completeness)
          break

        case 'metric':
          await this.retrieveMetrics(intent.entityQuery, records, ambiguities, emptyStates, completeness)
          break

        case 'review':
          await this.retrieveReviews(intent.entityQuery, records, ambiguities, emptyStates, completeness)
          break

        case 'evidence':
          await this.retrieveWorkspaceEvidence(intent.entityQuery, records, ambiguities, emptyStates, completeness)
          break

        case 'activity':
          await this.retrieveActivityDigest(plan.timeframe, records, completeness)
          break
      }
    }

    if (records.length > MAX_TOTAL_RECORDS) {
      records.length = MAX_TOTAL_RECORDS
      truncated = true
    }

    return {
      retrievalQuery: plan.intents.map((i) => `${i.domain}:${i.entityQuery || '*'}`).join('; '),
      resolvedScope: {
        workspaceId: this.workspaceId,
        domains: domainsQueried,
        timezone: plan.timeframe?.timezone,
        timeframe: plan.timeframe
          ? {
              type: plan.timeframe.type,
              label: plan.timeframe.label,
              start: plan.timeframe.startIso,
              end: plan.timeframe.endIso,
              startDateString: plan.timeframe.startDateString,
              endDateString: plan.timeframe.endDateString,
            }
          : undefined,
      },
      resolvedEntities: plan.resolvedEntityHints,
      records,
      ambiguities,
      emptyStates,
      completeness,
      truncated,
      retrievalTimestamp: new Date().toISOString(),
      provenance: {
        recordCount: records.length,
        domainsQueried,
        latencyMs: Date.now() - startTime,
      },
    }
  }

  // --------------------------------------------------------------------------
  // 1. Project Context Contract (Catalog & Targeted)
  // --------------------------------------------------------------------------
  private async retrieveProjectContext(
    query: string | undefined,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness: CollectionCompleteness[]
  ) {
    const isCatalog = !query || !query.trim()

    // ------------------------------------------------------------------------
    // A. Unconstrained Project Catalog Mode
    // ------------------------------------------------------------------------
    if (isCatalog) {
      let queryBuilder = (this.supabase as any)
        .from('workspace_projects')
        .select('id, title, slug, description, status, priority, start_date, target_date, completed_at, created_at, updated_at', { count: 'exact' })
        .eq('workspace_id', this.workspaceId)
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: projects, error, count } = await queryBuilder

      if (error || !projects || projects.length === 0) {
        completeness.push({
          domain: 'project',
          queryMode: 'catalog',
          resultScope: 'exhaustive',
          returnedCount: 0,
          totalCount: typeof count === 'number' ? count : 0,
          appliedLimit: 20,
          hasMore: false,
        })
        return
      }

      const projectIds = projects.map((p: any) => p.id)

      // Bounded batched retrieval for linked open tasks across retrieved projects
      const { data: allTasks } = await (this.supabase as any)
        .from('tasks')
        .select('id, project_id, title, status, priority, due_date')
        .eq('workspace_id', this.workspaceId)
        .in('project_id', projectIds)
        .in('status', ['todo', 'in_progress', 'blocked'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(50)

      // Bounded batched retrieval for linked decisions across retrieved projects
      const { data: allDecisions } = await (this.supabase as any)
        .from('decisions')
        .select('id, project_id, title, decision, decided_at')
        .eq('workspace_id', this.workspaceId)
        .in('project_id', projectIds)
        .order('decided_at', { ascending: false })
        .limit(25)

      const tasksByProject = new Map<string, any[]>()
      for (const t of (allTasks || [])) {
        if (t.project_id) {
          const list = tasksByProject.get(t.project_id) || []
          list.push(t)
          tasksByProject.set(t.project_id, list)
        }
      }

      const decisionsByProject = new Map<string, any[]>()
      for (const d of (allDecisions || [])) {
        if (d.project_id) {
          const list = decisionsByProject.get(d.project_id) || []
          list.push(d)
          decisionsByProject.set(d.project_id, list)
        }
      }

      // Normalize and push every returned project (including active, paused, null identity)
      for (const project of projects) {
        const projectTasks = (tasksByProject.get(project.id) || []).slice(0, 10)
        const projectDecisions = (decisionsByProject.get(project.id) || []).slice(0, 5)

        records.push({
          entityType: 'project',
          entityId: project.id,
          title: project.title,
          timestamps: {
            created_at: project.created_at,
            updated_at: project.updated_at,
            start_date: project.start_date,
            target_date: project.target_date,
            completed_at: project.completed_at,
          },
          relationship: {
            slug: project.slug,
            hasCompanyRelationship: false, // Schema invariant: workspace_projects has no company_id
          },
          epistemicClass: 'WV_RECORD',
          fields: {
            slug: project.slug,
            status: project.status,
            priority: project.priority,
            description: project.description,
            activeTasksSummary: projectTasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
            })),
            recentDecisionsSummary: projectDecisions.map((d: any) => ({
              id: d.id,
              title: d.title,
              decision: d.decision,
              decided_at: d.decided_at,
            })),
          },
          provenance: {
            table: 'workspace_projects',
            id: project.id,
            workspace_id: this.workspaceId,
          },
        })
      }

      const totalKnown = typeof count === 'number' ? count : undefined
      const hasMore = totalKnown !== undefined ? totalKnown > projects.length : projects.length >= 20
      const resultScope: ResultScope = (totalKnown !== undefined && projects.length === totalKnown)
        ? 'exhaustive'
        : 'bounded'

      completeness.push({
        domain: 'project',
        queryMode: 'catalog',
        resultScope,
        returnedCount: projects.length,
        totalCount: totalKnown,
        appliedLimit: 20,
        hasMore,
      })
      return
    }

    // ------------------------------------------------------------------------
    // B. Targeted Project Entity Mode
    // ------------------------------------------------------------------------
    const trimmedQuery = query.trim()
    let queryBuilder = (this.supabase as any)
      .from('workspace_projects')
      .select('id, title, slug, description, status, priority, start_date, target_date, completed_at, created_at, updated_at', { count: 'exact' })
      .eq('workspace_id', this.workspaceId)
      .or(`slug.ilike.%${trimmedQuery}%,title.ilike.%${trimmedQuery}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: projects, error, count } = await queryBuilder

    if (error || !projects || projects.length === 0) {
      emptyStates.push({
        domain: 'project',
        query: trimmedQuery,
        message: `No project matching "${trimmedQuery}" was found in this workspace.`,
      })
      completeness.push({
        domain: 'project',
        queryMode: 'targeted',
        resultScope: 'exhaustive',
        returnedCount: 0,
        totalCount: 0,
        appliedLimit: 10,
        hasMore: false,
        filterDescription: `Targeted query for "${trimmedQuery}"`,
      })
      return
    }

    if (projects.length > 1) {
      ambiguities.push({
        domain: 'project',
        query: trimmedQuery,
        candidateMatches: projects.map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          type: 'workspace_project',
        })),
        message: `Multiple projects match "${trimmedQuery}": ${projects.map((p: any) => p.title).join(', ')}.`,
      })
      completeness.push({
        domain: 'project',
        queryMode: 'targeted',
        resultScope: 'ambiguous',
        returnedCount: projects.length,
        totalCount: typeof count === 'number' ? count : projects.length,
        appliedLimit: 10,
        hasMore: false,
        filterDescription: `Multiple candidates matching "${trimmedQuery}"`,
      })
      // Ambiguous targeted lookup: do not guess silently or inject an arbitrary first match
      return
    }

    // Unambiguous single targeted match
    const project = projects[0]

    // Fetch linked tasks (top 10 open tasks)
    const { data: linkedTasks } = await (this.supabase as any)
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .eq('workspace_id', this.workspaceId)
      .eq('project_id', project.id)
      .in('status', ['todo', 'in_progress', 'blocked'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(10)

    // Fetch linked decisions (top 5 recent)
    const { data: linkedDecisions } = await (this.supabase as any)
      .from('decisions')
      .select('id, title, decision, decided_at')
      .eq('workspace_id', this.workspaceId)
      .eq('project_id', project.id)
      .order('decided_at', { ascending: false })
      .limit(5)

    records.push({
      entityType: 'project',
      entityId: project.id,
      title: project.title,
      timestamps: {
        created_at: project.created_at,
        updated_at: project.updated_at,
        start_date: project.start_date,
        target_date: project.target_date,
        completed_at: project.completed_at,
      },
      relationship: {
        slug: project.slug,
        hasCompanyRelationship: false, // Schema invariant: workspace_projects has no company_id
      },
      epistemicClass: 'WV_RECORD',
      fields: {
        slug: project.slug,
        status: project.status,
        priority: project.priority,
        description: project.description,
        activeTasksSummary: (linkedTasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
        })),
        recentDecisionsSummary: (linkedDecisions || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          decision: d.decision,
          decided_at: d.decided_at,
        })),
      },
      provenance: {
        table: 'workspace_projects',
        id: project.id,
        workspace_id: this.workspaceId,
      },
    })

    completeness.push({
      domain: 'project',
      queryMode: 'targeted',
      resultScope: 'exhaustive',
      returnedCount: 1,
      totalCount: 1,
      appliedLimit: 10,
      hasMore: false,
      filterDescription: `Targeted match for "${trimmedQuery}"`,
    })
  }

  // --------------------------------------------------------------------------
  // 2. CRM Context Contract (Contacts, Companies, Interactions, Follow-ups)
  // --------------------------------------------------------------------------
  private async retrieveCrmContext(
    query: string | undefined,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    if (!query) {
      // Return top recent contacts and pending follow-ups
      const { data: pendingFollowUps } = await (this.supabase as any)
        .from('follow_ups')
        .select('id, contact_id, title, description, due_date, status, priority')
        .eq('workspace_id', this.workspaceId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(10)

      if (completeness) {
        completeness.push({
          domain: 'crm',
          queryMode: 'catalog',
          resultScope: 'bounded',
          returnedCount: (pendingFollowUps || []).length,
          appliedLimit: 10,
        })
      }

      if (pendingFollowUps && pendingFollowUps.length > 0) {
        for (const f of pendingFollowUps) {
          records.push({
            entityType: 'crm',
            entityId: f.id,
            title: `Follow-up: ${f.title}`,
            timestamps: { due_date: f.due_date },
            relationship: { contactId: f.contact_id },
            epistemicClass: 'WV_RECORD',
            fields: {
              type: 'follow_up',
              status: f.status,
              priority: f.priority,
              description: f.description,
            },
            provenance: { table: 'follow_ups', id: f.id, workspace_id: this.workspaceId },
          })
        }
      }
      return
    }

    // Search contacts first
    const { data: wsContacts } = await (this.supabase as any)
      .from('workspace_contacts')
      .select('contact_id, relationship_stage, sentiment, last_contacted_at, contacts(id, display_name, first_name, last_name, job_title, primary_company_id)')
      .eq('workspace_id', this.workspaceId)
      .limit(10)

    const matchedContacts = (wsContacts || []).filter((wc: any) => {
      const c = wc.contacts
      if (!c) return false
      const name = `${c.first_name || ''} ${c.last_name || ''} ${c.display_name || ''}`.toLowerCase()
      return name.includes(query.toLowerCase())
    })

    if (matchedContacts.length > 0) {
      if (matchedContacts.length > 1) {
        ambiguities.push({
          domain: 'crm',
          query,
          candidateMatches: matchedContacts.map((mc: any) => ({
            id: mc.contact_id,
            title: mc.contacts?.display_name || `${mc.contacts?.first_name} ${mc.contacts?.last_name}`,
            type: 'contact',
          })),
          message: `Multiple contacts match "${query}".`,
        })
      }

      const primaryMatch = matchedContacts[0]
      const contactId = primaryMatch.contact_id
      const contactInfo = primaryMatch.contacts

      // Query recent interactions for this contact (contact-centric)
      const { data: interactions } = await (this.supabase as any)
        .from('interactions')
        .select('id, interaction_type, channel, subject, summary, sentiment, next_action, interaction_date')
        .eq('workspace_id', this.workspaceId)
        .eq('contact_id', contactId)
        .order('interaction_date', { ascending: false })
        .limit(5)

      // Query pending follow-ups
      const { data: followUps } = await (this.supabase as any)
        .from('follow_ups')
        .select('id, title, due_date, status, priority')
        .eq('workspace_id', this.workspaceId)
        .eq('contact_id', contactId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(5)

      records.push({
        entityType: 'crm',
        entityId: contactId,
        title: contactInfo?.display_name || `${contactInfo?.first_name} ${contactInfo?.last_name}`,
        timestamps: {
          last_contacted_at: primaryMatch.last_contacted_at,
        },
        relationship: {
          contactId,
          primaryCompanyId: contactInfo?.primary_company_id || undefined,
        },
        epistemicClass: 'WV_RECORD',
        fields: {
          type: 'contact',
          stage: primaryMatch.relationship_stage,
          sentiment: primaryMatch.sentiment,
          job_title: contactInfo?.job_title,
          recentInteractions: (interactions || []).map((i: any) => ({
            id: i.id,
            date: i.interaction_date,
            type: i.interaction_type,
            channel: i.channel,
            subject: i.subject,
            summary: i.summary,
            sentiment: i.sentiment,
          })),
          pendingFollowUps: (followUps || []).map((f: any) => ({
            id: f.id,
            title: f.title,
            due_date: f.due_date,
            priority: f.priority,
          })),
        },
        provenance: { table: 'workspace_contacts', id: contactId, workspace_id: this.workspaceId },
      })
      return
    }

    // If not found in contacts, check companies
    const { data: wsCompanies } = await (this.supabase as any)
      .from('workspace_companies')
      .select('company_id, relationship_status, companies(id, name, industry, domain)')
      .eq('workspace_id', this.workspaceId)
      .limit(10)

    const matchedCompanies = (wsCompanies || []).filter((wc: any) => {
      const comp = wc.companies
      return comp?.name?.toLowerCase().includes(query.toLowerCase())
    })

    if (matchedCompanies.length > 0) {
      const companyMatch = matchedCompanies[0]
      const companyId = companyMatch.company_id
      const comp = companyMatch.companies

      // Relational Traversal: Company -> Workspace Contacts -> Interactions
      const { data: compContacts } = await (this.supabase as any)
        .from('workspace_contacts')
        .select('contact_id')
        .eq('workspace_id', this.workspaceId)
        .eq('company_id', companyId)

      const contactIds = (compContacts || []).map((cc: any) => cc.contact_id)
      let companyInteractions: any[] = []

      if (contactIds.length > 0) {
        const { data: inters } = await (this.supabase as any)
          .from('interactions')
          .select('id, contact_id, interaction_type, subject, summary, interaction_date')
          .eq('workspace_id', this.workspaceId)
          .in('contact_id', contactIds)
          .order('interaction_date', { ascending: false })
          .limit(5)
        companyInteractions = inters || []
      }

      records.push({
        entityType: 'crm',
        entityId: companyId,
        title: comp?.name,
        timestamps: {},
        relationship: { companyId },
        epistemicClass: 'WV_RECORD',
        fields: {
          type: 'company',
          status: companyMatch.relationship_status,
          industry: comp?.industry,
          domain: comp?.domain,
          associatedContactsCount: contactIds.length,
          recentInteractionsViaContacts: companyInteractions.map((i: any) => ({
            id: i.id,
            date: i.interaction_date,
            subject: i.subject,
            summary: i.summary,
          })),
        },
        provenance: { table: 'workspace_companies', id: companyId, workspace_id: this.workspaceId },
      })
      return
    }

    emptyStates.push({
      domain: 'crm',
      query,
      message: `No CRM contact or company matching "${query}" was found.`,
    })
  }

  // --------------------------------------------------------------------------
  // 3. Operational Tasks Contract
  // --------------------------------------------------------------------------
  private async retrieveTasks(
    intent: any,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    let queryBuilder = (this.supabase as any)
      .from('tasks')
      .select('id, project_id, title, description, status, priority, due_date, completed_at, created_at, workspace_projects(title, slug)')
      .eq('workspace_id', this.workspaceId)

    if (intent.statusFilter === 'completed') {
      queryBuilder = queryBuilder.eq('status', 'completed')
    } else if (intent.statusFilter === 'open') {
      queryBuilder = queryBuilder.in('status', ['todo', 'in_progress', 'blocked'])
    }

    if (intent.entityQuery) {
      // If entity query matches a project, filter tasks by that project
      const { data: matchedProjects } = await (this.supabase as any)
        .from('workspace_projects')
        .select('id')
        .eq('workspace_id', this.workspaceId)
        .or(`slug.ilike.%${intent.entityQuery}%,title.ilike.%${intent.entityQuery}%`)
        .limit(1)

      if (matchedProjects && matchedProjects.length > 0) {
        queryBuilder = queryBuilder.eq('project_id', matchedProjects[0].id)
      } else {
        queryBuilder = queryBuilder.ilike('title', `%${intent.entityQuery}%`)
      }
    }

    const { data: tasks, error } = await queryBuilder
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .limit(20)

    if (completeness) {
      completeness.push({
        domain: 'task',
        queryMode: 'catalog',
        resultScope: intent.statusFilter || intent.entityQuery ? 'filtered' : 'bounded',
        returnedCount: (tasks || []).length,
        appliedLimit: 20,
        filterDescription: intent.statusFilter ? `status: ${intent.statusFilter}` : undefined,
      })
    }

    if (error || !tasks || tasks.length === 0) {
      if (intent.entityQuery) {
        emptyStates.push({
          domain: 'task',
          query: intent.entityQuery,
          message: `No tasks matching "${intent.entityQuery}" were found.`,
        })
      }
      return
    }

    for (const t of tasks) {
      records.push({
        entityType: 'task',
        entityId: t.id,
        title: t.title,
        timestamps: {
          due_date: t.due_date,
          completed_at: t.completed_at,
          created_at: t.created_at,
        },
        relationship: {
          projectId: t.project_id || undefined,
          projectTitle: t.workspace_projects?.title || undefined,
        },
        epistemicClass: 'WV_RECORD',
        fields: {
          status: t.status,
          priority: t.priority,
          description: t.description,
          projectTitle: t.workspace_projects?.title || null,
        },
        provenance: { table: 'tasks', id: t.id, workspace_id: this.workspaceId },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 4. Decisions Contract
  // --------------------------------------------------------------------------
  private async retrieveDecisions(
    query: string | undefined,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    let queryBuilder = (this.supabase as any)
      .from('decisions')
      .select('id, project_id, title, decision, context, reasoning, alternatives_considered, consequences, decided_at, workspace_projects(title, slug)')
      .eq('workspace_id', this.workspaceId)

    if (query) {
      // Check if query is a project name
      const { data: prj } = await (this.supabase as any)
        .from('workspace_projects')
        .select('id')
        .eq('workspace_id', this.workspaceId)
        .or(`slug.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(1)

      if (prj && prj.length > 0) {
        queryBuilder = queryBuilder.eq('project_id', prj[0].id)
      } else {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,decision.ilike.%${query}%`)
      }
    }

    const { data: decisions, error } = await queryBuilder
      .order('decided_at', { ascending: false })
      .limit(10)

    if (completeness) {
      completeness.push({
        domain: 'decision',
        queryMode: query ? 'targeted' : 'catalog',
        resultScope: query ? 'filtered' : 'bounded',
        returnedCount: (decisions || []).length,
        appliedLimit: 10,
        filterDescription: query ? `query: ${query}` : undefined,
      })
    }

    if (error || !decisions || decisions.length === 0) {
      if (query) {
        emptyStates.push({
          domain: 'decision',
          query,
          message: `No decisions matching "${query}" were found.`,
        })
      }
      return
    }

    for (const d of decisions) {
      records.push({
        entityType: 'decision',
        entityId: d.id,
        title: d.title,
        timestamps: { decided_at: d.decided_at },
        relationship: {
          projectId: d.project_id || undefined,
          projectTitle: d.workspace_projects?.title || undefined,
        },
        epistemicClass: 'WV_RECORD',
        fields: {
          decision: d.decision,
          context: d.context,
          reasoning: d.reasoning,
          alternatives_considered: d.alternatives_considered,
          consequences: d.consequences,
          projectTitle: d.workspace_projects?.title || null,
        },
        provenance: { table: 'decisions', id: d.id, workspace_id: this.workspaceId },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 5. Research + Research Evidence Contract
  // --------------------------------------------------------------------------
  private async retrieveResearch(
    query: string | undefined,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    let queryBuilder = (this.supabase as any)
      .from('research_records')
      .select('id, title, research_type, status, priority, research_question, objective, summary, findings, conclusion, next_action, completed_at, created_at')
      .eq('workspace_id', this.workspaceId)

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,research_question.ilike.%${query}%,summary.ilike.%${query}%`)
    }

    const { data: researchList, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(5)

    if (completeness) {
      completeness.push({
        domain: 'research',
        queryMode: query ? 'targeted' : 'catalog',
        resultScope: query ? 'filtered' : 'bounded',
        returnedCount: (researchList || []).length,
        appliedLimit: 5,
        filterDescription: query ? `query: ${query}` : undefined,
      })
    }

    if (error || !researchList || researchList.length === 0) {
      if (query) {
        emptyStates.push({
          domain: 'research',
          query,
          message: `No research records matching "${query}" were found.`,
        })
      }
      return
    }

    for (const r of researchList) {
      // Fetch associated sources and evidence
      const { data: sources } = await (this.supabase as any)
        .from('research_sources')
        .select('id, title, source_type, url, publisher, author, published_at')
        .eq('workspace_id', this.workspaceId)
        .eq('research_record_id', r.id)
        .limit(5)

      const { data: evidence } = await (this.supabase as any)
        .from('research_evidence')
        .select('id, source_id, evidence_text, claim_summary, context_location')
        .eq('workspace_id', this.workspaceId)
        .eq('research_record_id', r.id)
        .limit(5)

      records.push({
        entityType: 'research',
        entityId: r.id,
        title: r.title,
        timestamps: {
          created_at: r.created_at,
          completed_at: r.completed_at,
        },
        relationship: {},
        epistemicClass: 'WV_RECORD',
        fields: {
          research_type: r.research_type,
          workflow_status: r.status, // NOTE: status = 'completed' means workflow completed, NOT external truth
          research_question: r.research_question,
          summary: r.summary,
          findings: r.findings,
          conclusion: r.conclusion,
          sources: (sources || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            type: s.source_type,
            url: s.url,
            author: s.author,
          })),
          evidenceItems: (evidence || []).map((ev: any) => ({
            id: ev.id,
            evidence_text: ev.evidence_text, // Exact verbatim quote
            claim_summary: ev.claim_summary, // Interpretation/summary
            context_location: ev.context_location, // Source location
            epistemicClass: 'RESEARCH_EVIDENCE',
          })),
        },
        provenance: { table: 'research_records', id: r.id, workspace_id: this.workspaceId },
      })

      // Emit discrete records for linked evidence items with epistemicClass: RESEARCH_EVIDENCE
      for (const ev of (evidence || [])) {
        records.push({
          entityType: 'research',
          entityId: ev.id,
          title: `Evidence: ${ev.claim_summary || (ev.evidence_text ? ev.evidence_text.slice(0, 48) : 'Evidence Item')}`,
          timestamps: {},
          relationship: {
            researchRecordId: r.id,
            researchRecordTitle: r.title,
            sourceId: ev.source_id,
          },
          epistemicClass: 'RESEARCH_EVIDENCE',
          fields: {
            evidence_text: ev.evidence_text,
            claim_summary: ev.claim_summary,
            context_location: ev.context_location,
            source_linked: Boolean(ev.source_id),
          },
          provenance: { table: 'research_evidence', id: ev.id, workspace_id: this.workspaceId },
        })
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Meetings Contract
  // --------------------------------------------------------------------------
  private async retrieveMeetings(
    intent: any,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    let queryBuilder = (this.supabase as any)
      .from('meetings')
      .select('id, project_id, title, meeting_type, status, scheduled_at, ended_at, agenda, notes, outcomes, workspace_projects(title)')
      .eq('workspace_id', this.workspaceId)

    if (intent.timeframe === 'upcoming') {
      queryBuilder = queryBuilder.gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true })
    } else {
      queryBuilder = queryBuilder.order('scheduled_at', { ascending: false })
    }

    const { data: meetings } = await queryBuilder.limit(5)

    if (completeness) {
      completeness.push({
        domain: 'meeting',
        queryMode: 'catalog',
        resultScope: 'bounded',
        returnedCount: (meetings || []).length,
        appliedLimit: 5,
      })
    }

    if (!meetings || meetings.length === 0) return

    for (const m of meetings) {
      const { data: participants } = await (this.supabase as any)
        .from('meeting_participants')
        .select('name, email, role, attendance_status')
        .eq('meeting_id', m.id)
        .limit(10)

      records.push({
        entityType: 'meeting',
        entityId: m.id,
        title: m.title,
        timestamps: {
          scheduled_at: m.scheduled_at,
          ended_at: m.ended_at,
        },
        relationship: {
          projectId: m.project_id || undefined,
          projectTitle: m.workspace_projects?.title || undefined,
        },
        epistemicClass: 'WV_RECORD',
        fields: {
          meeting_type: m.meeting_type,
          status: m.status,
          agenda: m.agenda,
          notes: m.notes,
          outcomes: m.outcomes,
          participants: (participants || []).map((p: any) => ({
            name: p.name,
            role: p.role,
            status: p.attendance_status,
          })),
        },
        provenance: { table: 'meetings', id: m.id, workspace_id: this.workspaceId },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 7. Metrics + Targets + Observations Contract
  // --------------------------------------------------------------------------
  private async retrieveMetrics(
    query: string | undefined,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    let queryBuilder = (this.supabase as any)
      .from('workspace_metrics')
      .select('id, project_id, name, key, description, category, unit_type, unit_symbol, direction, measurement_type, cadence, status, workspace_projects(title)')
      .eq('workspace_id', this.workspaceId)

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,key.ilike.%${query}%`)
    }

    const { data: metrics } = await queryBuilder.limit(5)

    if (completeness) {
      completeness.push({
        domain: 'metric',
        queryMode: query ? 'targeted' : 'catalog',
        resultScope: query ? 'filtered' : 'bounded',
        returnedCount: (metrics || []).length,
        appliedLimit: 5,
        filterDescription: query ? `query: ${query}` : undefined,
      })
    }

    if (!metrics || metrics.length === 0) return

    for (const m of metrics) {
      // Fetch targets
      const { data: targets } = await (this.supabase as any)
        .from('workspace_metric_targets')
        .select('target_value, start_date, end_date')
        .eq('workspace_id', this.workspaceId)
        .eq('metric_id', m.id)
        .limit(3)

      // Fetch ordered observations
      const { data: observations } = await (this.supabase as any)
        .from('workspace_metric_observations')
        .select('value, observed_at, notes')
        .eq('workspace_id', this.workspaceId)
        .eq('metric_id', m.id)
        .order('observed_at', { ascending: true })
        .limit(10)

      // Compute trend only if >= 2 observations exist
      let computedTrend: 'upward' | 'downward' | 'stable' | 'insufficient_observations' = 'insufficient_observations'
      if (observations && observations.length >= 2) {
        const first = observations[0].value
        const last = observations[observations.length - 1].value
        if (last > first) computedTrend = 'upward'
        else if (last < first) computedTrend = 'downward'
        else computedTrend = 'stable'
      }

      records.push({
        entityType: 'metric',
        entityId: m.id,
        title: m.name,
        timestamps: {},
        relationship: {
          projectId: m.project_id || undefined,
          projectTitle: m.workspace_projects?.title || undefined,
        },
        epistemicClass: 'WV_RECORD',
        fields: {
          key: m.key,
          category: m.category,
          unit_type: m.unit_type,
          unit_symbol: m.unit_symbol,
          desired_direction: m.direction, // Desired direction, NOT trend!
          computed_trend: computedTrend, // Derived strictly from observations
          activeTargets: targets || [],
          recentObservations: (observations || []).map((o: any) => ({
            value: o.value,
            observed_at: o.observed_at,
            notes: o.notes,
          })),
        },
        provenance: { table: 'workspace_metrics', id: m.id, workspace_id: this.workspaceId },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 8. Reviews Contract
  // --------------------------------------------------------------------------
  private async retrieveReviews(
    query: string | undefined,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    let queryBuilder = (this.supabase as any)
      .from('reviews')
      .select('id, title, review_type, status, period_start, period_end, objective, expected_outcome, actual_outcome, what_worked, what_did_not_work, why, lessons, next_changes, summary, completed_at')
      .eq('workspace_id', this.workspaceId)

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,objective.ilike.%${query}%`)
    }

    const { data: reviews } = await queryBuilder.order('created_at', { ascending: false }).limit(5)

    if (completeness) {
      completeness.push({
        domain: 'review',
        queryMode: query ? 'targeted' : 'catalog',
        resultScope: query ? 'filtered' : 'bounded',
        returnedCount: (reviews || []).length,
        appliedLimit: 5,
        filterDescription: query ? `query: ${query}` : undefined,
      })
    }

    if (!reviews || reviews.length === 0) return

    for (const r of reviews) {
      records.push({
        entityType: 'review',
        entityId: r.id,
        title: r.title,
        timestamps: {
          period_start: r.period_start,
          period_end: r.period_end,
          completed_at: r.completed_at,
        },
        relationship: {},
        epistemicClass: 'WV_RECORD',
        fields: {
          review_type: r.review_type,
          workflow_status: r.status, // Completed means review lifecycle completed, not success!
          objective: r.objective,
          expected_outcome: r.expected_outcome,
          actual_outcome: r.actual_outcome,
          what_worked: r.what_worked,
          what_did_not_work: r.what_did_not_work,
          why: r.why,
          lessons: r.lessons,
          next_changes: r.next_changes,
          summary: r.summary,
        },
        provenance: { table: 'reviews', id: r.id, workspace_id: this.workspaceId },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 9. Workspace Evidence Contract
  // --------------------------------------------------------------------------
  private async retrieveWorkspaceEvidence(
    query: string | undefined,
    records: VaultRecord[],
    ambiguities: AmbiguityItem[],
    emptyStates: NotFoundItem[],
    completeness?: CollectionCompleteness[]
  ) {
    let queryBuilder = (this.supabase as any)
      .from('workspace_evidence')
      .select('id, project_id, title, evidence_type, public_claim, public_summary, result_statement, internal_notes, approval_status, approved_at, workspace_projects(title)')
      .eq('workspace_id', this.workspaceId)

    if (query) {
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,public_claim.ilike.%${query}%`)
    }

    const { data: evidenceList } = await queryBuilder.limit(5)

    if (completeness) {
      completeness.push({
        domain: 'evidence',
        queryMode: query ? 'targeted' : 'catalog',
        resultScope: query ? 'filtered' : 'bounded',
        returnedCount: (evidenceList || []).length,
        appliedLimit: 5,
        filterDescription: query ? `query: ${query}` : undefined,
      })
    }

    if (!evidenceList || evidenceList.length === 0) return

    for (const ev of evidenceList) {
      // Check portfolio bridge state (is it actually published?)
      const { data: bridges } = await (this.supabase as any)
        .from('portfolio_evidence_bridges')
        .select('id, public_project_id, public_case_study_id, detached_at')
        .eq('workspace_id', this.workspaceId)
        .eq('evidence_id', ev.id)
        .is('detached_at', null)

      const isPublished = Boolean(bridges && bridges.length > 0)

      records.push({
        entityType: 'evidence',
        entityId: ev.id,
        title: ev.title,
        timestamps: {
          approved_at: ev.approved_at,
        },
        relationship: {
          projectId: ev.project_id || undefined,
          projectTitle: ev.workspace_projects?.title || undefined,
          isPublishedToPublicPortfolio: isPublished,
        },
        epistemicClass: 'WORKSPACE_EVIDENCE',
        fields: {
          evidence_type: ev.evidence_type,
          internal_approval_status: ev.approval_status, // Approved = internal approval, NOT public publication
          is_publicly_published: isPublished,
          public_claim: ev.public_claim,
          public_summary: ev.public_summary,
          result_statement: ev.result_statement,
          internal_notes: ev.internal_notes,
        },
        provenance: { table: 'workspace_evidence', id: ev.id, workspace_id: this.workspaceId },
      })
    }
  }

  // --------------------------------------------------------------------------
  // 10. Activity Digest Contract
  // --------------------------------------------------------------------------
  private async retrieveActivityDigest(
    timeframe: any,
    records: VaultRecord[],
    completeness?: CollectionCompleteness[]
  ) {
    if (completeness) {
      completeness.push({
        domain: 'activity',
        queryMode: 'catalog',
        resultScope: 'bounded',
        returnedCount: 1,
        filterDescription: timeframe?.label || 'Recent',
      })
    }

    const startIso = timeframe?.startIso || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const endIso = timeframe?.endIso || new Date().toISOString()

    // 1. Completed tasks in window
    const { data: completedTasks } = await (this.supabase as any)
      .from('tasks')
      .select('id, title, status, priority, completed_at, workspace_projects(title)')
      .eq('workspace_id', this.workspaceId)
      .eq('status', 'completed')
      .gte('completed_at', startIso)
      .lte('completed_at', endIso)
      .order('completed_at', { ascending: false })
      .limit(10)

    // 2. Decisions made in window
    const startDateString = timeframe?.startDateString || startIso.slice(0, 10)
    const endDateString = timeframe?.endDateString || endIso.slice(0, 10)

    const { data: decisions } = await (this.supabase as any)
      .from('decisions')
      .select('id, title, decision, decided_at, workspace_projects(title)')
      .eq('workspace_id', this.workspaceId)
      .gte('decided_at', startDateString)
      .lte('decided_at', endDateString)
      .order('decided_at', { ascending: false })
      .limit(5)

    // 3. Interactions logged in window
    const { data: interactions } = await (this.supabase as any)
      .from('interactions')
      .select('id, interaction_type, subject, summary, interaction_date, contact_id, contacts(display_name)')
      .eq('workspace_id', this.workspaceId)
      .gte('interaction_date', startIso)
      .lte('interaction_date', endIso)
      .order('interaction_date', { ascending: false })
      .limit(10)

    records.push({
      entityType: 'activity',
      entityId: `activity-${startIso.slice(0, 10)}-${endIso.slice(0, 10)}`,
      title: `Activity Digest (${timeframe?.label || 'Recent'})`,
      timestamps: {
        period_start: startIso,
        period_end: endIso,
      },
      epistemicClass: 'WV_RECORD',
      fields: {
        timeframeLabel: timeframe?.label || 'Recent Activity',
        completedTasksCount: (completedTasks || []).length,
        completedTasks: (completedTasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          completed_at: t.completed_at,
          project: t.workspace_projects?.title || null,
        })),
        decisionsCount: (decisions || []).length,
        decisions: (decisions || []).map((d: any) => ({
          id: d.id,
          title: d.title,
          decision: d.decision,
          decided_at: d.decided_at,
          project: d.workspace_projects?.title || null,
        })),
        interactionsCount: (interactions || []).length,
        interactions: (interactions || []).map((i: any) => ({
          id: i.id,
          type: i.interaction_type,
          subject: i.subject,
          date: i.interaction_date,
          contactName: i.contacts?.display_name || null,
        })),
      },
      provenance: { table: 'activity_aggregate', id: 'composite', workspace_id: this.workspaceId },
    })
  }

  // --------------------------------------------------------------------------
  // Phase 2B.2A: Reasoning Plan Execution & Per-Domain Outcome Assembly
  // --------------------------------------------------------------------------
  async executeDomainRequest(
    req: ReasoningDomainRequest,
    temporalWindow?: any
  ): Promise<DomainOutcome> {
    const domainRecords: VaultRecord[] = []
    const domainAmbiguities: AmbiguityItem[] = []
    const domainEmptyStates: NotFoundItem[] = []
    const domainCompleteness: CollectionCompleteness[] = []
    let domainError: string | undefined = undefined

    try {
      switch (req.domain) {
        case 'project':
          await this.retrieveProjectContext(
            req.entityTarget,
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'crm':
          await this.retrieveCrmContext(
            req.entityTarget,
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'task':
          await this.retrieveTasks(
            {
              entityQuery: req.entityTarget,
              statusFilter: req.statusFilter,
              timeframe: req.temporalFilter,
            },
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'decision':
          await this.retrieveDecisions(
            req.entityTarget,
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'research':
          await this.retrieveResearch(
            req.entityTarget,
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'meeting':
          await this.retrieveMeetings(
            { timeframe: req.temporalFilter, entityQuery: req.entityTarget },
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'metric':
          await this.retrieveMetrics(
            req.entityTarget,
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'review':
          await this.retrieveReviews(
            req.entityTarget,
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'evidence':
          await this.retrieveWorkspaceEvidence(
            req.entityTarget,
            domainRecords,
            domainAmbiguities,
            domainEmptyStates,
            domainCompleteness
          )
          break

        case 'activity':
          await this.retrieveActivityDigest(temporalWindow, domainRecords, domainCompleteness)
          break
      }
    } catch (err: any) {
      domainError = err?.message || 'Domain retrieval error'
    }

    // Determine domain outcome status
    let status: DomainOutcomeStatus
    if (domainError) {
      status = 'UNAVAILABLE'
    } else if (domainAmbiguities.length > 0) {
      status = 'AMBIGUOUS'
    } else if (domainRecords.length === 0) {
      const comp = domainCompleteness.find((c) => c.domain === req.domain)
      if (comp?.resultScope === 'exhaustive') {
        status = 'CONFIRMED_EMPTY'
      } else {
        status = 'LIMITED_EMPTY'
      }
    } else {
      status = 'AVAILABLE'
    }

    // Enforce request limit if specified and truncate safely
    let records = domainRecords
    if (req.limit && records.length > req.limit) {
      records = records.slice(0, req.limit)
    }

    return {
      domain: req.domain,
      importance: req.importance,
      status,
      returnedCount: records.length,
      completeness: domainCompleteness.find((c) => c.domain === req.domain),
      ambiguity: domainAmbiguities[0],
      error: domainError,
      records,
    }
  }

  async executeReasoningPlan(
    plan: ReasoningPlan
  ): Promise<{ domainOutcomes: DomainOutcome[]; totalLatencyMs: number }> {
    const startTime = Date.now()

    // Execute independent domains concurrently safely
    const promises = plan.domainRequests.map((req) =>
      this.executeDomainRequest(req, plan.temporalWindow)
    )
    const domainOutcomes = await Promise.all(promises)

    return {
      domainOutcomes,
      totalLatencyMs: Date.now() - startTime,
    }
  }
}

export async function executeVaultRetrieval(
  supabase: SupabaseClient<any, any, any> | any,
  workspaceId: string,
  plan: RetrievalPlan
): Promise<VaultContextEnvelope> {
  const service = new VaultRetrievalService(supabase, workspaceId)
  return service.executePlan(plan)
}

export async function executeVaultReasoningPlan(
  supabase: SupabaseClient<any, any, any> | any,
  workspaceId: string,
  plan: ReasoningPlan
): Promise<{ domainOutcomes: DomainOutcome[]; totalLatencyMs: number }> {
  const service = new VaultRetrievalService(supabase, workspaceId)
  return service.executeReasoningPlan(plan)
}
