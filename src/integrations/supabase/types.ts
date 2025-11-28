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
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          participant_one: string
          participant_two: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_one: string
          participant_two: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          participant_one?: string
          participant_two?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_techniques: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          external_links: string[] | null
          home_region: string | null
          id: string
          instructions: string
          lineage_info: string | null
          name: string
          origin_story: string | null
          relevant_texts: string[] | null
          submitted_by: string
          tags: string[] | null
          tradition: string
          updated_at: string | null
          worldview_context: string | null
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          external_links?: string[] | null
          home_region?: string | null
          id?: string
          instructions: string
          lineage_info?: string | null
          name: string
          origin_story?: string | null
          relevant_texts?: string[] | null
          submitted_by: string
          tags?: string[] | null
          tradition: string
          updated_at?: string | null
          worldview_context?: string | null
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          external_links?: string[] | null
          home_region?: string | null
          id?: string
          instructions?: string
          lineage_info?: string | null
          name?: string
          origin_story?: string | null
          relevant_texts?: string[] | null
          submitted_by?: string
          tags?: string[] | null
          tradition?: string
          updated_at?: string | null
          worldview_context?: string | null
        }
        Relationships: []
      }
      mastery_history: {
        Row: {
          created_at: string
          cumulative_effective_minutes: number
          id: string
          mastery_score: number
          recorded_at: string
          technique_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cumulative_effective_minutes: number
          id?: string
          mastery_score: number
          recorded_at?: string
          technique_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          cumulative_effective_minutes?: number
          id?: string
          mastery_score?: number
          recorded_at?: string
          technique_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_history_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_scores: {
        Row: {
          cumulative_effective_minutes: number | null
          id: string
          last_decay_applied_at: string | null
          last_practiced_at: string | null
          mastery_score: number | null
          streak: number | null
          technique_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cumulative_effective_minutes?: number | null
          id?: string
          last_decay_applied_at?: string | null
          last_practiced_at?: string | null
          mastery_score?: number | null
          streak?: number | null
          technique_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cumulative_effective_minutes?: number | null
          id?: string
          last_decay_applied_at?: string | null
          last_practiced_at?: string | null
          mastery_score?: number | null
          streak?: number | null
          technique_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_scores_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_health_metrics: {
        Row: {
          created_at: string | null
          energy_level: number | null
          heart_rate_avg: number | null
          heart_rate_resting: number | null
          id: string
          metric_date: string
          mindful_minutes: number | null
          mood_score: number | null
          sleep_hours: number | null
          steps: number | null
          stress_level: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          energy_level?: number | null
          heart_rate_avg?: number | null
          heart_rate_resting?: number | null
          id?: string
          metric_date: string
          mindful_minutes?: number | null
          mood_score?: number | null
          sleep_hours?: number | null
          steps?: number | null
          stress_level?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          energy_level?: number | null
          heart_rate_avg?: number | null
          heart_rate_resting?: number | null
          id?: string
          metric_date?: string
          mindful_minutes?: number | null
          mood_score?: number | null
          sleep_hours?: number | null
          steps?: number | null
          stress_level?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          consecutive_missed_days: number | null
          created_at: string | null
          id: string
          last_meditation_date: string | null
          name: string | null
          profile_preferences: Json | null
          profile_visibility: string | null
          share_health_data_for_research: boolean | null
          show_practice_history: boolean | null
          show_streak_to_friends: boolean | null
          show_techniques_to_friends: boolean | null
          updated_at: string | null
        }
        Insert: {
          consecutive_missed_days?: number | null
          created_at?: string | null
          id: string
          last_meditation_date?: string | null
          name?: string | null
          profile_preferences?: Json | null
          profile_visibility?: string | null
          share_health_data_for_research?: boolean | null
          show_practice_history?: boolean | null
          show_streak_to_friends?: boolean | null
          show_techniques_to_friends?: boolean | null
          updated_at?: string | null
        }
        Update: {
          consecutive_missed_days?: number | null
          created_at?: string | null
          id?: string
          last_meditation_date?: string | null
          name?: string | null
          profile_preferences?: Json | null
          profile_visibility?: string | null
          share_health_data_for_research?: boolean | null
          show_practice_history?: boolean | null
          show_streak_to_friends?: boolean | null
          show_techniques_to_friends?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          duration_minutes: number
          effective_minutes: number | null
          id: string
          manual_entry: boolean | null
          session_date: string | null
          technique_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes: number
          effective_minutes?: number | null
          id?: string
          manual_entry?: boolean | null
          session_date?: string | null
          technique_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number
          effective_minutes?: number | null
          id?: string
          manual_entry?: boolean | null
          session_date?: string | null
          technique_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      spotify_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      technique_presets: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          name: string
          sound: string
          technique_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          sound?: string
          technique_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          sound?: string
          technique_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technique_presets_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          created_at: string | null
          id: string
          instructions: string
          is_favorite: boolean | null
          name: string
          original_author_name: string | null
          source_global_technique_id: string | null
          tags: string[] | null
          tradition: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructions: string
          is_favorite?: boolean | null
          name: string
          original_author_name?: string | null
          source_global_technique_id?: string | null
          tags?: string[] | null
          tradition: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          instructions?: string
          is_favorite?: boolean | null
          name?: string
          original_author_name?: string | null
          source_global_technique_id?: string | null
          tags?: string[] | null
          tradition?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "techniques_source_global_technique_id_fkey"
            columns: ["source_global_technique_id"]
            isOneToOne: false
            referencedRelation: "global_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_manual_session: {
        Args: {
          p_duration_minutes: number
          p_session_date: string
          p_technique_id: string
          p_user_id: string
        }
        Returns: string
      }
      apply_daily_decay: { Args: never; Returns: undefined }
      calculate_duration_multiplier: {
        Args: { duration_minutes: number }
        Returns: number
      }
      calculate_mastery_from_minutes: {
        Args: { cumulative_minutes: number }
        Returns: number
      }
      calculate_mastery_increase: {
        Args: { duration_minutes: number }
        Returns: number
      }
      calculate_streak_bonus: { Args: { streak_days: number }; Returns: number }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_user_profile_stats: {
        Args: { profile_user_id: string }
        Returns: {
          current_streak: number
          recent_techniques: Json
          total_minutes: number
          total_sessions: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_technique_mastery: {
        Args: { p_technique_id: string; p_user_id: string }
        Returns: undefined
      }
      update_mastery_after_session: {
        Args: {
          p_duration_minutes: number
          p_technique_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin"
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
      app_role: ["user", "admin"],
    },
  },
} as const
