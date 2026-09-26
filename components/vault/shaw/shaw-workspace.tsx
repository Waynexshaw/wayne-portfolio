'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Send,
  Plus,
  Archive,
  Bot,
  Copy,
  Check,
  ShieldCheck,
  ChevronDown,
  Layers,
  ArrowRight,
  Compass,
  PenTool,
  Clock,
  Menu,
  X,
  AlertCircle,
  StopCircle,
} from 'lucide-react'
import {
  ShawConversation,
  ShawMessage,
  ShawCapability,
  ShawRoutingMode,
  ComplianceResult,
} from '@/lib/vault/shaw/types'
import {
  createShawConversationAction,
  getShawConversationDetailAction,
  updateShawConversationAction,
  getShawConversationsAction,
} from '@/lib/vault/shaw-actions'
import { scanVoiceCompliance, sanitizeObviousViolations } from '@/lib/vault/shaw/voice/compliance'
import { VoiceComplianceModal } from './voice-compliance-modal'

interface ShawWorkspaceProps {
  workspaceId: string
  activeIdentity?: any
  initialConversations: ShawConversation[]
  defaultRoutingMode?: ShawRoutingMode
}

export function ShawWorkspace({
  workspaceId,
  activeIdentity,
  initialConversations,
  defaultRoutingMode = 'auto_free_first',
}: ShawWorkspaceProps) {
  const [conversations, setConversations] = useState<ShawConversation[]>(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversations[0]?.id || null
  )
  const [messages, setMessages] = useState<ShawMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false)

  // Stream state
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [streamingText, setStreamingText] = useState<string>('')
  const [streamingMeta, setStreamingMeta] = useState<any>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Composer state
  const [inputMessage, setInputMessage] = useState<string>('')
  const [capability, setCapability] = useState<ShawCapability>('ask')
  const [routingMode, setRoutingMode] = useState<ShawRoutingMode>(defaultRoutingMode)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // UI Drawer / Modals
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null)
  const [isComplianceModalOpen, setIsComplianceModalOpen] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new message / stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Load conversation messages on active id change
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    let isMounted = true
    setIsLoadingMessages(true)
    setErrorMessage(null)

    getShawConversationDetailAction(workspaceId, activeConversationId)
      .then((detail) => {
        if (!isMounted) return
        if (detail) {
          setMessages(detail.messages)
          if (detail.conversation.capability) {
            setCapability(detail.conversation.capability)
          }
          if (detail.conversation.routing_mode) {
            setRoutingMode(detail.conversation.routing_mode)
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Failed to load conversation detail:', err)
        setErrorMessage('Failed to load conversation')
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeConversationId, workspaceId])

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      setErrorMessage(null)
      const res = await createShawConversationAction(workspaceId, {
        title: 'New Conversation',
        identityId: activeIdentity?.id || null,
        capability,
        routingMode,
      })

      if (res.success && res.conversation) {
        setConversations((prev) => [res.conversation!, ...prev])
        setActiveConversationId(res.conversation.id)
        setMessages([])
        setIsMobileDrawerOpen(false)
      } else {
        setErrorMessage(res.error || 'Failed to create conversation')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating conversation')
    }
  }

  // Archive conversation
  const handleArchiveConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateShawConversationAction(workspaceId, convId, { is_archived: true })
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConversationId === convId) {
        const remaining = conversations.filter((c) => c.id !== convId)
        setActiveConversationId(remaining[0]?.id || null)
      }
    } catch (err) {
      console.error('Failed to archive conversation:', err)
    }
  }

  // Submit Prompt & Stream Response
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim()
    if (!textToSend || isStreaming) return

    setErrorMessage(null)

    // Guarantee active conversation exists
    let targetConvId = activeConversationId
    if (!targetConvId) {
      const res = await createShawConversationAction(workspaceId, {
        title: textToSend.slice(0, 48),
        identityId: activeIdentity?.id || null,
        capability,
        routingMode,
      })
      if (!res.success || !res.conversation) {
        setErrorMessage(res.error || 'Failed to initialize conversation')
        return
      }
      setConversations((prev) => [res.conversation!, ...prev])
      targetConvId = res.conversation.id
      setActiveConversationId(targetConvId)
    }

    // Add optimistic user message to view
    const tempUserMsg: ShawMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: targetConvId,
      workspace_id: workspaceId,
      role: 'user',
      content: textToSend,
      citations: [],
      proposed_actions: [],
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, tempUserMsg])
    setInputMessage('')
    setIsStreaming(true)
    setStreamingText('')
    setStreamingMeta(null)

    // Focus input
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/vault/shaw/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          conversationId: targetConvId,
          message: textToSend,
          capability,
          routingMode,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => null)
        const errMsg = errJson?.error || `HTTP ${response.status}: Failed to generate response`
        throw new Error(errMsg)
      }

      if (!response.body) {
        throw new Error('Streaming response body is empty')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let latestMeta: any = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const jsonStr = trimmed.slice(5).trim()
          if (!jsonStr) continue

          try {
            const chunk = JSON.parse(jsonStr)
            if (chunk.type === 'text' && chunk.text) {
              accumulated += chunk.text
              setStreamingText(accumulated)
            } else if (chunk.type === 'meta') {
              latestMeta = chunk
              setStreamingMeta(chunk)
            } else if (chunk.type === 'error') {
              throw new Error(chunk.error || 'Stream error')
            }
          } catch (e: any) {
            if (e.message !== 'Unexpected end of JSON input') {
              console.warn('Chunk parse error:', e)
            }
          }
        }
      }

      // Stream successfully finished, reload messages to get persistent DB record
      const refreshed = await getShawConversationDetailAction(workspaceId, targetConvId)
      if (refreshed) {
        setMessages(refreshed.messages)
      }

      // Refresh conversations list to update title if changed
      const updatedList = await getShawConversationsAction(workspaceId)
      setConversations(updatedList)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Stream aborted by user')
      } else {
        console.error('Chat error:', err)
        setErrorMessage(err.message || 'An error occurred during response generation')
      }
    } finally {
      setIsStreaming(false)
      setStreamingText('')
      abortControllerRef.current = null
    }
  }

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleCheckVoiceCompliance = (text: string) => {
    const res = scanVoiceCompliance(text)
    setComplianceResult(res)
    setIsComplianceModalOpen(true)
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  return (
    <div className="flex h-[calc(100vh-6rem)] rounded-xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden shadow-sm">
      {/* 1. LEFT CONVERSATION SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-foreground">SHAW</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleNewConversation}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary md:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveConversationId(conv.id)
                    setIsMobileDrawerOpen(false)
                  }}
                  className={`group relative flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition-colors ${
                    isActive
                      ? 'bg-secondary font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  }`}
                >
                  <div className="truncate pr-5 flex-1">
                    <div className="truncate font-mono text-[11px]">{conv.title}</div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-70">
                      {new Date(conv.updated_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleArchiveConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity"
                    title="Archive"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Sidebar Footer: Mode info */}
        <div className="p-3 border-t border-border text-[11px] font-mono text-muted-foreground flex items-center justify-between">
          <span>Routing:</span>
          <span className="text-foreground capitalize">{routingMode.replace(/_/g, ' ')}</span>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* 2. MAIN CONVERSATION AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-background/50">
        {/* Header Bar */}
        <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 truncate">
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary md:hidden"
            >
              <Menu className="w-4 h-4" />
            </button>

            <span className="font-medium text-xs font-mono truncate text-foreground">
              {activeConversation?.title || 'New Session'}
            </span>

            {activeIdentity && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                <span className="text-primary">@</span>
                {activeIdentity.handle || activeIdentity.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Capability Toggle */}
            <div className="flex items-center rounded-lg border border-border bg-secondary/50 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setCapability('ask')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  capability === 'ask'
                    ? 'bg-background text-foreground shadow-xs font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ask
              </button>
              <button
                type="button"
                onClick={() => setCapability('create')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  capability === 'create'
                    ? 'bg-background text-foreground shadow-xs font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create
              </button>
            </div>

            {/* Provider Selector */}
            <select
              value={routingMode}
              onChange={(e) => setRoutingMode(e.target.value as ShawRoutingMode)}
              className="px-2.5 py-1 rounded-lg border border-border bg-secondary/50 text-xs font-mono text-foreground focus:outline-hidden"
              title="Provider Routing"
            >
              <option value="auto_free_first">Auto — Free First</option>
              <option value="gemini">Google Gemini</option>
              <option value="groq">Groq</option>
            </select>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {messages.length === 0 && !isStreaming ? (
            /* Restrained Empty / New Session State */
            <div className="max-w-xl mx-auto py-12 text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-medium tracking-tight text-foreground">
                  SHAW
                </h2>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Intelligence and reasoning layer for Waynex Vault. Disciplined analysis,
                  grounded context, and DeFiwaynex voice.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setCapability('create')
                    handleSendMessage('Draft an article on why discipline beats noise in DeFi research.')
                  }}
                  className="p-3 rounded-xl border border-border bg-card/60 hover:bg-secondary/70 hover:border-border/80 transition-all text-xs space-y-1"
                >
                  <div className="font-medium text-foreground flex items-center gap-1.5 font-mono text-[11px]">
                    <PenTool className="w-3.5 h-3.5 text-primary" /> Create Draft
                  </div>
                  <div className="text-muted-foreground text-[11px] leading-relaxed">
                    Draft an article in the DeFiwaynex voice.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCapability('ask')
                    handleSendMessage('Help me structure an operational plan for this workspace')
                  }}
                  className="p-3 rounded-xl border border-border bg-card/60 hover:bg-secondary/70 hover:border-border/80 transition-all text-xs space-y-1"
                >
                  <div className="font-medium text-foreground flex items-center gap-1.5 font-mono text-[11px]">
                    <Compass className="w-3.5 h-3.5 text-primary" /> Ask Vault
                  </div>
                  <div className="text-muted-foreground text-[11px] leading-relaxed">
                    Ask questions using active workspace and identity context.
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Dialogue Messages */
            messages.map((msg) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-xs leading-relaxed max-w-3xl ${
                    isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'
                  }`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`space-y-2 rounded-2xl p-4 ${
                      isUser
                        ? 'bg-primary text-primary-foreground max-w-xl'
                        : 'bg-card border border-border text-foreground max-w-2xl shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed select-text font-sans">
                      {msg.content}
                    </div>

                    {!isUser && (
                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-2">
                          {msg.model_provider && (
                            <span className="capitalize">{msg.model_provider}</span>
                          )}
                          {msg.latency_ms && (
                            <span>{(msg.latency_ms / 1000).toFixed(1)}s</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {capability === 'create' && (
                            <button
                              type="button"
                              onClick={() => handleCheckVoiceCompliance(msg.content)}
                              className="px-2 py-0.5 rounded hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1"
                              title="Inspect Voice Compliance"
                            >
                              <ShieldCheck className="w-3 h-3 text-primary" />
                              Voice Check
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="p-1 rounded hover:bg-secondary hover:text-foreground transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Active Streaming Chunk Display */}
          {isStreaming && (
            <div className="flex gap-3 text-xs leading-relaxed max-w-3xl mr-auto justify-start animate-in fade-in-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>

              <div className="space-y-2 rounded-2xl p-4 bg-card border border-primary/20 text-foreground max-w-2xl shadow-xs">
                <div className="whitespace-pre-wrap leading-relaxed select-text">
                  {streamingText || 'SHAW is formulating response...'}
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Streaming ({routingMode})
                  </span>
                  <button
                    type="button"
                    onClick={handleStopStream}
                    className="text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                  >
                    <StopCircle className="w-3 h-3" /> Stop
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer Area */}
        <div className="p-3 md:p-4 border-t border-border bg-card/60 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="max-w-3xl mx-auto relative rounded-xl border border-border bg-background focus-within:border-primary/50 transition-colors shadow-xs"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder={
                capability === 'create'
                  ? 'Ask SHAW to draft an article, X thread, or rewrite...'
                  : 'Ask SHAW anything...'
              }
              disabled={isStreaming}
              className="w-full bg-transparent px-4 py-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden resize-none max-h-44"
            />

            <div className="px-3 pb-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="capitalize">{capability} Mode</span>
                <span className="opacity-40">•</span>
                <span>Enter to send, Shift+Enter for newline</span>
              </div>

              <div className="flex items-center gap-1.5">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopStream}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    title="Stop generation"
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isStreaming}
                    className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Send"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Voice Compliance Modal */}
      <VoiceComplianceModal
        isOpen={isComplianceModalOpen}
        onClose={() => setIsComplianceModalOpen(false)}
        result={complianceResult}
        onApplySanitization={() => {
          if (complianceResult?.sanitizedText) {
            handleCopy('sanitized', complianceResult.sanitizedText)
          }
        }}
      />
    </div>
  )
}
