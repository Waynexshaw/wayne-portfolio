export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // --------------------------------------------------------
      // Existing Public Portfolio Tables (Preserved 100%)
      // --------------------------------------------------------
      articles: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string | null
          content: string | null
          category: string | null
          tags: string[] | null
          cover_image: string | null
          published: boolean
          published_at: string | null
          reading_time: number | null
          seo_title: string | null
          seo_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt?: string | null
          content?: string | null
          category?: string | null
          tags?: string[] | null
          cover_image?: string | null
          published?: boolean
          published_at?: string | null
          reading_time?: number | null
          seo_title?: string | null
          seo_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          excerpt?: string | null
          content?: string | null
          category?: string | null
          tags?: string[] | null
          cover_image?: string | null
          published?: boolean
          published_at?: string | null
          reading_time?: number | null
          seo_title?: string | null
          seo_description?: string | null
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          slug: string
          category: string | null
          role: string | null
          summary: string | null
          description: string | null
          problem: string | null
          objective: string | null
          strategy: string | null
          execution: string | null
          results: string | null
          lessons: string | null
          image: string | null
          link: string | null
          featured: boolean
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          category?: string | null
          role?: string | null
          summary?: string | null
          description?: string | null
          problem?: string | null
          objective?: string | null
          strategy?: string | null
          execution?: string | null
          results?: string | null
          lessons?: string | null
          image?: string | null
          link?: string | null
          featured?: boolean
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          category?: string | null
          role?: string | null
          summary?: string | null
          description?: string | null
          problem?: string | null
          objective?: string | null
          strategy?: string | null
          execution?: string | null
          results?: string | null
          lessons?: string | null
          image?: string | null
          link?: string | null
          featured?: boolean
          published?: boolean
          updated_at?: string
        }
      }
      case_studies: {
        Row: {
          id: string
          project_id: string
          context: string | null
          problem: string | null
          objective: string | null
          research: string | null
          strategy: string | null
          execution: string | null
          challenges: string | null
          decisions: string | null
          results: string | null
          lessons: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          context?: string | null
          problem?: string | null
          objective?: string | null
          research?: string | null
          strategy?: string | null
          execution?: string | null
          challenges?: string | null
          decisions?: string | null
          results?: string | null
          lessons?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          context?: string | null
          problem?: string | null
          objective?: string | null
          research?: string | null
          strategy?: string | null
          execution?: string | null
          challenges?: string | null
          decisions?: string | null
          results?: string | null
          lessons?: string | null
          updated_at?: string
        }
      }
      experience: {
        Row: {
          id: string
          organization: string
          role: string
          start_date: string
          end_date: string | null
          description: string | null
          achievements: string[] | null
          link: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          organization: string
          role: string
          start_date: string
          end_date?: string | null
          description?: string | null
          achievements?: string[] | null
          link?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          organization?: string
          role?: string
          start_date?: string
          end_date?: string | null
          description?: string | null
          achievements?: string[] | null
          link?: string | null
          order_index?: number
        }
      }
      services: {
        Row: {
          id: string
          title: string
          description: string | null
          audience: string | null
          deliverables: string[] | null
          published: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          audience?: string | null
          deliverables?: string[] | null
          published?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          audience?: string | null
          deliverables?: string[] | null
          published?: boolean
          order_index?: number
        }
      }
      metrics: {
        Row: {
          id: string
          label: string
          value: string
          change: string | null
          context: string | null
          verified: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          label: string
          value: string
          change?: string | null
          context?: string | null
          verified?: boolean
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          label?: string
          value?: string
          change?: string | null
          context?: string | null
          verified?: boolean
          order_index?: number
        }
      }
      testimonials: {
        Row: {
          id: string
          name: string
          role: string | null
          organization: string | null
          quote: string
          image: string | null
          published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          role?: string | null
          organization?: string | null
          quote: string
          image?: string | null
          published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string | null
          organization?: string | null
          quote?: string
          image?: string | null
          published?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          name: string
          email: string
          company: string | null
          reason: string | null
          message: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          company?: string | null
          reason?: string | null
          message: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          status?: string
        }
      }
      media: {
        Row: {
          id: string
          filename: string
          url: string
          alt_text: string | null
          type: string | null
          size: number | null
          created_at: string
        }
        Insert: {
          id?: string
          filename: string
          url: string
          alt_text?: string | null
          type?: string | null
          size?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          filename?: string
          url?: string
          alt_text?: string | null
          type?: string | null
          size?: number | null
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
        }
      }

      // --------------------------------------------------------
      // Waynex Vault (WV) — Phase 1 Foundational Tables
      // --------------------------------------------------------
      user_profiles: {
        Row: {
          id: string
          full_name: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          updated_at?: string
        }
      }
      identities: {
        Row: {
          id: string
          user_id: string
          name: string
          handle: string | null
          type: 'personal' | 'pseudonymous' | 'entity' | 'brand'
          bio: string | null
          avatar_url: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          handle?: string | null
          type: 'personal' | 'pseudonymous' | 'entity' | 'brand'
          bio?: string | null
          avatar_url?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          handle?: string | null
          type?: 'personal' | 'pseudonymous' | 'entity' | 'brand'
          bio?: string | null
          avatar_url?: string | null
          is_default?: boolean
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          owner_id: string
          primary_identity_id: string | null
          name: string
          slug: string
          description: string | null
          workspace_type: string
          icon: string | null
          is_default: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          primary_identity_id?: string | null
          name: string
          slug: string
          description?: string | null
          workspace_type?: string
          icon?: string | null
          is_default?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          primary_identity_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          workspace_type?: string
          icon?: string | null
          is_default?: boolean
          archived_at?: string | null
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          updated_at?: string
        }
      }
      workspace_projects: {
        Row: {
          id: string
          workspace_id: string
          identity_id: string | null
          title: string
          slug: string
          description: string | null
          status: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          start_date: string | null
          target_date: string | null
          completed_at: string | null
          archived_at: string | null
          metadata: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          identity_id?: string | null
          title: string
          slug: string
          description?: string | null
          status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          target_date?: string | null
          completed_at?: string | null
          archived_at?: string | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          identity_id?: string | null
          title?: string
          slug?: string
          description?: string | null
          status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          start_date?: string | null
          target_date?: string | null
          completed_at?: string | null
          archived_at?: string | null
          metadata?: Json
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          owner_id: string
          name: string
          domain: string | null
          industry: string | null
          website: string | null
          linkedin_url: string | null
          x_handle: string | null
          description: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          domain?: string | null
          industry?: string | null
          website?: string | null
          linkedin_url?: string | null
          x_handle?: string | null
          description?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          domain?: string | null
          industry?: string | null
          website?: string | null
          linkedin_url?: string | null
          x_handle?: string | null
          description?: string | null
          archived_at?: string | null
          updated_at?: string
        }
      }
      workspace_companies: {
        Row: {
          id: string
          workspace_id: string
          company_id: string
          tier: 'tier_1' | 'tier_2' | 'tier_3' | 'archived'
          status: 'prospect' | 'active' | 'partner' | 'portfolio' | 'vendor' | 'past'
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          company_id: string
          tier?: 'tier_1' | 'tier_2' | 'tier_3' | 'archived'
          status?: 'prospect' | 'active' | 'partner' | 'portfolio' | 'vendor' | 'past'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          company_id?: string
          tier?: 'tier_1' | 'tier_2' | 'tier_3' | 'archived'
          status?: 'prospect' | 'active' | 'partner' | 'portfolio' | 'vendor' | 'past'
          notes?: string | null
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          owner_id: string
          company_id: string | null
          full_name: string
          email: string | null
          phone: string | null
          role_title: string | null
          location: string | null
          bio: string | null
          avatar_url: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          company_id?: string | null
          full_name: string
          email?: string | null
          phone?: string | null
          role_title?: string | null
          location?: string | null
          bio?: string | null
          avatar_url?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          company_id?: string | null
          full_name?: string
          email?: string | null
          phone?: string | null
          role_title?: string | null
          location?: string | null
          bio?: string | null
          avatar_url?: string | null
          archived_at?: string | null
          updated_at?: string
        }
      }
      workspace_contacts: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string
          primary_identity_id: string | null
          relationship_type: string | null
          relationship_stage: 'lead' | 'outreach' | 'connected' | 'in_discussion' | 'partner' | 'investor' | 'client' | 'dormant' | 'archived'
          relationship_score: number
          priority: 'low' | 'medium' | 'high' | 'urgent'
          notes: string | null
          last_contacted_at: string | null
          next_follow_up_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id: string
          primary_identity_id?: string | null
          relationship_type?: string | null
          relationship_stage?: 'lead' | 'outreach' | 'connected' | 'in_discussion' | 'partner' | 'investor' | 'client' | 'dormant' | 'archived'
          relationship_score?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          notes?: string | null
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string
          primary_identity_id?: string | null
          relationship_type?: string | null
          relationship_stage?: 'lead' | 'outreach' | 'connected' | 'in_discussion' | 'partner' | 'investor' | 'client' | 'dormant' | 'archived'
          relationship_score?: number
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          notes?: string | null
          last_contacted_at?: string | null
          next_follow_up_at?: string | null
          updated_at?: string
        }
      }
      social_profiles: {
        Row: {
          id: string
          contact_id: string
          platform: 'x' | 'telegram' | 'linkedin' | 'discord' | 'farcaster' | 'github' | 'other'
          handle: string
          profile_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          platform: 'x' | 'telegram' | 'linkedin' | 'discord' | 'farcaster' | 'github' | 'other'
          handle: string
          profile_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          platform?: 'x' | 'telegram' | 'linkedin' | 'discord' | 'farcaster' | 'github' | 'other'
          handle?: string
          profile_url?: string | null
        }
      }
      interactions: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string
          identity_id: string | null
          channel: 'x' | 'telegram' | 'linkedin' | 'email' | 'call' | 'meeting' | 'in_person' | 'other'
          direction: 'inbound' | 'outbound' | 'internal_note'
          purpose: string | null
          subject: string | null
          content: string
          response: string | null
          status: 'planned' | 'completed' | 'cancelled' | 'no_response'
          sentiment: 'positive' | 'neutral' | 'negative' | 'critical' | null
          next_action: string | null
          follow_up_at: string | null
          notes: string | null
          interaction_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id: string
          identity_id?: string | null
          channel: 'x' | 'telegram' | 'linkedin' | 'email' | 'call' | 'meeting' | 'in_person' | 'other'
          direction?: 'inbound' | 'outbound' | 'internal_note'
          purpose?: string | null
          subject?: string | null
          content: string
          response?: string | null
          status?: 'planned' | 'completed' | 'cancelled' | 'no_response'
          sentiment?: 'positive' | 'neutral' | 'negative' | 'critical' | null
          next_action?: string | null
          follow_up_at?: string | null
          notes?: string | null
          interaction_date?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string
          identity_id?: string | null
          channel?: 'x' | 'telegram' | 'linkedin' | 'email' | 'call' | 'meeting' | 'in_person' | 'other'
          direction?: 'inbound' | 'outbound' | 'internal_note'
          purpose?: string | null
          subject?: string | null
          content?: string
          response?: string | null
          status?: 'planned' | 'completed' | 'cancelled' | 'no_response'
          sentiment?: 'positive' | 'neutral' | 'negative' | 'critical' | null
          next_action?: string | null
          follow_up_at?: string | null
          notes?: string | null
          interaction_date?: string
        }
      }
      follow_ups: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string
          interaction_id: string | null
          title: string
          description: string | null
          due_date: string
          status: 'pending' | 'completed' | 'cancelled' | 'rescheduled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          completed_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id: string
          interaction_id?: string | null
          title: string
          description?: string | null
          due_date: string
          status?: 'pending' | 'completed' | 'cancelled' | 'rescheduled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          completed_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string
          interaction_id?: string | null
          title?: string
          description?: string | null
          due_date?: string
          status?: 'pending' | 'completed' | 'cancelled' | 'rescheduled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          completed_at?: string | null
          updated_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          workspace_id: string
          contact_id: string | null
          company_id: string | null
          title: string
          type: 'growth_strategy' | 'defi_research' | 'tokenomics' | 'advisory' | 'pevra_partnership' | 'investment' | 'collaboration' | 'other'
          description: string | null
          value_estimate: number | null
          currency: string
          pipeline_stage: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'on_hold'
          probability: number
          next_action: string | null
          expected_close_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          contact_id?: string | null
          company_id?: string | null
          title: string
          type?: 'growth_strategy' | 'defi_research' | 'tokenomics' | 'advisory' | 'pevra_partnership' | 'investment' | 'collaboration' | 'other'
          description?: string | null
          value_estimate?: number | null
          currency?: string
          pipeline_stage?: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'on_hold'
          probability?: number
          next_action?: string | null
          expected_close_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          contact_id?: string | null
          company_id?: string | null
          title?: string
          type?: 'growth_strategy' | 'defi_research' | 'tokenomics' | 'advisory' | 'pevra_partnership' | 'investment' | 'collaboration' | 'other'
          description?: string | null
          value_estimate?: number | null
          currency?: string
          pipeline_stage?: 'lead' | 'discovery' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'on_hold'
          probability?: number
          next_action?: string | null
          expected_close_date?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      research_records: {
        Row: {
          id: string
          workspace_id: string
          title: string
          research_type: 'protocol' | 'market' | 'tokenomics' | 'growth' | 'company' | 'person' | 'product' | 'technology' | 'regulatory' | 'pevra' | 'other'
          status: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          research_question: string | null
          objective: string | null
          summary: string | null
          findings: string | null
          conclusion: string | null
          next_action: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          archived_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          research_type?: 'protocol' | 'market' | 'tokenomics' | 'growth' | 'company' | 'person' | 'product' | 'technology' | 'regulatory' | 'pevra' | 'other'
          status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          research_question?: string | null
          objective?: string | null
          summary?: string | null
          findings?: string | null
          conclusion?: string | null
          next_action?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          research_type?: 'protocol' | 'market' | 'tokenomics' | 'growth' | 'company' | 'person' | 'product' | 'technology' | 'regulatory' | 'pevra' | 'other'
          status?: 'planning' | 'active' | 'paused' | 'completed' | 'archived'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          research_question?: string | null
          objective?: string | null
          summary?: string | null
          findings?: string | null
          conclusion?: string | null
          next_action?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
      }
      research_sources: {
        Row: {
          id: string
          workspace_id: string
          research_record_id: string
          title: string
          source_type: 'article' | 'research_report' | 'documentation' | 'whitepaper' | 'official_website' | 'social_post' | 'interview' | 'dataset' | 'academic_paper' | 'regulatory_document' | 'video' | 'other'
          url: string | null
          publisher: string | null
          author: string | null
          published_at: string | null
          accessed_at: string
          notes: string | null
          archived_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          research_record_id: string
          title: string
          source_type?: 'article' | 'research_report' | 'documentation' | 'whitepaper' | 'official_website' | 'social_post' | 'interview' | 'dataset' | 'academic_paper' | 'regulatory_document' | 'video' | 'other'
          url?: string | null
          publisher?: string | null
          author?: string | null
          published_at?: string | null
          accessed_at?: string
          notes?: string | null
          archived_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          research_record_id?: string
          title?: string
          source_type?: 'article' | 'research_report' | 'documentation' | 'whitepaper' | 'official_website' | 'social_post' | 'interview' | 'dataset' | 'academic_paper' | 'regulatory_document' | 'video' | 'other'
          url?: string | null
          publisher?: string | null
          author?: string | null
          published_at?: string | null
          accessed_at?: string
          notes?: string | null
          archived_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      research_evidence: {
        Row: {
          id: string
          workspace_id: string
          research_record_id: string
          source_id: string
          evidence_text: string
          claim_summary: string | null
          context_location: string | null
          notes: string | null
          archived_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          research_record_id: string
          source_id: string
          evidence_text: string
          claim_summary?: string | null
          context_location?: string | null
          notes?: string | null
          archived_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          research_record_id?: string
          source_id?: string
          evidence_text?: string
          claim_summary?: string | null
          context_location?: string | null
          notes?: string | null
          archived_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      research_connections: {
        Row: {
          id: string
          workspace_id: string
          research_record_id: string
          contact_id: string | null
          company_id: string | null
          opportunity_id: string | null
          project_id: string | null
          relationship_type: 'subject' | 'stakeholder' | 'partner' | 'competitor' | 'due_diligence' | 'supporting'
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          research_record_id: string
          contact_id?: string | null
          company_id?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          relationship_type?: 'subject' | 'stakeholder' | 'partner' | 'competitor' | 'due_diligence' | 'supporting'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          research_record_id?: string
          contact_id?: string | null
          company_id?: string | null
          opportunity_id?: string | null
          project_id?: string | null
          relationship_type?: 'subject' | 'stakeholder' | 'partner' | 'competitor' | 'due_diligence' | 'supporting'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          workspace_id: string
          title: string
          review_type: 'project' | 'campaign' | 'growth' | 'strategy' | 'opportunity' | 'partnership' | 'period' | 'other'
          status: 'draft' | 'completed' | 'archived'
          period_start: string | null
          period_end: string | null
          objective: string | null
          expected_outcome: string | null
          actual_outcome: string | null
          what_worked: string | null
          what_did_not_work: string | null
          why: string | null
          lessons: string | null
          next_changes: string | null
          summary: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          archived_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          title: string
          review_type?: 'project' | 'campaign' | 'growth' | 'strategy' | 'opportunity' | 'partnership' | 'period' | 'other'
          status?: 'draft' | 'completed' | 'archived'
          period_start?: string | null
          period_end?: string | null
          objective?: string | null
          expected_outcome?: string | null
          actual_outcome?: string | null
          what_worked?: string | null
          what_did_not_work?: string | null
          why?: string | null
          lessons?: string | null
          next_changes?: string | null
          summary?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          title?: string
          review_type?: 'project' | 'campaign' | 'growth' | 'strategy' | 'opportunity' | 'partnership' | 'period' | 'other'
          status?: 'draft' | 'completed' | 'archived'
          period_start?: string | null
          period_end?: string | null
          objective?: string | null
          expected_outcome?: string | null
          actual_outcome?: string | null
          what_worked?: string | null
          what_did_not_work?: string | null
          why?: string | null
          lessons?: string | null
          next_changes?: string | null
          summary?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}