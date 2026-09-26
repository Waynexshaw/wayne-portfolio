'use client'

import { useState } from 'react'
import {
  Sparkles,
  Zap,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Clock,
  FileCheck2,
  RotateCcw,
  Check,
  AlertTriangle
} from 'lucide-react'
import { AutomationTemplate, AutomationRule } from '@/lib/vault/automation/types'
import { getAvailableTemplates } from '@/lib/vault/automation/templates'
import { TRIGGER_REGISTRY } from '@/lib/vault/automation/triggers'
import { ACTION_REGISTRY } from '@/lib/vault/automation/actions'
import { cn } from '@/lib/utils'

interface TemplatesViewProps {
  existingRules: AutomationRule[]
  onActivateTemplate: (templateId: string) => Promise<void>
  onSwitchToRules: () => void
  isProcessing: boolean
}

export function TemplatesView({
  existingRules,
  onActivateTemplate,
  onSwitchToRules,
  isProcessing,
}: TemplatesViewProps) {
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const templates = getAvailableTemplates()

  // Track active templates by template_id
  const activeTemplateIds = new Set(
    existingRules
      .filter(r => r.is_active && !r.archived_at && r.template_id)
      .map(r => r.template_id as string)
  )

  const handleActivate = async (templateId: string) => {
    setActivatingId(templateId)
    try {
      await onActivateTemplate(templateId)
    } finally {
      setActivatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Catalog Intro Banner */}
      <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              Automation Template Catalog
            </h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">
            Pre-engineered automation blueprints designed for Waynex Vault. Activate rules with deterministic parameters and human-in-the-loop safety.
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchToRules}
          className="self-start sm:self-auto text-xs font-mono text-primary hover:underline flex items-center gap-1 shrink-0"
        >
          View active rules ({existingRules.length}) <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid of Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => {
          const isActive = activeTemplateIds.has(template.id)
          const triggerDef = TRIGGER_REGISTRY[template.trigger_type]
          const actionDef = ACTION_REGISTRY[template.action_type]
          const isActivating = activatingId === template.id || isProcessing

          return (
            <div
              key={template.id}
              className={cn(
                'p-5 rounded-xl border bg-card transition-all flex flex-col justify-between gap-4 relative overflow-hidden',
                isActive ? 'border-primary/30 shadow-sm' : 'border-border hover:border-border/80'
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-foreground tracking-tight">
                    {template.title}
                  </h4>

                  {isActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono tracking-wider font-semibold flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : template.is_batch2_scheduled ? (
                    <span className="px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-mono tracking-wider flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" /> Scheduled
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-mono tracking-wider flex items-center gap-1 shrink-0">
                      <Zap className="w-3 h-3 text-primary" /> Event Trigger
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {template.description}
                </p>

                {/* Pipeline metadata */}
                <div className="space-y-1.5 pt-1 text-[11px] font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/80">Trigger:</span>
                    <span className="text-foreground font-medium truncate">
                      {triggerDef?.label || template.trigger_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/80">Action:</span>
                    <span className="text-foreground font-medium truncate">
                      {actionDef?.label || template.action_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground/80">Human Control:</span>
                    {template.requires_approval ? (
                      <span className="text-amber-500 font-medium">Requires Approval</span>
                    ) : (
                      <span className="text-emerald-500 font-medium">Autonomous Safe Alert</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  ID: {template.id}
                </span>

                {isActive ? (
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-xs font-mono cursor-not-allowed flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Active in Workspace
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleActivate(template.id)}
                    disabled={isActivating}
                    className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Zap className="w-3.5 h-3.5" /> Activate Template
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
