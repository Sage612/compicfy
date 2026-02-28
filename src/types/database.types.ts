export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
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
          theme_preference: 'dark' | 'light' | 'system'
          role: 'user' | 'moderator' | 'admin'
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
          is_age_verified?: boolean
          show_mature_content?: boolean
          email_notifications?: boolean
          theme_preference?: 'dark' | 'light' | 'system'
          role?: 'user' | 'moderator' | 'admin'
          is_banned?: boolean
          ban_reason?: string | null
          banned_at?: string | null
        }
        Update: {
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          website?: string | null
          social_links?: Json
          favorite_genres?: string[]
          favorite_platforms?: string[]
          is_age_verified?: boolean
          show_mature_content?: boolean
          email_notifications?: boolean
          theme_preference?: 'dark' | 'light' | 'system'
          role?: 'user' | 'moderator' | 'admin'
          is_banned?: boolean
          ban_reason?: string | null
          banned_at?: string | null
          updated_at?: string
        }
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          title: string
          alternative_titles: string[]
          description: string
          type: 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other'
          status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled'
          genres: string[]
          themes: string[]
          content_warnings: string[]
          content_rating: 'all' | 'teen' | 'mature' | 'adult'
          official_platforms: string[]
          official_links: string[]
          is_official_only: boolean
          chapter_count: number | null
          year_released: number | null
          year_ended: number | null
          author: string | null
          artist: string | null
          publisher: string | null
          original_language: string | null
          cover_url: string | null
          cover_credit: string | null
          banner_url: string | null
          why_recommend: string | null
          best_for: string | null
          pros: string[]
          cons: string[]
          upvotes: number
          downvotes: number
          score: number
          view_count: number
          save_count: number
          review_count: number
          report_count: number
          daily_votes: number
          last_daily_reset: string
          is_approved: boolean
          is_featured: boolean
          featured_at: string | null
          is_ai_generated: boolean
          ai_model: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          alternative_titles?: string[]
          description: string
          type: 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other'
          status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled'
          genres: string[]
          themes?: string[]
          content_warnings?: string[]
          content_rating?: 'all' | 'teen' | 'mature' | 'adult'
          official_platforms: string[]
          official_links?: string[]
          is_official_only?: boolean
          chapter_count?: number | null
          year_released?: number | null
          year_ended?: number | null
          author?: string | null
          artist?: string | null
          publisher?: string | null
          original_language?: string | null
          cover_url?: string | null
          cover_credit?: string | null
          banner_url?: string | null
          why_recommend?: string | null
          best_for?: string | null
          pros?: string[]
          cons?: string[]
          is_approved?: boolean
          is_featured?: boolean
          featured_at?: string | null
          is_ai_generated?: boolean
          ai_model?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
        }
        Update: {
          title?: string
          alternative_titles?: string[]
          description?: string
          type?: 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other'
          status?: 'ongoing' | 'completed' | 'hiatus' | 'cancelled'
          genres?: string[]
          themes?: string[]
          content_warnings?: string[]
          content_rating?: 'all' | 'teen' | 'mature' | 'adult'
          official_platforms?: string[]
          official_links?: string[]
          is_official_only?: boolean
          chapter_count?: number | null
          year_released?: number | null
          year_ended?: number | null
          author?: string | null
          artist?: string | null
          publisher?: string | null
          original_language?: string | null
          cover_url?: string | null
          cover_credit?: string | null
          banner_url?: string | null
          why_recommend?: string | null
          best_for?: string | null
          pros?: string[]
          cons?: string[]
          is_approved?: boolean
          is_featured?: boolean
          featured_at?: string | null
          is_ai_generated?: boolean
          ai_model?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          updated_at?: string
        }
      }
      votes: {
        Row: {
          id: string
          user_id: string
          recommendation_id: string
          vote_type: 'up' | 'down'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recommendation_id: string
          vote_type: 'up' | 'down'
        }
        Update: {
          vote_type?: 'up' | 'down'
        }
      }
      saves: {
        Row: {
          id: string
          user_id: string
          recommendation_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recommendation_id: string
        }
        Update: Record<string, never>
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          recommendation_id: string
          content: string
          rating: number | null
          contains_spoilers: boolean
          is_approved: boolean
          report_count: number
          is_edited: boolean
          edited_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recommendation_id: string
          content: string
          rating?: number | null
          contains_spoilers?: boolean
        }
        Update: {
          content?: string
          rating?: number | null
          contains_spoilers?: boolean
          is_approved?: boolean
          is_edited?: boolean
          edited_at?: string | null
          updated_at?: string
        }
      }
      news: {
        Row: {
          id: string
          title: string
          slug: string
          excerpt: string
          content: string | null
          source_name: string
          source_url: string
          author: string | null
          category: 'industry' | 'release' | 'adaptation' | 'event' | 'creator' | 'announcement'
          tags: string[]
          cover_url: string | null
          cover_alt: string | null
          is_affiliate: boolean
          affiliate_url: string | null
          affiliate_disclaimer: string
          is_ai_generated: boolean
          ai_model: string | null
          view_count: number
          share_count: number
          click_count: number
          is_published: boolean
          published_by: string | null
          published_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          excerpt: string
          content?: string | null
          source_name: string
          source_url: string
          author?: string | null
          category: 'industry' | 'release' | 'adaptation' | 'event' | 'creator' | 'announcement'
          tags?: string[]
          cover_url?: string | null
          cover_alt?: string | null
          is_affiliate?: boolean
          affiliate_url?: string | null
          affiliate_disclaimer?: string
          is_ai_generated?: boolean
          ai_model?: string | null
          is_published?: boolean
          published_by?: string | null
          published_at?: string
        }
        Update: {
          title?: string
          slug?: string
          excerpt?: string
          content?: string | null
          source_name?: string
          source_url?: string
          author?: string | null
          category?: 'industry' | 'release' | 'adaptation' | 'event' | 'creator' | 'announcement'
          tags?: string[]
          cover_url?: string | null
          cover_alt?: string | null
          is_affiliate?: boolean
          affiliate_url?: string | null
          is_published?: boolean
          published_by?: string | null
          published_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: 'vote' | 'review' | 'reply' | 'feature' | 'achievement' | 'system'
          title: string
          content: string | null
          data: Json
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'vote' | 'review' | 'reply' | 'feature' | 'achievement' | 'system'
          title: string
          content?: string | null
          data?: Json
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          entity_type: 'recommendation' | 'review' | 'user' | 'comment'
          entity_id: string
          reason: string
          details: string | null
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          entity_type: 'recommendation' | 'review' | 'user' | 'comment'
          entity_id: string
          reason: string
          details?: string | null
        }
        Update: {
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          resolved_by?: string | null
          resolved_at?: string | null
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: Record<string, never>
      }
      daily_featured: {
        Row: {
          id: string
          recommendation_id: string
          feature_date: string
          vote_count: number
          rank: number | null
          created_at: string
        }
        Insert: {
          id?: string
          recommendation_id: string
          feature_date: string
          vote_count?: number
          rank?: number | null
        }
        Update: Record<string, never>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience type exports
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Recommendation = Database['public']['Tables']['recommendations']['Row']
export type RecommendationInsert = Database['public']['Tables']['recommendations']['Insert']
export type RecommendationUpdate = Database['public']['Tables']['recommendations']['Update']

export type Vote = Database['public']['Tables']['votes']['Row']
export type VoteInsert = Database['public']['Tables']['votes']['Insert']

export type Save = Database['public']['Tables']['saves']['Row']
export type SaveInsert = Database['public']['Tables']['saves']['Insert']

export type Review = Database['public']['Tables']['reviews']['Row']
export type ReviewInsert = Database['public']['Tables']['reviews']['Insert']
export type ReviewUpdate = Database['public']['Tables']['reviews']['Update']

export type News = Database['public']['Tables']['news']['Row']
export type NewsInsert = Database['public']['Tables']['news']['Insert']
export type NewsUpdate = Database['public']['Tables']['news']['Update']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type Report = Database['public']['Tables']['reports']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type DailyFeatured = Database['public']['Tables']['daily_featured']['Row']