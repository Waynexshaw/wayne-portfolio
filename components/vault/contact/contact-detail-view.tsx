'use client'

import { useState } from 'react'
import { ContactHeader } from './contact-header'
import { ContactRelationshipCard } from './contact-relationship-card'
import { ContactTimeline } from './contact-timeline'
import { ContactFollowUps } from './contact-follow-ups'
import { ContactOpportunities } from './contact-opportunities'
import { ContactModals } from './contact-modals'

interface ContactDetailViewProps {
  contact: any
  workspaceRelationship: any
  interactions: any[]
  followUps: any[]
  opportunities: any[]
  activeWorkspace: any
  identities: any[]
  companies: any[]
}

export function ContactDetailView({
  contact,
  workspaceRelationship,
  interactions,
  followUps,
  opportunities,
  activeWorkspace,
  identities,
  companies,
}: ContactDetailViewProps) {
  const [isLogInteractionOpen, setIsLogInteractionOpen] = useState(false)
  const [isCreateFollowUpOpen, setIsCreateFollowUpOpen] = useState(false)
  const [isCreateOpportunityOpen, setIsCreateOpportunityOpen] = useState(false)
  const [isEditRelationshipOpen, setIsEditRelationshipOpen] = useState(false)
  const [isEditContactOpen, setIsEditContactOpen] = useState(false)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Profile Header & Core Badges */}
      <ContactHeader
        contact={contact}
        workspaceRelationship={workspaceRelationship}
        activeWorkspace={activeWorkspace}
        identities={identities}
        onOpenLogInteraction={() => setIsLogInteractionOpen(true)}
        onOpenCreateFollowUp={() => setIsCreateFollowUpOpen(true)}
        onOpenCreateOpportunity={() => setIsCreateOpportunityOpen(true)}
        onOpenEditRelationship={() => setIsEditRelationshipOpen(true)}
        onOpenEditContact={() => setIsEditContactOpen(true)}
      />

      {/* 2. Workspace Relationship Context, Notes, Company & Social Handles */}
      <ContactRelationshipCard
        contact={contact}
        workspaceRelationship={workspaceRelationship}
        activeWorkspace={activeWorkspace}
        onOpenEditRelationship={() => setIsEditRelationshipOpen(true)}
      />

      {/* 3. Operational Grid: Timeline (Touchpoints) & Action Queues (Follow-ups & Opportunities) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timeline of Touchpoints */}
        <div className="lg:col-span-7">
          <ContactTimeline
            interactions={interactions}
            onOpenLogInteraction={() => setIsLogInteractionOpen(true)}
          />
        </div>

        {/* Right Column: Follow-ups & Opportunities */}
        <div className="lg:col-span-5 space-y-6">
          <ContactFollowUps
            followUps={followUps}
            onOpenCreateFollowUp={() => setIsCreateFollowUpOpen(true)}
          />

          <ContactOpportunities
            opportunities={opportunities}
            onOpenCreateOpportunity={() => setIsCreateOpportunityOpen(true)}
          />
        </div>
      </div>

      {/* Interactive Creation & Edit Modals */}
      <ContactModals
        contact={contact}
        workspaceRelationship={workspaceRelationship}
        workspaceId={activeWorkspace?.id}
        identities={identities}
        companies={companies}
        interactions={interactions}
        isLogInteractionOpen={isLogInteractionOpen}
        setIsLogInteractionOpen={setIsLogInteractionOpen}
        isCreateFollowUpOpen={isCreateFollowUpOpen}
        setIsCreateFollowUpOpen={setIsCreateFollowUpOpen}
        isCreateOpportunityOpen={isCreateOpportunityOpen}
        setIsCreateOpportunityOpen={setIsCreateOpportunityOpen}
        isEditRelationshipOpen={isEditRelationshipOpen}
        setIsEditRelationshipOpen={setIsEditRelationshipOpen}
        isEditContactOpen={isEditContactOpen}
        setIsEditContactOpen={setIsEditContactOpen}
      />
    </div>
  )
}
