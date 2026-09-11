import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email').max(200),
  company: z.string().max(200).optional(),
  reason: z.string().min(1, 'Please select a reason').max(100),
  message: z.string().min(20, 'Message must be at least 20 characters').max(5000),
})

export type ContactFormValues = z.infer<typeof contactSchema>
