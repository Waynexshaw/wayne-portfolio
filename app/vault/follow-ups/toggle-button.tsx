'use client'

import { useState } from 'react'
import { Check, Clock } from 'lucide-react'
import { toggleFollowUpStatus } from '@/lib/vault/actions'

export function FollowUpToggleButton({ 
  id, 
  currentStatus 
}: { 
  id: string
  currentStatus: string 
}) {
  const [loading, setLoading] = useState(false)
  const isCompleted = currentStatus === 'completed'

  const handleToggle = async () => {
    setLoading(true)
    try {
      await toggleFollowUpStatus(id, currentStatus)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
        isCompleted
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
          : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
      }`}
    >
      {isCompleted ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Completed
        </>
      ) : (
        <>
          <Clock className="w-3.5 h-3.5" />
          Mark Done
        </>
      )}
    </button>
  )
}