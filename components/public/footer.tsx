import Link from 'next/link'
import { Twitter, Send, Linkedin, ExternalLink } from 'lucide-react'

const footerLinks = {
  navigation: [
    { href: '/about', label: 'About' },
    { href: '/work', label: 'Work' },
    { href: '/writing', label: 'Writing' },
    { href: '/experience', label: 'Experience' },
    { href: '/contact', label: 'Contact' },
  ],
  other: [
    { href: '/resume', label: 'Resume' },
    { href: '/privacy', label: 'Privacy' },
    { href: 'https://pevranetwork.com.ng', label: 'PEVRA', external: true },
  ],
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link
              href="/"
              className="font-serif text-2xl font-medium tracking-tight"
            >
              Wayne
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm">
              Web3 growth strategist, researcher, writer and founder.
              Working at the intersection of Web3, products and emerging markets.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://x.com/defiwaynex"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Wayne on X (Twitter)"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a
                href="https://t.me/defiwaynex"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Wayne on Telegram"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Send size={18} />
              </a>
              <a
                href="https://linkedin.com/in/defiwaynex"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Wayne on LinkedIn"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin size={18} />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
              Navigation
            </p>
            <ul className="space-y-3">
              {footerLinks.navigation.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Other */}
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
              Other
            </p>
            <ul className="space-y-3">
              {footerLinks.other.map((link) => (
                <li key={link.href}>
                  {'external' in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>{link.label}</span>
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {year} Henshaw Joseph. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Building{' '}
            <a
              href="https://pevranetwork.com.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 transition-colors"
            >
              PEVRA
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
