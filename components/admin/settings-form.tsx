'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2 } from 'lucide-react'

interface SettingsFormProps {
  settings: Record<string, string>
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [form, setForm] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient() as any
    // Upsert each setting key individually
    for (const [key, value] of Object.entries(form)) {
      await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const Field = ({ label, settingKey, multiline = false, rows = 2 }: {
    label: string
    settingKey: string
    multiline?: boolean
    rows?: number
  }) => (
    <div>
      <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={form[settingKey] || ''}
          onChange={(e) => setForm(f => ({ ...f, [settingKey]: e.target.value }))}
          rows={rows}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y transition-colors"
        />
      ) : (
        <input
          type="text"
          value={form[settingKey] || ''}
          onChange={(e) => setForm(f => ({ ...f, [settingKey]: e.target.value }))}
          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
        />
      )}
    </div>
  )

  return (
    <div className="max-w-2xl space-y-8">
      <div className="surface p-6 space-y-6">
        <h2 className="font-medium text-foreground">Identity</h2>
        <Field label="Site name" settingKey="site_name" />
        <Field label="Tagline" settingKey="site_tagline" />
        <Field label="Short bio" settingKey="bio_short" multiline rows={3} />
        <Field label="Full bio" settingKey="bio_long" multiline rows={6} />
        <Field label="Profile image URL" settingKey="profile_image" />
      </div>

      <div className="surface p-6 space-y-6">
        <h2 className="font-medium text-foreground">Social Links</h2>
        <Field label="X (Twitter) handle" settingKey="x_handle" />
        <Field label="X (Twitter) URL" settingKey="x_url" />
        <Field label="Telegram URL" settingKey="telegram_url" />
        <Field label="LinkedIn URL" settingKey="linkedin_url" />
        <Field label="Email" settingKey="email" />
      </div>

      <div className="surface p-6 space-y-6">
        <h2 className="font-medium text-foreground">SEO Defaults</h2>
        <Field label="SEO title" settingKey="seo_title" />
        <Field label="SEO description" settingKey="seo_description" multiline rows={3} />
        <Field label="OG image URL" settingKey="og_image" />
      </div>

      <div className="surface p-6 space-y-6">
        <h2 className="font-medium text-foreground">Homepage</h2>
        <Field label="Currently working on" settingKey="currently" multiline rows={4} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saved ? 'Saved!' : 'Save settings'}
      </button>
    </div>
  )
}

