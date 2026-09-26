'use client'

import { useState } from 'react'
import {
  Zap,
  Power,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react'
import { AutomationRule } from '@/lib/vault/automation/types'
import { TRIGGER_REGISTRY } from '@/lib/vault/automation/triggers'
import { ACTION_REGISTRY } from '@/lib/vault/automation/actions'
import { cn } from '@/lib/utils'

interface RulesTabProps {
  rules: AutomationRule[]
  onToggleRule: (ruleId: string, isActive: boolean) => Promise<void>
  onSwitchToTemplates: () => void
  isProcessing: boolean
}

export function RulesTab({
  rules,
  onToggleRule,
  onSwitchToTemplates,
  isProcessing,
}: RulesTabProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleToggle = async (rule: AutomationRule) => {
    setTogglingId(rule.id)
    try {
      await onToggleRule(rule.id, !rule.is_active)
    } finally {
      setTogglingId(null)
    }
  }

  if (rules.length === 0) {
    return (
      <div className="p-12 rounded-xl border border-border bg-card text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            No automation rules are active yet.
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Choose from ready-to-use automation templates to connect meetings to tasks, track retrospectives, alert on overdue work, and protect relationship touchpoints.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToTemplates}
          className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all shadow-sm inline-flex items-center gap-1.5"
        >
          Browse Templates <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
        <span>
          <strong className="text-foreground font-semibold">{rules.length}</strong> configured {rules.length === 1 ? 'rule' : 'rules'}
        </span>
        <button
          type="button"
          onClick={onSwitchToTemplates}
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
        >
          + Add Rule from Template
        </button>
      </div>

      <div className="space-y-3">
        {rules.map(rule => {
          const triggerDef = TRIGGER_REGISTRY[rule.trigger_type]
          const actionDef = ACTION_REGISTRY[rule.action_type]
          const isToggling = togglingId === rule.id || isProcessing

          return (
            <div
              key={rule.id}
              className={cn(
                'p-4 sm:p-5 rounded-xl border bg-card transition-all flex flex-col md:flex-row md:items-center justify-between gap-4',
                rule.is_active ? 'border-border' : 'border-border/60 bg-muted/20 opacity-75'
              )}
            >
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-semibold text-sm text-foreground">
                    {rule.title}
                  </span>

                  {/* Active / Paused Badge */}
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border',
                      rule.is_active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {rule.is_active ? 'Active' : 'Paused'}
                  </span>

                  {/* Approval requirement badge */}
                  {rule.requires_approval ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 text-[10px] font-mono tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Requires Approval
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border text-[10px] font-mono tracking-wider">
                      Autonomous
                    </span>
                  )}

                  {rule.template_id && (
                    <span className="text-[10px] font-mono text-muted-foreground/70">
                      Template: {rule.template_id}
                    </span>
                  )}
                </div>

                {rule.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rule.description}
                  </p>
                )}

                {/* Pipeline visual: Trigger -> Action */}
                <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground flex-wrap pt-1">
                  <span className="px-2 py-0.5 rounded bg-secondary/80 border border-border text-foreground font-medium">
                    ⚡ {triggerDef?.label || rule.trigger_type}
                  </span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded bg-secondary/80 border border-border text-foreground font-medium">
                    🎯 {actionDef?.label || rule.action_type}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Enable / Disable */}
              <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => handleToggle(rule)}
                  disabled={isToggling}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 disabled:opacity-50',
                    rule.is_active
                      ? 'border-border bg-card hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-500 text-muted-foreground'
                      : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold'
                  )}
                >
                  <Power className="w-3.5 h-3.5" />
                  {rule.is_active ? 'Pause Rule' : 'Enable Rule'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
