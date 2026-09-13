import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { getVaultContext, getContactDetail, getCompanies } from '@/lib/vault/actions'
import { ContactDetailView } from '@/components/vault/contact/contact-detail-view'

export const dynamic = 'force-dynamic'

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params
  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace

  // Fetch contact detail scoped to active workspace
  const [detail, companies] = await Promise.all([
    getContactDetail(id, activeWorkspace?.id),
    getCompanies(activeWorkspace?.id).catch(() => []),
  ])

  // Handle contact not found or unauthorized
  if (!detail || !detail.contact) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto text-muted-foreground shadow-sm">
          <Users className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-medium text-foreground">
            Contact Not Found
          </h2>
          <p className="text-xs text-muted-foreground">
            This contact record does not exist, has been archived, or you do not have permission to view it in this workspace.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/vault/contacts"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return to Contacts Directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ContactDetailView
      contact={detail.contact}
      workspaceRelationship={detail.workspaceRelationship}
      interactions={detail.interactions}
      followUps={detail.followUps}
      opportunities={detail.opportunities}
      activeWorkspace={activeWorkspace}
      identities={context?.identities || []}
      companies={companies}
    />
  )
}
