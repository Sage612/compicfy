export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          website: string | null
          social_links: Json
          favorite_genres: string[]
          favorite_platforms: string[]
          total_recommendations: number
          total_reviews: number
          total_votes_received: number
          member_since: string
          last_seen: string
          is_age_verified: boolean
          show_mature_content: boolean
          email_notifications: boolean
          theme_preference: string
          role: string
          is_banned: boolean
          ban_reason: string | null
          banned_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          social_links?: Json
          favorite_genres?: string[]
          favorite_platforms?: string[]
          total_recommendations?: number
          total_reviews?: number
          total_votes_received?: number
          member_since?: string
          last_seen?: string
          is_age_verified?: boolean
          show_mature_content?: boolean
          email_notifications?: boolean
          theme_preference?: string
          role?: string
          is_banned?: boolean
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          social_links?: Json
          favorite_genres?: string[]
          favorite_platforms?: string[]
          total_recommendations?: number
          total_reviews?: number
          total_votes_received?: number
          member_since?: string
          last_seen?: string
          is_age_verified?: boolean
          show_mature_content?: boolean
          email_notifications?: boolean
          theme_preference?: string
          role?: string
          is_banned?: boolean
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
