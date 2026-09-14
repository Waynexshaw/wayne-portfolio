'use client'

import { useState } from 'react'
import { Check, Clock, Loader2 } from 'lucide-react'
import { toggleFollowUpStatus } from '@/lib/vault/actions'

interface FollowUpToggleButtonProps {
  id: string
  currentStatus: string
  onToggled?: (newStatus: string) => void
}

export function FollowUpToggleButton({ 
  id, 
  currentStatus,
  onToggled,
}: FollowUpToggleButtonProps) {
  const [loading, setLoading] = useState(false)
  const isCompleted = currentStatus === 'completed'

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const newStatus = await toggleFollowUpStatus(id, currentStatus)
      if (onToggled) {
        onToggled(newStatus)
      }
    } catch (err) {
      console.error('Failed to toggle follow-up:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-60 ${
        isCompleted
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
          : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
      }`}
      aria-label={isCompleted ? 'Mark follow-up as open' : 'Mark follow-up as completed'}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Updating...</span>
        </>
      ) : isCompleted ? (
        <>
          <Check className="w-3.5 h-3.5" />
          <span>Completed</span>
        </>
      ) : (
        <>
          <Clock className="w-3.5 h-3.5" />
          <span>Mark Done</span>
        </>
      )}
    </button>
  )
}
