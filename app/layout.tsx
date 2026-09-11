import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://defiwaynex.com'),
  title: {
    default: 'Wayne — Web3 Growth Strategist, Researcher & Builder',
    template: '%s | Wayne',
  },
  description:
    'Henshaw Joseph (Wayne) is a Web3 growth strategist, researcher, writer and founder working at the intersection of Web3, products and emerging markets. Building PEVRA.',
  keywords: [
    'Wayne',
    'Henshaw Joseph',
    'defiwaynex',
    'Web3 growth strategist',
    'Web3 researcher',
    'Web3 strategist',
    'DeFi research',
    'RWA research',
    'PEVRA',
    'blockchain growth',
    'crypto growth strategy',
  ],
  authors: [{ name: 'Henshaw Joseph', url: 'https://defiwaynex.com' }],
  creator: 'Henshaw Joseph',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://defiwaynex.com',
    siteName: 'Wayne',
    title: 'Wayne — Web3 Growth Strategist, Researcher & Builder',
    description:
      'Henshaw Joseph (Wayne) is a Web3 growth strategist, researcher, writer and founder working at the intersection of Web3, products and emerging markets.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@defiwaynex',
    creator: '@defiwaynex',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
