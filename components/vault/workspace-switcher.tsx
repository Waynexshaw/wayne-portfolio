'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, ChevronsUpDown, Check, Shield, Loader2, Sparkles, Briefcase, User } from 'lucide-react'
import { setActiveWorkspace, type VaultWorkspace, type VaultIdentity } from '@/lib/vault/actions'

interface WorkspaceSwitcherProps {
  workspaces: VaultWorkspace[]
  activeWorkspace: VaultWorkspace | null
  activeIdentity: VaultIdentity | null
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  activeIdentity,
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelectWorkspace = (workspaceId: string) => {
    if (workspaceId === activeWorkspace?.id) {
      setIsOpen(false)
      return
    }

    startTransition(async () => {
      try {
        await setActiveWorkspace(workspaceId)
        setIsOpen(false)
        router.refresh()
      } catch (err) {
        console.error('Failed to switch workspace:', err)
      }
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'venture':
        return <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-active-border))]" />
      case 'advisory':
        return <Briefcase className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-active-border))]" />
      case 'personal':
        return <User className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-active-border))]" />
      default:
        return <Layers className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-active-border))]" />
    }
  }

  return (
    <div className="relative mt-4" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={`w-full text-left p-2.5 rounded-lg border transition-all ${
          isOpen
            ? 'bg-black/20 border-[hsl(var(--vault-sidebar-active-border))] shadow-xs'
            : 'bg-black/10 border-[hsl(var(--vault-sidebar-border))] hover:border-[hsl(var(--vault-sidebar-active-border))]/50 hover:bg-black/15'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between text-xs text-[hsl(var(--vault-sidebar-muted))] mb-1">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
            <Layers className="w-3 h-3 text-[hsl(var(--vault-sidebar-active-border))]" />
            Active Workspace
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--vault-sidebar-active-bg))] text-[hsl(var(--vault-sidebar-active-fg))] font-medium uppercase font-mono">
            {activeWorkspace?.workspace_type || 'venture'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-[hsl(var(--vault-sidebar-fg))] truncate flex items-center gap-1.5">
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[hsl(var(--vault-sidebar-active-border))]" />
            ) : (
              getTypeIcon(activeWorkspace?.workspace_type || 'venture')
            )}
            <span className="truncate">{activeWorkspace?.name || 'Select Workspace'}</span>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-[hsl(var(--vault-sidebar-muted))] shrink-0 opacity-60" />
        </div>

        {/* Operating Identity Display */}
        {activeIdentity && (
          <div className="mt-2 pt-2 border-t border-[hsl(var(--vault-sidebar-border))] flex items-center justify-between text-[11px] text-[hsl(var(--vault-sidebar-muted))]">
            <div className="flex items-center gap-1.5 truncate">
              <Shield className="w-3 h-3 text-[hsl(var(--vault-sidebar-active-border))] shrink-0" />
              <span className="truncate">
                Identity: <strong className="text-[hsl(var(--vault-sidebar-fg))]">{activeIdentity.name}</strong>
              </span>
            </div>
            {activeIdentity.handle && (
              <span className="font-mono text-[10px] text-[hsl(var(--vault-sidebar-muted))] shrink-0">
                {activeIdentity.handle}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-card border border-border shadow-2xl p-1.5 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
            Switch Workspace
          </div>

          <div className="space-y-0.5 max-h-64 overflow-y-auto" role="listbox">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspace?.id

              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => handleSelectWorkspace(ws.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors text-left ${
                    isActive
                      ? 'bg-primary/15 text-primary font-medium border border-primary/20'
                      : 'text-foreground hover:bg-secondary/80'
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="shrink-0">
                      {getTypeIcon(ws.workspace_type)}
                    </div>
                    <div className="truncate">
                      <div className="truncate font-medium flex items-center gap-1.5">
                        <span>{ws.name}</span>
                        {ws.is_default && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-secondary text-muted-foreground">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                        {ws.workspace_type}
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
