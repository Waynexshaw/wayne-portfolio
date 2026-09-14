'use client'

import { useState } from 'react'
import { CompanyHeader } from './company-header'
import { CompanyRelationshipCard } from './company-relationship-card'
import { CompanyContacts } from './company-contacts'
import { CompanyOpportunities } from './company-opportunities'
import { CompanyModals } from './company-modals'

interface CompanyDetailViewProps {
  company: any
  workspaceRelationship: any
  contacts: any[]
  opportunities: any[]
  activeWorkspace: any
  identities: any[]
}

export function CompanyDetailView({
  company,
  workspaceRelationship,
  contacts,
  opportunities,
  activeWorkspace,
  identities,
}: CompanyDetailViewProps) {
  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false)
  const [isEditRelationshipOpen, setIsEditRelationshipOpen] = useState(false)
  const [isAddContactOpen, setIsAddContactOpen] = useState(false)
  const [isCreateOpportunityOpen, setIsCreateOpportunityOpen] = useState(false)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Profile Header & Badges */}
      <CompanyHeader
        company={company}
        workspaceRelationship={workspaceRelationship}
        activeWorkspace={activeWorkspace}
        contactsCount={contacts.length}
        onOpenEditCompany={() => setIsEditCompanyOpen(true)}
        onOpenEditRelationship={() => setIsEditRelationshipOpen(true)}
        onOpenAddContact={() => setIsAddContactOpen(true)}
        onOpenCreateOpportunity={() => setIsCreateOpportunityOpen(true)}
      />

      {/* 2. Workspace Relationship Context & Notes */}
      <CompanyRelationshipCard
        company={company}
        workspaceRelationship={workspaceRelationship}
        activeWorkspace={activeWorkspace}
        onOpenEditRelationship={() => setIsEditRelationshipOpen(true)}
      />

      {/* 3. Connected Contacts */}
      <CompanyContacts
        contacts={contacts}
        onOpenAddContact={() => setIsAddContactOpen(true)}
      />

      {/* 4. Connected Opportunities */}
      <CompanyOpportunities
        opportunities={opportunities}
        onOpenCreateOpportunity={() => setIsCreateOpportunityOpen(true)}
      />

      {/* Modals for Editing and Creation */}
      <CompanyModals
        company={company}
        workspaceRelationship={workspaceRelationship}
        workspaceId={activeWorkspace?.id}
        workspaceName={activeWorkspace?.name}
        contacts={contacts}
        isEditCompanyOpen={isEditCompanyOpen}
        setIsEditCompanyOpen={setIsEditCompanyOpen}
        isEditRelationshipOpen={isEditRelationshipOpen}
        setIsEditRelationshipOpen={setIsEditRelationshipOpen}
        isAddContactOpen={isAddContactOpen}
        setIsAddContactOpen={setIsAddContactOpen}
        isCreateOpportunityOpen={isCreateOpportunityOpen}
        setIsCreateOpportunityOpen={setIsCreateOpportunityOpen}
      />
    </div>
  )
}
