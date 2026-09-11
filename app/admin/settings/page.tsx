import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/admin/settings-form'

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase.from('settings').select('key, value')
  const settings: Record<string, string> = {}
  ;(rows || []).forEach(({ key, value }) => { settings[key] = value || '' })
  return (
    <div>
      <h1 className="text-2xl font-serif font-medium mb-8">Settings</h1>
      <SettingsForm settings={settings} />
    </div>
  )
}
