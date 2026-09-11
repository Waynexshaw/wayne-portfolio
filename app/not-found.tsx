import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-serif text-8xl font-medium text-muted-foreground/20">404</p>
        <h1 className="mt-4 font-serif text-3xl font-medium text-foreground">
          This page does not exist.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          You may have followed an old link or mistyped the address.
          The rest of the site is still here.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            Go home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 border border-border hover:border-foreground/50 text-foreground rounded-lg font-medium transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </div>
  )
}
