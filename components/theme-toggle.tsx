'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-md border border-border/50 bg-background/50" />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative p-2 rounded-md border border-border/50 bg-background/60 hover:bg-muted/50 hover:border-violet-500/40 text-muted-foreground hover:text-foreground transition-all duration-200"
      aria-label="Toggle visual theme (Midnight Navy or Warm Cream)"
      title={isDark ? "Switch to Warm Cream" : "Switch to Midnight Navy"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-violet-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  )
}