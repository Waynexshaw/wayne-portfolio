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
          project_id: string | null
          label: string
          value: string
          context: string | null
          date_range: string | null
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          label: string
          value: string
          context?: string | null
          date_range?: string | null
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          label?: string
          value?: string
          context?: string | null
          date_range?: string | null
          verified?: boolean
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
