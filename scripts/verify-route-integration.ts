/**
 * Waynex Vault — SHAW Chat Route Integration Verification Suite
 *
 * Exercises the real executeShawChatTurn handler (the backend of /api/vault/shaw/chat)
 * in safe, isolated memory without accessing or mutating production database records.
 *
 * Verifies:
 * 1. Multi-domain reasoning (PROJECT_PROGRESS on Snip3rash)
 * 2. Single-domain retrieval (tasks query)
 * 3. Ordinary chat (incremental live token streaming)
 * 4. SSE framing (headers, event syntax, wire format)
 * 5. Successful validated publication
 * 6. Rejected answer withholding (unmodeled absence claim)
 * 7. Provider interruption mid-stream
 * 8. Client cancellation (reader.cancel)
 * 9. Persistence success and failure handling
 * 10. Visible text vs saved text consistency
 * 11. Internal provenance preservation and citation mapping
 * 12. Legitimate recorded percentages approval
 * 13. Unsupported qualitative progress claims rejection
 */

import assert from 'node:assert'
import { NextRequest } from 'next/server'
import { executeShawChatTurn } from '../lib/vault/shaw/chat-service'
import { ShawStreamChunk, ShawRoutingMode } from '../lib/vault/shaw/types'

let passedTests = 0

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passedTests++
      console.log(`  ✓ ${name}`)
    })
    .catch((err) => {
      console.error(`  ✗ FAIL: ${name}`)
      console.error(err)
      process.exit(1)
    })
}

// ----------------------------------------------------------------------------
// Mock Infrastructure
// ----------------------------------------------------------------------------

interface MockDbState {
  workspaceMembers?: any[]
  conversations?: any[]
  messages?: any[]
  aiRuns?: any[]
  projects?: any[]
  tasks?: any[]
  decisions?: any[]
  metrics?: any[]
  reviews?: any[]
  shouldFailMessageInsert?: boolean
}

function createMockSupabase(state: MockDbState = {}) {
  const messages: any[] = state.messages ? [...state.messages] : []
  const aiRuns: any[] = state.aiRuns ? [...state.aiRuns] : []
  const conversations: any[] = state.conversations ? [...state.conversations] : [
    {
      id: 'conv-1',
      workspace_id: 'ws-1',
      title: 'Test Session',
      identity: null,
      selected_model: 'gemini-2.5-flash',
    },
  ]

  const client = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', email: 'test@waynex.dev' } },
        error: null,
      }),
    },
    from: (table: string) => {
      return {
        select: (cols?: string) => {
          let currentTableData: any[] = []
          if (table === 'workspace_members') {
            currentTableData = state.workspaceMembers || [{ role: 'owner', workspace_id: 'ws-1', user_id: 'user-1' }]
          } else if (table === 'shaw_conversations') {
            currentTableData = conversations
          } else if (table === 'shaw_messages') {
            currentTableData = messages
          } else if (table === 'shaw_user_preferences') {
            currentTableData = [{ workspace_id: 'ws-1', user_id: 'user-1', allow_paid_fallback: false }]
          } else if (table === 'workspace_projects') {
            currentTableData = state.projects || []
          } else if (table === 'tasks') {
            currentTableData = state.tasks || []
          } else if (table === 'workspace_decisions') {
            currentTableData = state.decisions || []
          } else if (table === 'workspace_metrics') {
            currentTableData = state.metrics || []
          } else if (table === 'workspace_metric_targets') {
            currentTableData = (state as any).metricTargets || []
          } else if (table === 'workspace_metric_observations') {
            currentTableData = (state as any).metricObservations || [{ value: 75, metric_id: 'm-1' }]
          } else if (table === 'workspace_reviews') {
            currentTableData = state.reviews || []
          }

          const builder: any = {
            eq: (_col: string, val: any) => builder,
            order: (_col: string, _opts: any) => builder,
            limit: (_n: number) => builder,
            ilike: (_col: string, _val: any) => builder,
            in: (_col: string, _vals: any[]) => builder,
            or: (_clause: string) => builder,
            maybeSingle: async () => ({
              data: currentTableData.length > 0 ? currentTableData[0] : null,
              error: null,
            }),
            then: (resolve: any) => resolve({ data: currentTableData, error: null }),
          }
          return builder
        },
        insert: (row: any) => {
          if (table === 'shaw_messages') {
            if (state.shouldFailMessageInsert || (state as any).shouldFailAssistantInsert && row.role === 'assistant') {
              throw new Error('Database connection failed on message insert')
            }
            const record = { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...row }
            messages.push(record)
            return {
              select: () => ({
                maybeSingle: async () => ({ data: record, error: null }),
              }),
            }
          }
          if (table === 'shaw_ai_runs') {
            const run = { id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...row }
            aiRuns.push(run)
            return {
              select: () => ({
                maybeSingle: async () => ({ data: run, error: null }),
              }),
            }
          }
          return {
            select: () => ({
              maybeSingle: async () => ({ data: { id: 'mock-id', ...row }, error: null }),
            }),
          }
        },
        update: (updates: any) => {
          return {
            eq: (_col: string, val: any) => {
              if (table === 'shaw_ai_runs') {
                const run = aiRuns.find((r) => r.id === val)
                if (run) Object.assign(run, updates)
              }
              if (table === 'shaw_conversations') {
                const conv = conversations.find((c) => c.id === val)
                if (conv) Object.assign(conv, updates)
              }
              return Promise.resolve({ data: null, error: null })
            },
          }
        },
      }
    },
    _getMessages: () => messages,
    _getAiRuns: () => aiRuns,
  }

  return client
}

