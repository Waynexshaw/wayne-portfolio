'use client'

import { useState } from 'react'
import { AutomationApproval } from '@/lib/vault/automation/types'
import { ApprovalCard } from './approval-card'
import { EditApprovalModal } from './edit-approval-modal'
import { CheckCircle2, Inbox } from 'lucide-react'

interface InboxTabProps {
  approvals: AutomationApproval[]
  onApprove: (approvalId: string, modifiedPayload?: Record<string, any>) => Promise<void>
  onReject: (approvalId: string) => Promise<void>
  isProcessing: boolean
}

export function InboxTab({
  approvals,
  onApprove,
  onReject,
  isProcessing,
}: InboxTabProps) {
  const [editingApproval, setEditingApproval] = useState<AutomationApproval | null>(null)

  const handleEditConfirm = async (
    approvalId: string,
    modifiedPayload: Record<string, any>
  ) => {
    await onApprove(approvalId, modifiedPayload)
    setEditingApproval(null)
  }

  if (approvals.length === 0) {
    return (
      <div className="p-12 rounded-xl border border-border bg-card text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Inbox className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            No automation approvals need your attention.
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            When automated rules suggest consequential actions (such as creating tasks, reviews, or portfolio snapshots), they will appear here for human authorization.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
        <span>
          Showing <strong className="text-foreground font-semibold">{approvals.length}</strong> pending {approvals.length === 1 ? 'approval' : 'approvals'}
        </span>
        <span className="font-mono text-[11px]">Human Authorization Queue</span>
      </div>

      <div className="space-y-4">
        {approvals.map(approval => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onApprove={id => onApprove(id)}
            onReject={id => onReject(id)}
            onEditAndApprove={app => setEditingApproval(app)}
            isProcessing={isProcessing}
          />
        ))}
      </div>

      {editingApproval && (
        <EditApprovalModal
          approval={editingApproval}
          onClose={() => setEditingApproval(null)}
          onConfirm={handleEditConfirm}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}
