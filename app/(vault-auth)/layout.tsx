import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Waynex Vault — Sign In',
  description: 'Your work. Your records. Your history.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function VaultAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {children}
    </div>
  )
}
