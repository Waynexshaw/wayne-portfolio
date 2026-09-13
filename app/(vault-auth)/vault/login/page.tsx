'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Shield, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

function VaultLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    oauthError === 'oauth_failed'
      ? 'Google authentication was not completed or is not configured yet. Please try email sign-in below.'
      : null
  )
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsGoogleLoading(true)
    const supabase = createClient()

    try {
      const redirectOrigin = window.location.origin
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${redirectOrigin}/auth/callback?next=/vault`,
        },
      })

      if (authError) {
        setError(authError.message)
        setIsGoogleLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize Google sign-in')
      setIsGoogleLoading(false)
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsEmailLoading(true)
    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Invalid credentials. Please verify your email and password.')
      setIsEmailLoading(false)
    } else {
      router.push('/vault')
      router.refresh()
    }
  }

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in-50 duration-200">
      {/* Brand Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm mb-2">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground uppercase">
          Waynex Vault
        </h1>
        <div className="space-y-0.5 text-xs text-muted-foreground font-mono tracking-wide">
          <p>Your work.</p>
          <p>Your records.</p>
          <p>Your history.</p>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="p-8 rounded-2xl bg-card border border-border shadow-2xl space-y-6">
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Action: Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isEmailLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-foreground text-background font-medium text-sm flex items-center justify-center gap-3 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60 shadow-md"
        >
          {isGoogleLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <GoogleIcon className="w-4 h-4" />
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-border w-full" />
          <span className="bg-card px-3 text-[11px] font-mono text-muted-foreground uppercase">
            or
          </span>
        </div>

        {/* Secondary: Email credentials fallback */}
        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-secondary/60 text-secondary-foreground text-xs font-medium border border-border/80 hover:bg-secondary transition-colors"
          >
            Sign in with email & password
          </button>
        ) : (
          <form onSubmit={handleEmailSignIn} className="space-y-4 pt-1 animate-in fade-in-50 duration-150">
            <div className="space-y-1">
              <label className="text-muted-foreground font-mono uppercase text-[10px]">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="defiwaynex@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-lg bg-secondary/40 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground font-mono uppercase text-[10px]">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg bg-secondary/40 border border-border text-foreground text-xs focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isEmailLoading || isGoogleLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isEmailLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign in to Vault</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Assurance Badge */}
        <div className="pt-2 border-t border-border/50 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <Lock className="w-3 h-3 text-emerald-400" />
          <span>Supabase Auth · Row Level Security</span>
        </div>
      </div>

      {/* Subtle Portfolio link */}
      <div className="text-center">
        <Link
          href="/"
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-mono"
        >
          ← Return to public portfolio
        </Link>
      </div>
    </div>
  )
}

export default function VaultLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <VaultLoginForm />
    </Suspense>
  )
}
