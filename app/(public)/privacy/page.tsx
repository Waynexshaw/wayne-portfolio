import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <div className="pt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-serif text-4xl font-medium mb-8">Privacy Policy</h1>
        <div className="prose prose-invert max-w-none text-muted-foreground">
          <p className="text-sm text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p>
            This website collects only the information you voluntarily provide through the contact form.
            This information is used solely to respond to your inquiry and is not shared with third parties,
            used for marketing, or sold.
          </p>
          <h2 className="text-foreground font-medium text-xl mt-8 mb-4">What we collect</h2>
          <ul>
            <li>Your name</li>
            <li>Your email address</li>
            <li>Optional: company/project name</li>
            <li>Your message</li>
          </ul>
          <h2 className="text-foreground font-medium text-xl mt-8 mb-4">How we use it</h2>
          <p>Contact form submissions are stored securely and used only to respond to your inquiry.</p>
          <h2 className="text-foreground font-medium text-xl mt-8 mb-4">Third-party services</h2>
          <p>This website uses Supabase (database and storage) and Vercel (hosting). Each has its own privacy policy.</p>
          <h2 className="text-foreground font-medium text-xl mt-8 mb-4">Your rights</h2>
          <p>
            You may request deletion of any data you have submitted by contacting us through X at{' '}
            <a href="https://x.com/defiwaynex" className="text-violet-400 hover:text-violet-300">
              @defiwaynex
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
