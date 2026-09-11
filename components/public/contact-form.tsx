'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  company: z.string().optional(),
  reason: z.string().min(1, 'Please select a reason'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
})

type ContactFormValues = z.infer<typeof contactSchema>

const reasons = [
  { value: 'growth-strategy', label: 'Growth strategy' },
  { value: 'research', label: 'Research' },
  { value: 'content-strategy', label: 'Content strategy' },
  { value: 'web3-product-strategy', label: 'Web3 / product strategy' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'pevra', label: 'PEVRA' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'other', label: 'Other' },
]

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormValues) => {
    setStatus('loading')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to send')
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-violet-600/30 bg-violet-600/10 rounded-lg p-8 text-center">
        <CheckCircle size={32} className="text-violet-400 mx-auto mb-4" />
        <h3 className="font-medium text-foreground text-lg mb-2">Message received.</h3>
        <p className="text-sm text-muted-foreground">
          Thank you for reaching out. I will review your message and get back to
          you if there is a good fit.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {status === 'error' && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertCircle size={16} />
          Something went wrong. Please try again or reach out on X.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Name
          </label>
          <input
            {...register('name')}
            id="name"
            type="text"
            placeholder="Your name"
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            placeholder="your@email.com"
            className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
          Company / Project <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          {...register('company')}
          id="company"
          type="text"
          placeholder="Where are you building?"
          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
        />
      </div>

      <div>
        <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-2">
          Reason for reaching out
        </label>
        <select
          {...register('reason')}
          id="reason"
          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors appearance-none"
        >
          <option value="">Select a reason...</option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {errors.reason && (
          <p className="mt-1 text-xs text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
          Message
        </label>
        <textarea
          {...register('message')}
          id="message"
          rows={6}
          placeholder="Tell me about the problem you are working on, or what you have in mind..."
          className="w-full px-4 py-3 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors resize-none"
        />
        {errors.message && (
          <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
      >
        {status === 'loading' ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Sending...
          </>
        ) : (
          'Send message'
        )}
      </button>
    </form>
  )
}
