import { Navigation } from '@/components/public/navigation'
import { Footer } from '@/components/public/footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
