'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid credentials. Please try again.')
      setLoading(false)
    } else {
      router.push('/admin')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="font-serif text-3xl font-medium">Wayne</h1>
        <p className="text-sm text-muted-foreground mt-1">Admin Dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