function createMockStream(chunks: ShawStreamChunk[]): ReadableStream<ShawStreamChunk> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })
}

function createMockRouteRequestFn(chunks: ShawStreamChunk[]) {
  return async () => ({
    stream: createMockStream(chunks),
    provider: 'gemini' as any,
    model: 'gemini-2.5-flash',
    wasFallback: false,
    getUsage: () => ({
      tokensIn: 120,
      tokensOut: 60,
      latencyMs: 180,
      finishReason: 'stop' as any,
    }),
  })
}

async function consumeSse(response: Response): Promise<{ events: any[]; rawChunks: string[] }> {
  assert(response.body !== null, 'Response body must not be null')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const events: any[] = []
  const rawChunks: string[] = []
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    rawChunks.push(text)
    buffer += text

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data:')) {
        const jsonStr = trimmed.slice(5).trim()
        if (jsonStr) {
          try {
            events.push(JSON.parse(jsonStr))
          } catch {}
        }
      }
    }
  }

  return { events, rawChunks }
}

function createChatRequest(message: string, extra: Record<string, any> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/vault/shaw/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workspaceId: 'ws-1',
      conversationId: 'conv-1',
      message,
      capability: 'ask',
      routingMode: 'auto_free_first',
      ...extra,
    }),
  })
}

// ----------------------------------------------------------------------------
// Test Execution
// ----------------------------------------------------------------------------

async function runAllIntegrationTests() {
  console.log('\n=== SHAW Chat Route Integration Verification Suite ===\n')

  // 1. Multi-domain reasoning publication (PROJECT_PROGRESS on Snip3rash)
  await test('INT-1. Multi-domain reasoning (PROJECT_PROGRESS): gated publication emits single clean chunk', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active', priority: 'urgent' }],
      tasks: [{ id: 't-1', title: 'October objective', status: 'todo', project_id: 'p-1' }],
    })
    const candidateText = `Progress Report: Snip3rash Trading Academy

What is recorded:
- Project: "Snip3rash trading academy" is active.
- Task: "October objective" is todo. One task is linked to the project. It is still open, and no linked task is recorded as completed.

What is missing:
- No review records were found in the records checked.

[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidateText.slice(0, 100) },
      { type: 'text', text: candidateText.slice(100) },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy based only on my Vault records.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })

    assert.strictEqual(res.status, 200)
    assert.strictEqual(res.headers.get('Content-Type'), 'text/event-stream; charset=utf-8')

    const { events } = await consumeSse(res)
    const textEvents = events.filter((e) => e.type === 'text')
    const doneEvents = events.filter((e) => e.type === 'done')

    // Zero incremental chunks: exactly ONE approved text chunk published
    assert.strictEqual(textEvents.length, 1, 'Controlled publication must emit exactly 1 text chunk')
    assert(!textEvents[0].text.includes('[SOURCES:'), 'Emitted text must conceal protocol tags')
    assert.strictEqual(doneEvents.length, 1)
    assert(doneEvents[0].citations.length >= 1, 'Citations must be attached to done event')

    // Persistence: 1 assistant message persisted
    const savedMessages = mockDb._getMessages().filter((m: any) => m.role === 'assistant')
    assert.strictEqual(savedMessages.length, 1)
    assert.strictEqual(savedMessages[0].content, textEvents[0].text)
  })

  // 2. Single-domain retrieval (Tasks query)
  await test('INT-2. Single-domain retrieval: uses unified publication decision and minimal evidence contract', async () => {
    const mockDb = createMockSupabase({
      tasks: [
        { id: 't-1', title: 'Review audit report', status: 'todo' },
        { id: 't-2', title: 'Push build artifacts', status: 'todo' },
      ],
    })
    const candidate = `Here are your open tasks from the Vault:
