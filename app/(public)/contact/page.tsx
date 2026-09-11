import { Metadata } from 'next'
import { ContactForm } from '@/components/public/contact-form'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Start a conversation with Wayne about growth strategy, research, content, Web3 products or PEVRA.',
}

export default function ContactPage() {
  return (
    <div className="pt-16">
      <section className="section-padding">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
            {/* Left */}
            <div>
              <span className="text-xs uppercase tracking-widest text-violet-400 font-medium">
                Contact
              </span>
              <h1 className="mt-4 font-serif text-5xl md:text-6xl font-medium tracking-tight leading-tight">
                Have something worth discussing?
              </h1>
              <p className="mt-8 text-lg text-muted-foreground leading-relaxed">
                If you are building something in Web3, working through a growth
                problem, or want to understand how I approach a specific challenge,
                I am open to a conversation.
              </p>

              <div className="mt-12 space-y-8">
                {[
                  {
                    label: 'Growth strategy',
                    desc: 'You have a product and need a clearer approach to growing it.',
                  },
                  {
                    label: 'Research & strategy',
                    desc: 'You need to understand your market, competitors or users better.',
                  },
                  {
                    label: 'Content & distribution',
                    desc: 'You want content that actually creates authority and audience.',
                  },
                  {
                    label: 'PEVRA',
                    desc: 'Partnership, investor conversation, or media inquiry.',
                  },
                ].map((item) => (
                  <div key={item.label} className="flex gap-4">
                    <span className="w-1 h-1 bg-violet-500 rounded-full mt-2.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-border/30">
                <p className="text-sm text-muted-foreground mb-4">Prefer social?</p>
                <div className="flex gap-4">
                  <a
                    href="https://x.com/defiwaynex"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    X @defiwaynex ?
                  </a>
                </div>
              </div>
            </div>

            {/* Form */}
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
