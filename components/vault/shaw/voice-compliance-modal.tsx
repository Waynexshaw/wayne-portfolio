'use client'

import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, X } from 'lucide-react'
import { ComplianceResult } from '@/lib/vault/shaw/types'

interface VoiceComplianceModalProps {
  isOpen: boolean
  onClose: () => void
  result: ComplianceResult | null
  onApplySanitization?: () => void
}

export function VoiceComplianceModal({
  isOpen,
  onClose,
  result,
  onApplySanitization,
}: VoiceComplianceModalProps) {
  if (!isOpen || !result) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl p-6 space-y-5 animate-in fade-in-0 zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-base text-foreground">DeFiwaynex Voice Compliance</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {result.checks.map((check, idx) => {
            const isPass = check.status === 'passed'
            const isWarn = check.status === 'warning'
            const isViol = check.status === 'violation'

            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-xs leading-relaxed flex items-start gap-2.5 ${
                  isViol
                    ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400'
                    : isWarn
                    ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                    : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {isViol ? (
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                ) : isWarn ? (
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-500" />
                )}

                <div className="space-y-1">
                  <div className="font-medium capitalize font-mono text-[11px]">
                    {check.name.replace(/_/g, ' ')} — {check.status.toUpperCase()}
                  </div>
                  <div>{check.description}</div>
                  {check.matches && check.matches.length > 0 && (
                    <div className="mt-1 font-mono text-[10px] opacity-80">
                      Matches: {check.matches.slice(0, 5).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
          <div className="text-muted-foreground font-mono text-[11px]">
            {result.passed ? (
              <span className="text-emerald-500 font-medium">No rule violations detected</span>
            ) : (
              <span className="text-red-400 font-medium">Violations detected</span>
            )}
            <div className="text-[10px] text-muted-foreground font-sans mt-0.5">
              Deterministic rule check only (em dashes, buzzwords, clichés). Does not evaluate subjective voice quality or tone.
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onApplySanitization && result.sanitizedText && (
              <button
                type="button"
                onClick={onApplySanitization}
                className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-mono text-xs transition-colors"
              >
                Clean Em Dashes
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