- Review audit report (todo)
- Push build artifacts (todo)

[SOURCES: S1, S2 | BASIS: DIRECT_FACT]`

    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('What tasks do I have?')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })

    assert.strictEqual(res.status, 200)
    const { events } = await consumeSse(res)
    const textEvents = events.filter((e) => e.type === 'text')

    // Single-domain retrieval is now guarded by controlled publication!
    assert.strictEqual(textEvents.length, 1)
    assert(!textEvents[0].text.includes('[SOURCES:'))
    assert(textEvents[0].text.includes('Review audit report'))
  })

  // 3. Ordinary chat (Streaming live tokens without buffering)
  await test('INT-3. Ordinary conversational request: streams chunks live without buffering', async () => {
    const mockDb = createMockSupabase()
    const chunks = ['Leaves ', 'fall ', 'softly, ', 'code ', 'runs ', 'clean.']
    const routeRequestFn = createMockRouteRequestFn([
      ...chunks.map((text) => ({ type: 'text' as const, text })),
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Write a short haiku about autumn code.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })

    assert.strictEqual(res.status, 200)
    const { events } = await consumeSse(res)
    const textEvents = events.filter((e) => e.type === 'text')

    // Ordinary conversation must stream every chunk live!
    assert.strictEqual(textEvents.length, 6, 'Must emit 6 separate text chunks live')
    assert.strictEqual(textEvents.map((e) => e.text).join(''), 'Leaves fall softly, code runs clean.')
  })

  // 4. SSE wire framing compliance
  await test('INT-4. SSE framing: verifies Content-Type, headers, and data JSON framing syntax', async () => {
    const mockDb = createMockSupabase()
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: 'Hello Wayne.' },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Hello')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })

    assert.strictEqual(res.headers.get('Content-Type'), 'text/event-stream; charset=utf-8')
    assert.strictEqual(res.headers.get('Cache-Control'), 'no-cache, no-transform')
    assert.strictEqual(res.headers.get('Connection'), 'keep-alive')

    const { rawChunks } = await consumeSse(res)
    const fullWireText = rawChunks.join('')
    const lines = fullWireText.split('\n').filter((l) => l.trim().length > 0)
    for (const l of lines) {
      assert(l.startsWith('data: '), `Wire frame line must begin with "data: ", got: ${l}`)
      assert.doesNotThrow(() => JSON.parse(l.slice(5)), `Data line must contain valid JSON: ${l}`)
    }
  })

  // 5. Successful validated publication
  await test('INT-5. Validated publication: emits approved content and updates ai_run to completed', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
      tasks: [{ id: 't-1', title: 'October objective', status: 'todo', project_id: 'p-1' }],
    })
    const candidate = `Snip3rash Progress: One task is linked to the project. It is still open, and no linked task is recorded as completed. [SOURCES: S1 | BASIS: DIRECT_FACT]`
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy based only on my Vault records.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    assert(events.some((e) => e.type === 'text'))
    const aiRuns = mockDb._getAiRuns()
    assert(aiRuns.length > 0)
    const lastRun = aiRuns[aiRuns.length - 1]
    assert.strictEqual(lastRun.status, 'completed')
  })

  // 6. Rejected answer withholding (unmodeled absence claim)
  await test('INT-6. Rejected answer withholding: unmodeled absence claim withheld with zero visible text', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
      tasks: [{ id: 't-1', title: 'October objective', status: 'todo', project_id: 'p-1' }],
    })
    // Candidate makes unmodeled absence assertion about milestones
    const badCandidate = `Progress report: Milestones are undocumented in your Vault records. [SOURCES: S1 | BASIS: DIRECT_FACT]`
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: badCandidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy based only on my Vault records.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    const textEvents = events.filter((e) => e.type === 'text')
    const errorEvents = events.filter((e) => e.type === 'error')

    // ZERO text chunks published!
    assert.strictEqual(textEvents.length, 0, 'Rejected response must withhold 100% of generated text')
    assert.strictEqual(errorEvents.length, 1)
    assert(errorEvents[0].error.includes("couldn't verify this answer against the available Vault records"))
    assert.strictEqual(errorEvents[0].errorCategory, 'evidence_withheld')

    // ZERO assistant messages saved
    const savedMessages = mockDb._getMessages().filter((m: any) => m.role === 'assistant')
    assert.strictEqual(savedMessages.length, 0, 'Withheld response must never be persisted to shaw_messages')

    // AI run status is marked failed
    const lastRun = mockDb._getAiRuns()[0]
    assert.strictEqual(lastRun.status, 'failed')
    assert(lastRun.error_message.includes('Unmodeled construct'))
  })

  // 7. Provider interruption mid-stream
  await test('INT-7. Provider interruption: network drop emits error chunk without saving partial turn', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
    })
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: 'Partial analysis before provider drop...' },
      { type: 'error', error: 'Upstream gateway 504 Gateway Timeout' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    const textEvents = events.filter((e) => e.type === 'text')
    const errorEvents = events.filter((e) => e.type === 'error')

    assert.strictEqual(textEvents.length, 0, 'Interrupted stream must not publish partial text')
    assert.strictEqual(errorEvents.length, 1)
    assert(errorEvents[0].error.includes('504'))

    const savedMessages = mockDb._getMessages().filter((m: any) => m.role === 'assistant')
    assert.strictEqual(savedMessages.length, 0, 'Interrupted stream must not be persisted to messages')
  })

  // 8. Client cancellation
  await test('INT-8. Client cancellation: reader.cancel marks run as client_abort without partial persistence', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
    })
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: 'Long generation...' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })

    assert(res.body !== null)
    const reader = res.body.getReader()
    await reader.cancel('User clicked stop')

    const savedMessages = mockDb._getMessages().filter((m: any) => m.role === 'assistant')
    assert.strictEqual(savedMessages.length, 0, 'Aborted stream must not save assistant message')

    const lastRun = mockDb._getAiRuns()[0]
    assert.strictEqual(lastRun.status, 'failed')
    assert(lastRun.metadata.raw_finish_reason === 'client_abort')
  })

  // 9. Persistence failure handling
  await test('INT-9. Persistence failure: database write exception is safely caught', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
      tasks: [{ id: 't-1', title: 'October objective', status: 'todo', project_id: 'p-1' }],
      shouldFailAssistantInsert: true, // Simulate assistant DB insert failure
    } as any)
    const candidate = `Snip3rash: One task is linked to the project. It is still open, and no linked task is recorded as completed. [SOURCES: S1 | BASIS: DIRECT_FACT]`
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy based only on my Vault records.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    // Stream caught DB failure gracefully and emitted error chunk
    const errorEvents = events.filter((e) => e.type === 'error')
    assert(errorEvents.length >= 1)
    assert(errorEvents[0].error.includes('Database connection failed'))
  })

  // 10. Visible text vs saved text consistency
  await test('INT-10. Visible vs saved consistency: published text strictly matches stored message', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
      tasks: [{ id: 't-1', title: 'October objective', status: 'todo', project_id: 'p-1' }],
    })
    const candidate = `Snip3rash: One task is linked to the project. It is still open, and no linked task is recorded as completed. [SOURCES: S1 | BASIS: DIRECT_FACT]`
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy based only on my Vault records.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    const publishedText = events.find((e) => e.type === 'text')?.text
    const savedMsg = mockDb._getMessages().find((m: any) => m.role === 'assistant')

    assert(publishedText !== undefined)
    assert(savedMsg !== undefined)
    assert.strictEqual(publishedText, savedMsg.content, 'Published SSE text and database text must be identical')
  })

  // 11. Internal provenance preservation & citation resolution
  await test('INT-11. Provenance preservation: protocol tags concealed while citations are resolved', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
      tasks: [{ id: 't-1', title: 'October objective', status: 'todo', project_id: 'p-1' }],
    })
    const candidate = `Snip3rash: One task is linked to the project. It is still open, and no linked task is recorded as completed. [SOURCES: S1, S2 | BASIS: DIRECT_FACT]`
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy based only on my Vault records.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    const textEvent = events.find((e) => e.type === 'text')
    const doneEvent = events.find((e) => e.type === 'done')

    assert(!textEvent.text.includes('[SOURCES:'))
    assert(!textEvent.text.includes('DIRECT_FACT'))
    assert.strictEqual(doneEvent.citations.length, 2)
    assert(doneEvent.citations[0].url.includes('/vault/projects/p-1'))
    assert(doneEvent.citations[1].url.includes('/vault/projects/p-1') || doneEvent.citations[1].url.includes('/vault/tasks/t-1'))
  })

  // 12. Legitimate recorded percentages
  await test('INT-12. Evidence-supported percentages: legitimate metric value is approved and not rejected', async () => {
    const mockDb = createMockSupabase({
      metrics: [
        {
          id: 'm-1',
          name: 'Infrastructure Migration',
          key: 'infra_mig',
          description: 'Infrastructure migration project progress 75% complete',
          category: 'engineering',
          unit_type: 'percentage',
          unit_symbol: '%',
          direction: 'increase',
          status: 'active',
        },
      ],
      metricObservations: [
        { value: 75, metric_id: 'm-1', observed_at: new Date().toISOString(), notes: '75% complete' },
      ],
    } as any)
    const candidate = `According to your Vault metric "Infrastructure Migration", progress is 75% complete. [SOURCES: S1 | BASIS: DIRECT_FACT]`
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Show me my metrics for Infrastructure Migration')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    const textEvents = events.filter((e) => e.type === 'text')
    assert.strictEqual(textEvents.length, 1, 'Legitimate recorded percentage must be approved')
    assert(textEvents[0].text.includes('75% complete'))
  })

  // 13. Unsupported qualitative progress claims
  await test('INT-13. Unsupported qualitative progress: "halfway complete" rejected when 0 tasks are completed', async () => {
    const mockDb = createMockSupabase({
      projects: [{ id: 'p-1', title: 'Snip3rash trading academy', status: 'active' }],
      tasks: [{ id: 't-1', title: 'October objective', status: 'todo', project_id: 'p-1' }],
    })
    const candidate = `Snip3rash Progress: The October objective is halfway complete and nearly ready for launch. [SOURCES: S1 | BASIS: DIRECT_FACT]`
    const routeRequestFn = createMockRouteRequestFn([
      { type: 'text', text: candidate },
      { type: 'done', finishReason: 'stop' },
    ])

    const req = createChatRequest('Give me a progress report on Snip3rash trading academy based only on my Vault records.')
    const res = await executeShawChatTurn(req, { supabase: mockDb, routeRequestFn })
    const { events } = await consumeSse(res)

    const textEvents = events.filter((e) => e.type === 'text')
    const errorEvents = events.filter((e) => e.type === 'error')

    assert.strictEqual(textEvents.length, 0, 'Unsupported qualitative progress claims must be withheld')
    assert.strictEqual(errorEvents.length, 1)
    assert(errorEvents[0].error.includes("couldn't verify this answer against the available Vault records"))
    assert.strictEqual(errorEvents[0].errorCategory, 'evidence_withheld')
  })

  console.log(`\nAll ${passedTests} route integration tests PASSED!\n`)
}

runAllIntegrationTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
