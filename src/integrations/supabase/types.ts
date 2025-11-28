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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_insights: {
        Row: {
          account_id: string
          collected_at: string
          created_at: string
          engaged_audience: number | null
          followers_count: number | null
          id: string
          likes: number | null
          quotes: number | null
          replies: number | null
          reposts: number | null
          shares: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          account_id: string
          collected_at?: string
          created_at?: string
          engaged_audience?: number | null
          followers_count?: number | null
          id?: string
          likes?: number | null
          quotes?: number | null
          replies?: number | null
          reposts?: number | null
          shares?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          account_id?: string
          collected_at?: string
          created_at?: string
          engaged_audience?: number | null
          followers_count?: number | null
          id?: string
          likes?: number | null
          quotes?: number | null
          replies?: number | null
          reposts?: number | null
          shares?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_insights_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "threads_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      periodic_posts: {
        Row: {
          account_id: string
          campaign_id: string | null
          created_at: string | null
          id: string
          interval_minutes: number
          is_active: boolean | null
          last_posted_at: string | null
          post_id: string | null
          post_type: string | null
          title: string
          updated_at: string | null
          use_intelligent_delay: boolean | null
          user_id: string
        }
        Insert: {
          account_id: string
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          interval_minutes: number
          is_active?: boolean | null
          last_posted_at?: string | null
          post_id?: string | null
          post_type?: string | null
          title?: string
          updated_at?: string | null
          use_intelligent_delay?: boolean | null
          user_id: string
        }
        Update: {
          account_id?: string
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          interval_minutes?: number
          is_active?: boolean | null
          last_posted_at?: string | null
          post_id?: string | null
          post_type?: string | null
          title?: string
          updated_at?: string | null
          use_intelligent_delay?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodic_posts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "threads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_history: {
        Row: {
          account_id: string
          attempts: number | null
          content: string
          content_hash: string | null
          created_at: string
          duplicate_skipped: boolean | null
          error_message: string | null
          id: string
          image_urls: string[] | null
          post_type: string | null
          posted_at: string
          threads_post_id: string | null
          user_id: string
          warmup_run_id: string | null
        }
        Insert: {
          account_id: string
          attempts?: number | null
          content: string
          content_hash?: string | null
          created_at?: string
          duplicate_skipped?: boolean | null
          error_message?: string | null
          id?: string
          image_urls?: string[] | null
          post_type?: string | null
          posted_at?: string
          threads_post_id?: string | null
          user_id: string
          warmup_run_id?: string | null
        }
        Update: {
          account_id?: string
          attempts?: number | null
          content?: string
          content_hash?: string | null
          created_at?: string
          duplicate_skipped?: boolean | null
          error_message?: string | null
          id?: string
          image_urls?: string[] | null
          post_type?: string | null
          posted_at?: string
          threads_post_id?: string | null
          user_id?: string
          warmup_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_history_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "threads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_history_warmup_run_id_fkey"
            columns: ["warmup_run_id"]
            isOneToOne: false
            referencedRelation: "warmup_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          folder_id: string | null
          id: string
          image_urls: string[] | null
          post_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          image_urls?: string[] | null
          post_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          folder_id?: string | null
          id?: string
          image_urls?: string[] | null
          post_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      threads_accounts: {
        Row: {
          access_token: string
          account_id: string
          active_warmup_run_id: string | null
          connected_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          profile_picture_url: string | null
          token_expires_at: string | null
          token_refreshed_at: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          warmup_status: string
        }
        Insert: {
          access_token: string
          account_id: string
          active_warmup_run_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          profile_picture_url?: string | null
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          warmup_status?: string
        }
        Update: {
          access_token?: string
          account_id?: string
          active_warmup_run_id?: string | null
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          profile_picture_url?: string | null
          token_expires_at?: string | null
          token_refreshed_at?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          warmup_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_accounts_active_warmup_run_id_fkey"
            columns: ["active_warmup_run_id"]
            isOneToOne: false
            referencedRelation: "warmup_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      warmup_day_posts: {
        Row: {
          content_type: string
          created_at: string
          custom_text: string | null
          day_id: string
          id: string
          intelligent_delay: boolean
          order_index: number
          post_id: string | null
          time_of_day: string
        }
        Insert: {
          content_type: string
          created_at?: string
          custom_text?: string | null
          day_id: string
          id?: string
          intelligent_delay?: boolean
          order_index: number
          post_id?: string | null
          time_of_day: string
        }
        Update: {
          content_type?: string
          created_at?: string
          custom_text?: string | null
          day_id?: string
          id?: string
          intelligent_delay?: boolean
          order_index?: number
          post_id?: string | null
          time_of_day?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_day_posts_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "warmup_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warmup_day_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      warmup_days: {
        Row: {
          created_at: string
          day_index: number
          id: string
          is_rest: boolean
          sequence_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          id?: string
          is_rest?: boolean
          sequence_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          id?: string
          is_rest?: boolean
          sequence_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_days_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "warmup_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      warmup_paused_automations: {
        Row: {
          account_id: string
          automation_id: string
          automation_type: string
          created_at: string
          id: string
          previous_state: Json | null
          run_id: string
        }
        Insert: {
          account_id: string
          automation_id: string
          automation_type: string
          created_at?: string
          id?: string
          previous_state?: Json | null
          run_id: string
        }
        Update: {
          account_id?: string
          automation_id?: string
          automation_type?: string
          created_at?: string
          id?: string
          previous_state?: Json | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_paused_automations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "threads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warmup_paused_automations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "warmup_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      warmup_runs: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          current_day_index: number | null
          id: string
          sequence_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          current_day_index?: number | null
          id?: string
          sequence_id: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          current_day_index?: number | null
          id?: string
          sequence_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_runs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "threads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warmup_runs_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "warmup_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      warmup_scheduled_posts: {
        Row: {
          attempts: number
          created_at: string
          day_id: string
          day_post_id: string
          error_message: string | null
          executed_at: string | null
          id: string
          run_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          day_id: string
          day_post_id: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          run_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          day_id?: string
          day_post_id?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          run_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warmup_scheduled_posts_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "warmup_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warmup_scheduled_posts_day_post_id_fkey"
            columns: ["day_post_id"]
            isOneToOne: false
            referencedRelation: "warmup_day_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warmup_scheduled_posts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "warmup_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      warmup_sequences: {
        Row: {
          created_at: string
          id: string
          name: string | null
          status: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          status?: string
          total_days: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          status?: string
          total_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
