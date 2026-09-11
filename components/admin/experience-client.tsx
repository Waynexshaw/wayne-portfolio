'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Loader2, Save, Trash2 } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type ExperienceRow = Database['public']['Tables']['experience']['Row']
type ExperienceInsert = Database['public']['Tables']['experience']['Insert']
type ExperienceUpdate = Database['public']['Tables']['experience']['Update']

interface ExperienceFormState {
  id?: string
  organization: string
  role: string
  start_date: string
  end_date: string
  description: string
  achievements: string
  link: string
  order_index: number
}

function ExperienceForm({ entry, onSave, onDelete }: {
  entry: ExperienceFormState
  onSave: (data: ExperienceFormState) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState(entry)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="surface p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Organization *</label>
          <input value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Role *</label>
          <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Start date *</label>
          <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">End date (leave blank if current)</label>
          <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Order</label>
          <input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: parseInt(e.target.value) || 0 }))}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Description</label>
        <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Achievements (one per line)</label>
        <textarea rows={4} value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))}
          placeholder="Led go-to-market strategy..."
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1">Link</label>
        <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://..."
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={async () => { setSaving(true); await onSave(form); setSaving(false) }}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          Save
        </button>
        {onDelete && (
          <button
            onClick={async () => { setDeleting(true); await onDelete(); setDeleting(false) }}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-destructive/50 text-destructive text-sm rounded-lg transition-colors"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

interface AdminExperienceClientProps {
  entries: ExperienceRow[]
}

export function AdminExperienceClient({ entries }: AdminExperienceClientProps) {
  const router = useRouter()
  const [showNew, setShowNew] = useState(false)

  const handleSave = async (data: ExperienceFormState) => {
    const supabase = createClient()
    const achievements = data.achievements
      ? data.achievements.split('\n').map(s => s.trim()).filter(Boolean)
      : null

    if (data.id) {
      const updatePayload: ExperienceUpdate = {
        organization: data.organization,
        role: data.role,
        start_date: data.start_date,
        end_date: data.end_date || null,
        description: data.description || null,
        achievements,
        link: data.link || null,
        order_index: data.order_index,
      }
      await (supabase as any).from('experience').update(updatePayload).eq('id', data.id)
    } else {
      const insertPayload: ExperienceInsert = {
        organization: data.organization,
        role: data.role,
        start_date: data.start_date,
        end_date: data.end_date || null,
        description: data.description || null,
        achievements,
        link: data.link || null,
        order_index: data.order_index,
      }
      await (supabase as any).from('experience').insert(insertPayload)
      setShowNew(false)
    }
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    const supabase = createClient()
    await (supabase as any).from('experience').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-serif font-medium">Experience</h1>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm rounded-lg font-medium transition-colors"
        >
          <Plus size={14} />
          Add entry
        </button>
      </div>

      <div className="space-y-4">
        {showNew && (
          <ExperienceForm
            entry={{ organization: '', role: '', start_date: '', end_date: '', description: '', achievements: '', link: '', order_index: 0 }}
            onSave={handleSave}
            onDelete={async () => setShowNew(false)}
          />
        )}
        {entries.map(entry => (
          <ExperienceForm
            key={entry.id}
            entry={{
              id: entry.id,
              organization: entry.organization,
              role: entry.role,
              start_date: entry.start_date,
              end_date: entry.end_date || '',
              description: entry.description || '',
              achievements: entry.achievements?.join('\n') || '',
              link: entry.link || '',
              order_index: entry.order_index,
            }}
            onSave={handleSave}
            onDelete={() => handleDelete(entry.id)}
          />
        ))}
      </div>
    </div>
  )
}
