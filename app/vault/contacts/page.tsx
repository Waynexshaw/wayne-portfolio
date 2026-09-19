import Link from 'next/link'
import { getVaultContext, getContacts, getCompanies } from '@/lib/vault/actions'
import { Users, Plus, Building2, Mail, Phone, ExternalLink, Shield, ArrowRight } from 'lucide-react'
import { ContactCreateButton } from './create-button'
import { ContactSearchFilters } from '@/components/vault/contact/contact-search-filters'
import { VaultPriorityBadge } from '@/components/vault/vault-badge'

export const dynamic = 'force-dynamic'

export default async function VaultContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; priority?: string }>
}) {
  const resolvedParams = await searchParams
  const q = resolvedParams?.q || ''
  const stage = resolvedParams?.stage || 'all'
  const priority = resolvedParams?.priority || 'all'

  const context = await getVaultContext()
  const activeWorkspace = context?.activeWorkspace
  const contacts = await getContacts(activeWorkspace?.id, {
    q,
    stage,
    priority,
  }).catch(() => [])
  const companies = await getCompanies(activeWorkspace?.id).catch(() => [])

  const hasActiveFilters = Boolean(
    q.trim() !== '' || (stage && stage !== 'all') || (priority && priority !== 'all')
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl font-medium text-foreground">
            Contacts
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            People, professional relationships, and institutional network.
          </p>
        </div>

        <ContactCreateButton 
          workspaceId={activeWorkspace?.id} 
          companies={companies} 
        />
      </div>

      {/* Search & Filter Toolbar */}
      <ContactSearchFilters
        initialSearch={q}
        initialStage={stage}
        initialPriority={priority}
      />

      {/* Contacts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.length === 0 ? (
          hasActiveFilters ? (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl px-4">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-foreground mb-1">No contacts found</p>
              <p className="text-xs text-muted-foreground mb-4">
                No contacts match your current search or filter criteria. Try adjusting your search or clearing filters.
              </p>
              <Link
                href="/vault/contacts"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="col-span-full py-16 text-center text-muted-foreground text-sm bg-card border border-border rounded-xl px-4">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="font-medium text-foreground mb-1">No contacts yet</p>
              <p className="text-xs text-muted-foreground">
                Add your first professional relationship to begin managing contacts in this workspace.
              </p>
            </div>
          )
        ) : (
          contacts.map((contact: any) => {
            const wsRel = contact.workspace_contacts?.[0]
            const score = wsRel?.relationship_score || 5

            return (
              <div 
                key={contact.id} 
                className="p-5 rounded-xl bg-card border border-border flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link 
                        href={`/vault/contacts/${contact.id}`}
                        prefetch={false}
                        className="text-base font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        {contact.full_name}
                      </Link>
                      {contact.role_title && (
                        <p className="text-xs text-muted-foreground">{contact.role_title}</p>
                      )}
                    </div>
                    {wsRel?.relationship_stage && (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {wsRel.relationship_stage}
                      </span>
                    )}
                  </div>

                  {contact.company && (
                    <Link
                      href={`/vault/companies/${contact.company.id || contact.company_id}`}
                      prefetch={false}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{contact.company.name}</span>
                    </Link>
                  )}

                  {/* Relationship Score Meter (1 to 10 scale) */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Relationship Score:</span>
                      <span className="font-mono text-foreground">
                        <strong>{score}</strong> / 10 <span className="text-muted-foreground text-[10px]">({score <= 3 ? 'Cold' : score <= 6 ? 'Familiar' : score <= 8 ? 'Strong' : 'Close'})</span>
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  {contact.bio && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                      {contact.bio}
                    </p>
                  )}
                </div>

                {/* Footer details */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {contact.email && (
                      <a 
                        href={`mailto:${contact.email}`} 
                        className="p-1.5 rounded hover:bg-secondary transition-colors"
                        title={contact.email}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {contact.phone && (
                      <a 
                        href={`tel:${contact.phone}`} 
                        className="p-1.5 rounded hover:bg-secondary transition-colors"
                        title={contact.phone}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {wsRel?.priority && (
                      <VaultPriorityBadge priority={wsRel.priority} />
                    )}
                    <Link
                      href={`/vault/contacts/${contact.id}`}
                      prefetch={false}
                      className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                    >
                      View Contact <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}