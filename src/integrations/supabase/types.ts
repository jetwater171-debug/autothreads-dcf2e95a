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
      images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_name: string
          file_path: string
          folder_id: string | null
          id: string
          public_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          folder_id?: string | null
          id?: string
          public_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          folder_id?: string | null
          id?: string
          public_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "content_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      periodic_posts: {
        Row: {
          account_id: string
          campaign_id: string | null
          carousel_image_ids: string[] | null
          created_at: string | null
          id: string
          interval_minutes: number
          is_active: boolean | null
          last_posted_at: string | null
          post_type: string | null
          random_phrase_folder_id: string | null
          specific_image_id: string | null
          specific_phrase_id: string | null
          title: string
          updated_at: string | null
          use_intelligent_delay: boolean | null
          use_random_image: boolean | null
          use_random_phrase: boolean | null
          user_id: string
        }
        Insert: {
          account_id: string
          campaign_id?: string | null
          carousel_image_ids?: string[] | null
          created_at?: string | null
          id?: string
          interval_minutes: number
          is_active?: boolean | null
          last_posted_at?: string | null
          post_type?: string | null
          random_phrase_folder_id?: string | null
          specific_image_id?: string | null
          specific_phrase_id?: string | null
          title?: string
          updated_at?: string | null
          use_intelligent_delay?: boolean | null
          use_random_image?: boolean | null
          use_random_phrase?: boolean | null
          user_id: string
        }
        Update: {
          account_id?: string
          campaign_id?: string | null
          carousel_image_ids?: string[] | null
          created_at?: string | null
          id?: string
          interval_minutes?: number
          is_active?: boolean | null
          last_posted_at?: string | null
          post_type?: string | null
          random_phrase_folder_id?: string | null
          specific_image_id?: string | null
          specific_phrase_id?: string | null
          title?: string
          updated_at?: string | null
          use_intelligent_delay?: boolean | null
          use_random_image?: boolean | null
          use_random_phrase?: boolean | null
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
            foreignKeyName: "periodic_posts_random_phrase_folder_id_fkey"
            columns: ["random_phrase_folder_id"]
            isOneToOne: false
            referencedRelation: "content_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_posts_specific_image_id_fkey"
            columns: ["specific_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "periodic_posts_specific_phrase_id_fkey"
            columns: ["specific_phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
        ]
      }
      phrases: {
        Row: {
          content: string
          created_at: string | null
          folder_id: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          folder_id?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phrases_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "content_folders"
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
          phrase_id: string | null
          post_type: string | null
          posted_at: string
          threads_post_id: string | null
          user_id: string
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
          phrase_id?: string | null
          post_type?: string | null
          posted_at?: string
          threads_post_id?: string | null
          user_id: string
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
          phrase_id?: string | null
          post_type?: string | null
          posted_at?: string
          threads_post_id?: string | null
          user_id?: string
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
            foreignKeyName: "post_history_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
        ]
      }
      threads_accounts: {
        Row: {
          access_token: string
          account_id: string
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
        }
        Insert: {
          access_token: string
          account_id: string
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
        }
        Update: {
          access_token?: string
          account_id?: string
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
        }
        Relationships: []
      }
      warming_pipeline_accounts: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          current_day: number
          id: string
          paused_automations: Json | null
          pipeline_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          current_day?: number
          id?: string
          paused_automations?: Json | null
          pipeline_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          current_day?: number
          id?: string
          paused_automations?: Json | null
          pipeline_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warming_pipeline_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "threads_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warming_pipeline_accounts_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "warming_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      warming_pipeline_days: {
        Row: {
          created_at: string
          day_number: number
          id: string
          pipeline_id: string
          posts_count: number
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          pipeline_id: string
          posts_count?: number
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          pipeline_id?: string
          posts_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "warming_pipeline_days_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "warming_pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      warming_pipeline_posts: {
        Row: {
          carousel_image_ids: string[] | null
          created_at: string
          custom_text: string | null
          day_id: string
          id: string
          image_mode: string | null
          post_order: number
          post_type: string
          random_image_folder_id: string | null
          random_phrase_folder_id: string | null
          scheduled_time: string
          specific_image_id: string | null
          specific_phrase_id: string | null
          text_mode: string | null
          use_intelligent_delay: boolean
        }
        Insert: {
          carousel_image_ids?: string[] | null
          created_at?: string
          custom_text?: string | null
          day_id: string
          id?: string
          image_mode?: string | null
          post_order: number
          post_type: string
          random_image_folder_id?: string | null
          random_phrase_folder_id?: string | null
          scheduled_time: string
          specific_image_id?: string | null
          specific_phrase_id?: string | null
          text_mode?: string | null
          use_intelligent_delay?: boolean
        }
        Update: {
          carousel_image_ids?: string[] | null
          created_at?: string
          custom_text?: string | null
          day_id?: string
          id?: string
          image_mode?: string | null
          post_order?: number
          post_type?: string
          random_image_folder_id?: string | null
          random_phrase_folder_id?: string | null
          scheduled_time?: string
          specific_image_id?: string | null
          specific_phrase_id?: string | null
          text_mode?: string | null
          use_intelligent_delay?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "warming_pipeline_posts_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "warming_pipeline_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warming_pipeline_posts_random_image_folder_id_fkey"
            columns: ["random_image_folder_id"]
            isOneToOne: false
            referencedRelation: "content_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warming_pipeline_posts_random_phrase_folder_id_fkey"
            columns: ["random_phrase_folder_id"]
            isOneToOne: false
            referencedRelation: "content_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warming_pipeline_posts_specific_image_id_fkey"
            columns: ["specific_image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warming_pipeline_posts_specific_phrase_id_fkey"
            columns: ["specific_phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
        ]
      }
      warming_pipelines: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          total_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          total_days: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
