export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          target_label: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs_archive: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          target_label: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          target_label?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          comic_id: string
          comic_title: string
          commission_status: string | null
          converted: boolean | null
          created_at: string | null
          genre: string | null
          id: string
          ip_address: string | null
          platform: string
          product_type: string
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          comic_id: string
          comic_title: string
          commission_status?: string | null
          converted?: boolean | null
          created_at?: string | null
          genre?: string | null
          id?: string
          ip_address?: string | null
          platform: string
          product_type: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          comic_id?: string
          comic_title?: string
          commission_status?: string | null
          converted?: boolean | null
          created_at?: string | null
          genre?: string | null
          id?: string
          ip_address?: string | null
          platform?: string
          product_type?: string
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      affiliate_earnings: {
        Row: {
          amount: number | null
          click_id: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          platform: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          click_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          platform: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          click_id?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          platform?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_earnings_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_product_mappings: {
        Row: {
          commission_range: string | null
          created_at: string | null
          genre: string
          id: string
          is_active: boolean | null
          platform: string
          product_type: string
          search_query_template: string
        }
        Insert: {
          commission_range?: string | null
          created_at?: string | null
          genre: string
          id?: string
          is_active?: boolean | null
          platform: string
          product_type: string
          search_query_template: string
        }
        Update: {
          commission_range?: string | null
          created_at?: string | null
          genre?: string
          id?: string
          is_active?: boolean | null
          platform?: string
          product_type?: string
          search_query_template?: string
        }
        Relationships: []
      }
      affiliate_programs: {
        Row: {
          affiliate_tag_param: string
          affiliate_tag_value: string
          base_url: string
          commission_rate: number | null
          cookie_days: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string
        }
        Insert: {
          affiliate_tag_param: string
          affiliate_tag_value: string
          base_url: string
          commission_rate?: number | null
          cookie_days?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
        }
        Update: {
          affiliate_tag_param?: string
          affiliate_tag_value?: string
          base_url?: string
          commission_rate?: number | null
          cookie_days?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
        }
        Relationships: []
      }
      checker_priority_queue: {
        Row: {
          created_at: string
          detected_at: string
          flagged_chapter: string | null
          id: number
          next_retry_at: string | null
          processed_at: string | null
          recommendation_id: string
          retry_count: number
          source: string
          source_release_id: number | null
        }
        Insert: {
          created_at?: string
          detected_at?: string
          flagged_chapter?: string | null
          id?: never
          next_retry_at?: string | null
          processed_at?: string | null
          recommendation_id: string
          retry_count?: number
          source?: string
          source_release_id?: number | null
        }
        Update: {
          created_at?: string
          detected_at?: string
          flagged_chapter?: string | null
          id?: never
          next_retry_at?: string | null
          processed_at?: string | null
          recommendation_id?: string
          retry_count?: number
          source?: string
          source_release_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checker_priority_queue_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string | null
          collection_id: string
          id: string
          note: string | null
          position: number | null
          recommendation_id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          id?: string
          note?: string | null
          position?: number | null
          recommendation_id: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          id?: string
          note?: string | null
          position?: number | null
          recommendation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_saves: {
        Row: {
          collection_id: string
          id: string
          saved_at: string | null
          user_id: string
        }
        Insert: {
          collection_id: string
          id?: string
          saved_at?: string | null
          user_id: string
        }
        Update: {
          collection_id?: string
          id?: string
          saved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_saves_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          save_count: number | null
          theme_color: string | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          save_count?: number | null
          theme_color?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          save_count?: number | null
          theme_color?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_locks: {
        Row: {
          job_name: string
          locked_until: string
        }
        Insert: {
          job_name: string
          locked_until: string
        }
        Update: {
          job_name?: string
          locked_until?: string
        }
        Relationships: []
      }
      custom_entries: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          notes: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_featured: {
        Row: {
          created_at: string | null
          feature_date: string
          id: string
          rank: number | null
          recommendation_id: string
          vote_count: number | null
        }
        Insert: {
          created_at?: string | null
          feature_date: string
          id?: string
          rank?: number | null
          recommendation_id: string
          vote_count?: number | null
        }
        Update: {
          created_at?: string | null
          feature_date?: string
          id?: string
          rank?: number | null
          recommendation_id?: string
          vote_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_featured_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_submission_counts: {
        Row: {
          count: number | null
          created_at: string | null
          date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          count?: number | null
          created_at?: string | null
          date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_submission_counts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_logs: {
        Row: {
          id: string
          month: string
          sent_at: string | null
          stats: Json | null
          user_id: string
        }
        Insert: {
          id?: string
          month: string
          sent_at?: string | null
          stats?: Json | null
          user_id: string
        }
        Update: {
          id?: string
          month?: string
          sent_at?: string | null
          stats?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_webhooks: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          webhook_type: string
          webhook_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          webhook_type: string
          webhook_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          webhook_type?: string
          webhook_url?: string
        }
        Relationships: []
      }
      dmca_submissions: {
        Row: {
          accuracy: boolean
          authority: boolean
          claimant_email: string
          claimant_name: string
          company: string | null
          content_type: string
          copyrighted_work: string
          created_at: string | null
          description: string
          good_faith: boolean
          id: string
          infringing_url: string
          ip_address: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          signature: string
          status: string
          updated_at: string | null
        }
        Insert: {
          accuracy?: boolean
          authority?: boolean
          claimant_email: string
          claimant_name: string
          company?: string | null
          content_type: string
          copyrighted_work: string
          created_at?: string | null
          description: string
          good_faith?: boolean
          id?: string
          infringing_url: string
          ip_address?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signature: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          accuracy?: boolean
          authority?: boolean
          claimant_email?: string
          claimant_name?: string
          company?: string | null
          content_type?: string
          copyrighted_work?: string
          created_at?: string | null
          description?: string
          good_faith?: boolean
          id?: string
          infringing_url?: string
          ip_address?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          signature?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dmca_submissions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          enabled_for_roles: string[] | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          enabled_for_roles?: string[] | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          enabled_for_roles?: string[] | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_daily_stats: {
        Row: {
          date: string
          id: string
          peak_hour_triggered: boolean | null
          peak_hour_triggered_at: string | null
          total_submissions: number | null
          updated_at: string | null
        }
        Insert: {
          date?: string
          id?: string
          peak_hour_triggered?: boolean | null
          peak_hour_triggered_at?: string | null
          total_submissions?: number | null
          updated_at?: string | null
        }
        Update: {
          date?: string
          id?: string
          peak_hour_triggered?: boolean | null
          peak_hour_triggered_at?: string | null
          total_submissions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          list_id: string | null
          matched_count: number
          skipped_count: number
          skipped_titles: Json
          source: string
          status: string
          total_entries: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          list_id?: string | null
          matched_count?: number
          skipped_count?: number
          skipped_titles?: Json
          source: string
          status?: string
          total_entries?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          list_id?: string | null
          matched_count?: number
          skipped_count?: number
          skipped_titles?: Json
          source?: string
          status?: string
          total_entries?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      list_stars: {
        Row: {
          created_at: string | null
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_stars_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_stars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          affiliate_disclaimer: string | null
          affiliate_url: string | null
          ai_model: string | null
          author: string | null
          category: string
          click_count: number | null
          content: string | null
          cover_alt: string | null
          cover_url: string | null
          created_at: string | null
          excerpt: string
          featured_at: string | null
          id: string
          is_affiliate: boolean | null
          is_ai_generated: boolean | null
          is_premium: boolean | null
          is_published: boolean | null
          premium_preview_lines: number | null
          published_at: string | null
          published_by: string | null
          share_count: number | null
          slug: string
          source_name: string
          source_url: string
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          affiliate_disclaimer?: string | null
          affiliate_url?: string | null
          ai_model?: string | null
          author?: string | null
          category: string
          click_count?: number | null
          content?: string | null
          cover_alt?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt: string
          featured_at?: string | null
          id?: string
          is_affiliate?: boolean | null
          is_ai_generated?: boolean | null
          is_premium?: boolean | null
          is_published?: boolean | null
          premium_preview_lines?: number | null
          published_at?: string | null
          published_by?: string | null
          share_count?: number | null
          slug: string
          source_name: string
          source_url: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          affiliate_disclaimer?: string | null
          affiliate_url?: string | null
          ai_model?: string | null
          author?: string | null
          category?: string
          click_count?: number | null
          content?: string | null
          cover_alt?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt?: string
          featured_at?: string | null
          id?: string
          is_affiliate?: boolean | null
          is_ai_generated?: boolean | null
          is_premium?: boolean | null
          is_published?: boolean | null
          premium_preview_lines?: number | null
          published_at?: string | null
          published_by?: string | null
          share_count?: number | null
          slug?: string
          source_name?: string
          source_url?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "news_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_digest_queue: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          sent_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          sent_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_digest_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          read_at: string | null
          should_push: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          should_push?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          should_push?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_leaderboard: {
        Row: {
          created_at: string | null
          id: string
          month: string
          rank: number | null
          recommendations_count: number | null
          score: number | null
          total_saves: number | null
          total_upvotes: number | null
          total_views: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          rank?: number | null
          recommendations_count?: number | null
          score?: number | null
          total_saves?: number | null
          total_upvotes?: number | null
          total_views?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          rank?: number | null
          recommendations_count?: number | null
          score?: number | null
          total_saves?: number | null
          total_upvotes?: number | null
          total_views?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pro_leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pro_waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          tier: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          tier?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          tier?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          profile_id: string
          viewed_at: string | null
          viewer_id: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          viewed_at?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adult_content_enabled: boolean | null
          adult_content_enabled_at: string | null
          appeal_status: string | null
          appeal_text: string | null
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          bio: string | null
          collection_count: number | null
          comic_url: string | null
          created_at: string | null
          discord_user_id: string | null
          display_name: string | null
          email_notifications: boolean | null
          favorite_genres: string[] | null
          favorite_platforms: string[] | null
          id: string
          is_banned: boolean | null
          is_patron: boolean
          is_pro: boolean | null
          is_suspended: boolean | null
          kickstarter_url: string | null
          last_seen: string | null
          member_since: string | null
          notification_prefs: Json
          onboarding_completed: boolean | null
          patreon_url: string | null
          patron_expires_at: string | null
          pinned_recommendation_id: string | null
          pro_digest_enabled: boolean | null
          pro_digest_last_sent: string | null
          pro_expires_at: string | null
          pro_leaderboard_score: number | null
          profile_theme: string | null
          profile_views_count: number | null
          profile_views_month_reset: string | null
          profile_views_this_month: number | null
          recommendation_count_this_month: number | null
          recommendation_month_reset: string | null
          role: string | null
          social_links: Json | null
          suspended_until: string | null
          suspension_reason: string | null
          theme_preference: string | null
          total_recommendations: number | null
          total_reviews: number | null
          total_saves: number | null
          total_votes_received: number | null
          updated_at: string | null
          user_type: string
          username: string
          verified_recommender: boolean | null
          website: string | null
        }
        Insert: {
          adult_content_enabled?: boolean | null
          adult_content_enabled_at?: string | null
          appeal_status?: string | null
          appeal_text?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          collection_count?: number | null
          comic_url?: string | null
          created_at?: string | null
          discord_user_id?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          favorite_genres?: string[] | null
          favorite_platforms?: string[] | null
          id: string
          is_banned?: boolean | null
          is_patron?: boolean
          is_pro?: boolean | null
          is_suspended?: boolean | null
          kickstarter_url?: string | null
          last_seen?: string | null
          member_since?: string | null
          notification_prefs?: Json
          onboarding_completed?: boolean | null
          patreon_url?: string | null
          patron_expires_at?: string | null
          pinned_recommendation_id?: string | null
          pro_digest_enabled?: boolean | null
          pro_digest_last_sent?: string | null
          pro_expires_at?: string | null
          pro_leaderboard_score?: number | null
          profile_theme?: string | null
          profile_views_count?: number | null
          profile_views_month_reset?: string | null
          profile_views_this_month?: number | null
          recommendation_count_this_month?: number | null
          recommendation_month_reset?: string | null
          role?: string | null
          social_links?: Json | null
          suspended_until?: string | null
          suspension_reason?: string | null
          theme_preference?: string | null
          total_recommendations?: number | null
          total_reviews?: number | null
          total_saves?: number | null
          total_votes_received?: number | null
          updated_at?: string | null
          user_type?: string
          username: string
          verified_recommender?: boolean | null
          website?: string | null
        }
        Update: {
          adult_content_enabled?: boolean | null
          adult_content_enabled_at?: string | null
          appeal_status?: string | null
          appeal_text?: string | null
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          collection_count?: number | null
          comic_url?: string | null
          created_at?: string | null
          discord_user_id?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          favorite_genres?: string[] | null
          favorite_platforms?: string[] | null
          id?: string
          is_banned?: boolean | null
          is_patron?: boolean
          is_pro?: boolean | null
          is_suspended?: boolean | null
          kickstarter_url?: string | null
          last_seen?: string | null
          member_since?: string | null
          notification_prefs?: Json
          onboarding_completed?: boolean | null
          patreon_url?: string | null
          patron_expires_at?: string | null
          pinned_recommendation_id?: string | null
          pro_digest_enabled?: boolean | null
          pro_digest_last_sent?: string | null
          pro_expires_at?: string | null
          pro_leaderboard_score?: number | null
          profile_theme?: string | null
          profile_views_count?: number | null
          profile_views_month_reset?: string | null
          profile_views_this_month?: number | null
          recommendation_count_this_month?: number | null
          recommendation_month_reset?: string | null
          role?: string | null
          social_links?: Json | null
          suspended_until?: string | null
          suspension_reason?: string | null
          theme_preference?: string | null
          total_recommendations?: number | null
          total_reviews?: number | null
          total_saves?: number | null
          total_votes_received?: number | null
          updated_at?: string | null
          user_type?: string
          username?: string
          verified_recommender?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_pinned_recommendation_id_fkey"
            columns: ["pinned_recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string | null
          id: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recommendation_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_list_items: {
        Row: {
          added_at: string | null
          custom_entry_id: string | null
          id: string
          last_read_at: string | null
          list_id: string
          notes: string | null
          position: number
          progress_chapter: number | null
          recommendation_id: string | null
          status: string | null
          sub_status: string | null
          updated_at: string | null
        }
        Insert: {
          added_at?: string | null
          custom_entry_id?: string | null
          id?: string
          last_read_at?: string | null
          list_id: string
          notes?: string | null
          position?: number
          progress_chapter?: number | null
          recommendation_id?: string | null
          status?: string | null
          sub_status?: string | null
          updated_at?: string | null
        }
        Update: {
          added_at?: string | null
          custom_entry_id?: string | null
          id?: string
          last_read_at?: string | null
          list_id?: string
          notes?: string | null
          position?: number
          progress_chapter?: number | null
          recommendation_id?: string | null
          status?: string | null
          sub_status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_list_items_custom_entry_id_fkey"
            columns: ["custom_entry_id"]
            isOneToOne: false
            referencedRelation: "custom_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reading_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_list_items_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_lists: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          star_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          star_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          star_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_analytics: {
        Row: {
          created_at: string | null
          date: string
          downvotes: number | null
          id: string
          recommendation_id: string
          saves: number | null
          updated_at: string | null
          upvotes: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          downvotes?: number | null
          id?: string
          recommendation_id: string
          saves?: number | null
          updated_at?: string | null
          upvotes?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          downvotes?: number | null
          id?: string
          recommendation_id?: string
          saves?: number | null
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_analytics_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          ai_model: string | null
          alternative_titles: string[] | null
          alternative_titles_flat: string | null
          anilist_id: string | null
          appeal_status: string | null
          appeal_submitted_at: string | null
          appeal_text: string | null
          artist: string | null
          author: string | null
          auto_hidden: boolean | null
          auto_hidden_at: string | null
          banner_url: string | null
          best_for: string | null
          carousel_until: string | null
          chapter_count: number | null
          cons: string[] | null
          content_rating: string | null
          content_warnings: string[] | null
          cover_credit: string | null
          cover_url: string | null
          created_at: string | null
          daily_submissions_count: number | null
          daily_votes: number | null
          description: string
          downvotes: number | null
          draft_saved_at: string | null
          featured_at: string | null
          featured_by: string | null
          genres: string[]
          id: string
          id_locked_fields: string[]
          id_needs_recheck: boolean | null
          is_ai_generated: boolean | null
          is_approved: boolean | null
          is_draft: boolean | null
          is_featured: boolean | null
          is_official_only: boolean | null
          is_pro_submission: boolean | null
          kitsu_id: string | null
          last_chapter_check: string | null
          last_daily_reset: string | null
          last_full_reverify: string | null
          last_id_check: string | null
          last_more_info_check: string | null
          mal_id: string | null
          mangabaka_id: string | null
          mangadex_id: string | null
          mangaupdates_id: string | null
          more_info_link: string | null
          more_info_link_source:
            | Database["public"]["Enums"]["more_info_link_source"]
            | null
          more_info_link_verified_at: string | null
          official_links: string[] | null
          official_platforms: string[]
          original_language: string | null
          original_total_chapters: number | null
          pending_original_status: string | null
          pros: string[] | null
          publisher: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          report_count: number | null
          report_threshold_hit_at: string | null
          review_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          save_count: number | null
          score: number | null
          status: string
          themes: string[] | null
          title: string
          translation_status: string
          type: string
          updated_at: string | null
          upvotes: number | null
          user_id: string
          view_count: number | null
          why_recommend: string | null
          year_confidence: string | null
          year_ended: number | null
          year_released: number | null
        }
        Insert: {
          ai_model?: string | null
          alternative_titles?: string[] | null
          alternative_titles_flat?: string | null
          anilist_id?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          artist?: string | null
          author?: string | null
          auto_hidden?: boolean | null
          auto_hidden_at?: string | null
          banner_url?: string | null
          best_for?: string | null
          carousel_until?: string | null
          chapter_count?: number | null
          cons?: string[] | null
          content_rating?: string | null
          content_warnings?: string[] | null
          cover_credit?: string | null
          cover_url?: string | null
          created_at?: string | null
          daily_submissions_count?: number | null
          daily_votes?: number | null
          description: string
          downvotes?: number | null
          draft_saved_at?: string | null
          featured_at?: string | null
          featured_by?: string | null
          genres: string[]
          id?: string
          id_locked_fields?: string[]
          id_needs_recheck?: boolean | null
          is_ai_generated?: boolean | null
          is_approved?: boolean | null
          is_draft?: boolean | null
          is_featured?: boolean | null
          is_official_only?: boolean | null
          is_pro_submission?: boolean | null
          kitsu_id?: string | null
          last_chapter_check?: string | null
          last_daily_reset?: string | null
          last_full_reverify?: string | null
          last_id_check?: string | null
          last_more_info_check?: string | null
          mal_id?: string | null
          mangabaka_id?: string | null
          mangadex_id?: string | null
          mangaupdates_id?: string | null
          more_info_link?: string | null
          more_info_link_source?:
            | Database["public"]["Enums"]["more_info_link_source"]
            | null
          more_info_link_verified_at?: string | null
          official_links?: string[] | null
          official_platforms: string[]
          original_language?: string | null
          original_total_chapters?: number | null
          pending_original_status?: string | null
          pros?: string[] | null
          publisher?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          report_count?: number | null
          report_threshold_hit_at?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          save_count?: number | null
          score?: number | null
          status: string
          themes?: string[] | null
          title: string
          translation_status?: string
          type: string
          updated_at?: string | null
          upvotes?: number | null
          user_id: string
          view_count?: number | null
          why_recommend?: string | null
          year_confidence?: string | null
          year_ended?: number | null
          year_released?: number | null
        }
        Update: {
          ai_model?: string | null
          alternative_titles?: string[] | null
          alternative_titles_flat?: string | null
          anilist_id?: string | null
          appeal_status?: string | null
          appeal_submitted_at?: string | null
          appeal_text?: string | null
          artist?: string | null
          author?: string | null
          auto_hidden?: boolean | null
          auto_hidden_at?: string | null
          banner_url?: string | null
          best_for?: string | null
          carousel_until?: string | null
          chapter_count?: number | null
          cons?: string[] | null
          content_rating?: string | null
          content_warnings?: string[] | null
          cover_credit?: string | null
          cover_url?: string | null
          created_at?: string | null
          daily_submissions_count?: number | null
          daily_votes?: number | null
          description?: string
          downvotes?: number | null
          draft_saved_at?: string | null
          featured_at?: string | null
          featured_by?: string | null
          genres?: string[]
          id?: string
          id_locked_fields?: string[]
          id_needs_recheck?: boolean | null
          is_ai_generated?: boolean | null
          is_approved?: boolean | null
          is_draft?: boolean | null
          is_featured?: boolean | null
          is_official_only?: boolean | null
          is_pro_submission?: boolean | null
          kitsu_id?: string | null
          last_chapter_check?: string | null
          last_daily_reset?: string | null
          last_full_reverify?: string | null
          last_id_check?: string | null
          last_more_info_check?: string | null
          mal_id?: string | null
          mangabaka_id?: string | null
          mangadex_id?: string | null
          mangaupdates_id?: string | null
          more_info_link?: string | null
          more_info_link_source?:
            | Database["public"]["Enums"]["more_info_link_source"]
            | null
          more_info_link_verified_at?: string | null
          official_links?: string[] | null
          official_platforms?: string[]
          original_language?: string | null
          original_total_chapters?: number | null
          pending_original_status?: string | null
          pros?: string[] | null
          publisher?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          report_count?: number | null
          report_threshold_hit_at?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          save_count?: number | null
          score?: number | null
          status?: string
          themes?: string[] | null
          title?: string
          translation_status?: string
          type?: string
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string
          view_count?: number | null
          why_recommend?: string | null
          year_confidence?: string | null
          year_ended?: number | null
          year_released?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_featured_by_fkey"
            columns: ["featured_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          details: string | null
          entity_id: string
          entity_type: string
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          entity_id: string
          entity_type: string
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean
          review_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          review_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          review_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          contains_spoilers: boolean | null
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_approved: boolean | null
          is_edited: boolean | null
          rating: number | null
          recommendation_id: string
          report_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contains_spoilers?: boolean | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_edited?: boolean | null
          rating?: number | null
          recommendation_id: string
          report_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contains_spoilers?: boolean | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_edited?: boolean | null
          rating?: number | null
          recommendation_id?: string
          report_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string | null
          id: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recommendation_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: number
          maintenance_message: string | null
          maintenance_mode: boolean
          updated_at: string
        }
        Insert: {
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
        }
        Update: {
          id?: number
          maintenance_message?: string | null
          maintenance_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      spam_blacklist: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      sponsored_impressions: {
        Row: {
          created_at: string | null
          id: string
          impression_type: string | null
          sponsored_pick_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impression_type?: string | null
          sponsored_pick_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impression_type?: string | null
          sponsored_pick_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_impressions_sponsored_pick_id_fkey"
            columns: ["sponsored_pick_id"]
            isOneToOne: false
            referencedRelation: "sponsored_picks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_impressions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsored_picks: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_budget: number
          campaign_name: string
          clicks: number | null
          cost_per_impression: number | null
          created_at: string | null
          ends_at: string
          id: string
          impressions: number | null
          is_approved: boolean | null
          payment_status: string | null
          paystack_reference: string | null
          placement: string
          recommendation_id: string | null
          sponsor_email: string
          sponsor_logo_url: string | null
          sponsor_name: string
          sponsor_url: string | null
          starts_at: string
          status: string | null
          target_genres: string[] | null
          target_platforms: string[] | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_budget: number
          campaign_name: string
          clicks?: number | null
          cost_per_impression?: number | null
          created_at?: string | null
          ends_at: string
          id?: string
          impressions?: number | null
          is_approved?: boolean | null
          payment_status?: string | null
          paystack_reference?: string | null
          placement: string
          recommendation_id?: string | null
          sponsor_email: string
          sponsor_logo_url?: string | null
          sponsor_name: string
          sponsor_url?: string | null
          starts_at: string
          status?: string | null
          target_genres?: string[] | null
          target_platforms?: string[] | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_budget?: number
          campaign_name?: string
          clicks?: number | null
          cost_per_impression?: number | null
          created_at?: string | null
          ends_at?: string
          id?: string
          impressions?: number | null
          is_approved?: boolean | null
          payment_status?: string | null
          paystack_reference?: string | null
          placement?: string
          recommendation_id?: string | null
          sponsor_email?: string
          sponsor_logo_url?: string | null
          sponsor_name?: string
          sponsor_url?: string | null
          starts_at?: string
          status?: string | null
          target_genres?: string[] | null
          target_platforms?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsored_picks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsored_picks_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          flutterwave_reference: string | null
          gateway: string
          id: string
          next_payment_date: string | null
          paystack_customer_code: string | null
          paystack_plan_code: string | null
          paystack_reference: string | null
          paystack_subscription_code: string | null
          plan: string
          started_at: string | null
          status: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          flutterwave_reference?: string | null
          gateway?: string
          id?: string
          next_payment_date?: string | null
          paystack_customer_code?: string | null
          paystack_plan_code?: string | null
          paystack_reference?: string | null
          paystack_subscription_code?: string | null
          plan: string
          started_at?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          flutterwave_reference?: string | null
          gateway?: string
          id?: string
          next_payment_date?: string | null
          paystack_customer_code?: string | null
          paystack_plan_code?: string | null
          paystack_reference?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          started_at?: string | null
          status?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          is_anonymous: boolean | null
          message: string | null
          paystack_reference: string
          platform_cut: number
          recipient_amount: number
          recipient_id: string
          sender_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          paystack_reference: string
          platform_cut: number
          recipient_amount: number
          recipient_id: string
          sender_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_anonymous?: boolean | null
          message?: string | null
          paystack_reference?: string
          platform_cut?: number
          recipient_amount?: number
          recipient_id?: string
          sender_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tips_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tips_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_comic_sources: {
        Row: {
          chapter_range: string | null
          created_at: string
          id: string
          label: string
          recommendation_id: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          chapter_range?: string | null
          created_at?: string
          id?: string
          label: string
          recommendation_id: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          chapter_range?: string | null
          created_at?: string
          id?: string
          label?: string
          recommendation_id?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_comic_sources_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_comic_sources_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          action: string
          context: Json | null
          created_at: string | null
          id: string
          recommendation_id: string | null
          user_id: string | null
          weight: number | null
        }
        Insert: {
          action: string
          context?: Json | null
          created_at?: string | null
          id?: string
          recommendation_id?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          action?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          recommendation_id?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_taste_profiles: {
        Row: {
          created_at: string | null
          era_weights: Json | null
          favorite_creators: string[] | null
          following_users: string[] | null
          genre_weights: Json | null
          preferred_ratings: string[] | null
          status_weights: Json | null
          taste_vector: string | null
          type_weights: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          era_weights?: Json | null
          favorite_creators?: string[] | null
          following_users?: string[] | null
          genre_weights?: Json | null
          preferred_ratings?: string[] | null
          status_weights?: Json | null
          taste_vector?: string | null
          type_weights?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          era_weights?: Json | null
          favorite_creators?: string[] | null
          following_users?: string[] | null
          genre_weights?: Json | null
          preferred_ratings?: string[] | null
          status_weights?: Json | null
          taste_vector?: string | null
          type_weights?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_taste_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string | null
          id: string
          recommendation_id: string
          updated_at: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recommendation_id: string
          updated_at?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recommendation_id?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_patron: {
        Args: {
          p_flutterwave_reference?: string
          p_gateway?: string
          p_paystack_customer_code?: string
          p_paystack_reference: string
          p_paystack_subscription_code?: string
          p_plan: string
          p_user_id: string
        }
        Returns: undefined
      }
      activate_pro: {
        Args: {
          p_flutterwave_reference?: string
          p_gateway?: string
          p_paystack_customer_code?: string
          p_paystack_reference: string
          p_paystack_subscription_code?: string
          p_plan: string
          p_user_id: string
        }
        Returns: undefined
      }
      can_submit_recommendation: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      expire_pro_subscriptions: { Args: never; Returns: undefined }
      find_similar_recommendations: {
        Args: { p_threshold?: number; p_title: string }
        Returns: {
          id: string
          is_approved: boolean
          match_type: string
          similarity: number
          title: string
        }[]
      }
      get_content_by_genre: { Args: never; Returns: Json }
      get_content_by_rating: { Args: never; Returns: Json }
      get_content_by_status: { Args: never; Returns: Json }
      get_content_by_type: { Args: never; Returns: Json }
      get_daily_active_users: {
        Args: { days_back: number }
        Returns: {
          date: string
          value: number
        }[]
      }
      get_daily_stats: {
        Args: { date_column: string; days_back: number; table_name: string }
        Returns: {
          date: string
          value: number
        }[]
      }
      get_discover_feed: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          avatar_url: string
          cover_url: string
          created_at: string
          description: string
          display_name: string
          genres: string[]
          id: string
          status: string
          title: string
          type: string
          upvotes: number
          user_id: string
          username: string
        }[]
      }
      get_diverse_recommendations: {
        Args: { p_limit: number; p_offset: number; p_user_id: string }
        Returns: {
          recommendation_id: string
          score: number
          title: string
        }[]
      }
      get_featured_comics: {
        Args: { limit_count?: number }
        Returns: {
          ai_model: string | null
          alternative_titles: string[] | null
          alternative_titles_flat: string | null
          anilist_id: string | null
          appeal_status: string | null
          appeal_submitted_at: string | null
          appeal_text: string | null
          artist: string | null
          author: string | null
          auto_hidden: boolean | null
          auto_hidden_at: string | null
          banner_url: string | null
          best_for: string | null
          carousel_until: string | null
          chapter_count: number | null
          cons: string[] | null
          content_rating: string | null
          content_warnings: string[] | null
          cover_credit: string | null
          cover_url: string | null
          created_at: string | null
          daily_submissions_count: number | null
          daily_votes: number | null
          description: string
          downvotes: number | null
          draft_saved_at: string | null
          featured_at: string | null
          featured_by: string | null
          genres: string[]
          id: string
          id_locked_fields: string[]
          id_needs_recheck: boolean | null
          is_ai_generated: boolean | null
          is_approved: boolean | null
          is_draft: boolean | null
          is_featured: boolean | null
          is_official_only: boolean | null
          is_pro_submission: boolean | null
          kitsu_id: string | null
          last_chapter_check: string | null
          last_daily_reset: string | null
          last_full_reverify: string | null
          last_id_check: string | null
          last_more_info_check: string | null
          mal_id: string | null
          mangabaka_id: string | null
          mangadex_id: string | null
          mangaupdates_id: string | null
          more_info_link: string | null
          more_info_link_source:
            | Database["public"]["Enums"]["more_info_link_source"]
            | null
          more_info_link_verified_at: string | null
          official_links: string[] | null
          official_platforms: string[]
          original_language: string | null
          original_total_chapters: number | null
          pending_original_status: string | null
          pros: string[] | null
          publisher: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          report_count: number | null
          report_threshold_hit_at: string | null
          review_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          save_count: number | null
          score: number | null
          status: string
          themes: string[] | null
          title: string
          translation_status: string
          type: string
          updated_at: string | null
          upvotes: number | null
          user_id: string
          view_count: number | null
          why_recommend: string | null
          year_confidence: string | null
          year_ended: number | null
          year_released: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recommendations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_following_feed: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          avatar_url: string
          cover_url: string
          created_at: string
          description: string
          display_name: string
          genres: string[]
          id: string
          status: string
          title: string
          type: string
          upvotes: number
          user_id: string
          username: string
        }[]
      }
      get_personalized_recommendations: {
        Args: {
          p_content_ratings: string[]
          p_exclude_id: string
          p_limit: number
          p_user_id: string
        }
        Returns: {
          content_rating: string
          cover_url: string
          created_at: string
          description: string
          downvotes: number
          genres: string[]
          id: string
          official_platforms: string[]
          recommendation_score: number
          review_count: number
          save_count: number
          score: number
          status: string
          title: string
          type: string
          upvotes: number
          user_id: string
        }[]
      }
      get_pro_leaderboard: {
        Args: { p_limit?: number; p_month?: string }
        Returns: {
          avatar_url: string
          display_name: string
          is_pro: boolean
          rank: number
          recommendations_count: number
          role: string
          score: number
          total_saves: number
          total_upvotes: number
          total_views: number
          user_id: string
          username: string
        }[]
      }
      get_similar_comics:
        | {
            Args: {
              p_comic_id: string
              p_content_ratings?: string[]
              p_limit?: number
            }
            Returns: {
              content_rating: string
              cover_url: string
              created_at: string
              description: string
              downvotes: number
              genres: string[]
              id: string
              official_platforms: string[]
              review_count: number
              save_count: number
              score: number
              similarity_score: number
              status: string
              title: string
              type: string
              upvotes: number
            }[]
          }
        | {
            Args: {
              p_comic_id: string
              p_content_ratings: string[]
              p_limit: number
              p_user_id?: string
            }
            Returns: {
              content_rating: string
              cover_url: string
              created_at: string
              description: string
              downvotes: number
              genres: string[]
              id: string
              official_platforms: string[]
              review_count: number
              save_count: number
              score: number
              similarity_score: number
              status: string
              title: string
              type: string
              upvotes: number
              user_id: string
            }[]
          }
      get_similar_comics_content_only: {
        Args: { p_adult: boolean; p_limit: number; p_source_comic_id: string }
        Returns: {
          author: string
          content_rating: string
          cover_url: string
          created_at: string
          description: string
          downvotes: number
          genres: string[]
          id: string
          is_featured: boolean
          is_personalized: boolean
          match_reason: string
          review_count: number
          save_count: number
          score: number
          status: string
          title: string
          type: string
          upvotes: number
          user_id: string
        }[]
      }
      get_similar_comics_personalized: {
        Args: {
          p_adult: boolean
          p_limit: number
          p_source_comic_id: string
          p_user_id: string
        }
        Returns: {
          author: string
          content_rating: string
          cover_url: string
          created_at: string
          description: string
          downvotes: number
          genres: string[]
          id: string
          is_featured: boolean
          is_personalized: boolean
          match_reason: string
          review_count: number
          save_count: number
          score: number
          status: string
          title: string
          type: string
          upvotes: number
          user_id: string
        }[]
      }
      get_trending_feed: {
        Args: { p_limit?: number }
        Returns: {
          cover_url: string
          id: string
          review_count: number
          title: string
          type: string
          upvotes: number
        }[]
      }
      get_wildcard_recommendations: {
        Args: { p_exclude_ids: string[]; p_limit: number; p_user_id: string }
        Returns: {
          author: string
          cover_url: string
          id: string
          score: number
          title: string
        }[]
      }
      has_feature_access: {
        Args: { p_feature: string; p_user_id: string }
        Returns: boolean
      }
      has_pro_access: { Args: { p_user_id: string }; Returns: boolean }
      immutable_array_to_string: {
        Args: { arr: string[]; sep: string }
        Returns: string
      }
      increment_daily_submission_count: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      increment_global_daily_count: {
        Args: { p_date: string }
        Returns: undefined
      }
      increment_rec_count: { Args: { p_user_id: string }; Returns: undefined }
      increment_view_count: { Args: { rec_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_user_pro: { Args: { p_user_id: string }; Returns: boolean }
      match_recommendation_title: {
        Args: {
          match_limit?: number
          search_title: string
          similarity_threshold?: number
        }
        Returns: {
          alt_similarity: number
          alternative_titles_flat: string
          id: string
          title: string
          title_similarity: number
        }[]
      }
      purge_old_archived_logs: { Args: never; Returns: number }
      refresh_personalized_recommendations: { Args: never; Returns: undefined }
      reset_daily_votes: { Args: never; Returns: undefined }
      reset_monthly_profile_views: { Args: never; Returns: undefined }
      reset_monthly_rec_counts: { Args: never; Returns: undefined }
      search_recommendations: {
        Args: {
          p_adult?: boolean
          p_genre?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_sort?: string
          p_status?: string
          p_type?: string
        }
        Returns: {
          ai_model: string | null
          alternative_titles: string[] | null
          alternative_titles_flat: string | null
          anilist_id: string | null
          appeal_status: string | null
          appeal_submitted_at: string | null
          appeal_text: string | null
          artist: string | null
          author: string | null
          auto_hidden: boolean | null
          auto_hidden_at: string | null
          banner_url: string | null
          best_for: string | null
          carousel_until: string | null
          chapter_count: number | null
          cons: string[] | null
          content_rating: string | null
          content_warnings: string[] | null
          cover_credit: string | null
          cover_url: string | null
          created_at: string | null
          daily_submissions_count: number | null
          daily_votes: number | null
          description: string
          downvotes: number | null
          draft_saved_at: string | null
          featured_at: string | null
          featured_by: string | null
          genres: string[]
          id: string
          id_locked_fields: string[]
          id_needs_recheck: boolean | null
          is_ai_generated: boolean | null
          is_approved: boolean | null
          is_draft: boolean | null
          is_featured: boolean | null
          is_official_only: boolean | null
          is_pro_submission: boolean | null
          kitsu_id: string | null
          last_chapter_check: string | null
          last_daily_reset: string | null
          last_full_reverify: string | null
          last_id_check: string | null
          last_more_info_check: string | null
          mal_id: string | null
          mangabaka_id: string | null
          mangadex_id: string | null
          mangaupdates_id: string | null
          more_info_link: string | null
          more_info_link_source:
            | Database["public"]["Enums"]["more_info_link_source"]
            | null
          more_info_link_verified_at: string | null
          official_links: string[] | null
          official_platforms: string[]
          original_language: string | null
          original_total_chapters: number | null
          pending_original_status: string | null
          pros: string[] | null
          publisher: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          report_count: number | null
          report_threshold_hit_at: string | null
          review_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          save_count: number | null
          score: number | null
          status: string
          themes: string[] | null
          title: string
          translation_status: string
          type: string
          updated_at: string | null
          upvotes: number | null
          user_id: string
          view_count: number | null
          why_recommend: string | null
          year_confidence: string | null
          year_ended: number | null
          year_released: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "recommendations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      track_profile_view: {
        Args: { p_profile_id: string; p_viewer_id: string }
        Returns: undefined
      }
      track_sponsored_impression: {
        Args: { p_pick_id: string; p_type: string; p_user_id: string }
        Returns: undefined
      }
      update_daily_featured: { Args: never; Returns: undefined }
      update_pro_leaderboard: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_taste_profile: {
        Args: {
          p_action: string
          p_recommendation_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      more_info_link_source:
        | "user_submitted"
        | "auto_fetched"
        | "admin_approved"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      more_info_link_source: [
        "user_submitted",
        "auto_fetched",
        "admin_approved",
      ],
    },
  },
} as const
