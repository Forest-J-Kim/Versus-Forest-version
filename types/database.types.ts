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
      chat_rooms: {
        Row: {
          applicant_out: boolean | null
          applicant_user_id: string
          created_at: string
          host_id: string
          host_out: boolean | null
          id: string
          match_id: string
        }
        Insert: {
          applicant_out?: boolean | null
          applicant_user_id: string
          created_at?: string
          host_id: string
          host_out?: boolean | null
          id?: string
          match_id: string
        }
        Update: {
          applicant_out?: boolean | null
          applicant_user_id?: string
          created_at?: string
          host_id?: string
          host_out?: boolean | null
          id?: string
          match_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_applications: {
        Row: {
          applicant_player_id: string | null
          applicant_user_id: string
          application_weight: string | null
          created_at: string
          id: string
          match_id: string
          message: string | null
          status: string | null
        }
        Insert: {
          applicant_player_id?: string | null
          applicant_user_id: string
          application_weight?: string | null
          created_at?: string
          id?: string
          match_id: string
          message?: string | null
          status?: string | null
        }
        Update: {
          applicant_player_id?: string | null
          applicant_user_id?: string
          application_weight?: string | null
          created_at?: string
          id?: string
          match_id?: string
          message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_applications_applicant_player_id_fkey"
            columns: ["applicant_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_applications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          attributes: string | null
          away_player_id: string | null
          away_team_id: string | null
          created_at: string
          description: string | null
          gear: string | null
          guest_user_id: string | null
          home_player_id: string | null
          home_team_id: string | null
          host_user_id: string | null
          id: string
          location: string | null
          match_date: string | null
          match_location: string | null
          match_mode: string | null
          match_type: string | null
          match_weight: number | null
          mode: string | null
          rounds: string | null
          sport: string | null
          sport_type: string | null
          status: string | null
          tags: string[] | null
          type: string | null
        }
        Insert: {
          attributes?: string | null
          away_player_id?: string | null
          away_team_id?: string | null
          created_at?: string
          description?: string | null
          gear?: string | null
          guest_user_id?: string | null
          home_player_id?: string | null
          home_team_id?: string | null
          host_user_id?: string | null
          id?: string
          location?: string | null
          match_date?: string | null
          match_location?: string | null
          match_mode?: string | null
          match_type?: string | null
          match_weight?: number | null
          mode?: string | null
          rounds?: string | null
          sport?: string | null
          sport_type?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
        }
        Update: {
          attributes?: string | null
          away_player_id?: string | null
          away_team_id?: string | null
          created_at?: string
          description?: string | null
          gear?: string | null
          guest_user_id?: string | null
          home_player_id?: string | null
          home_team_id?: string | null
          host_user_id?: string | null
          id?: string
          location?: string | null
          match_date?: string | null
          match_location?: string | null
          match_mode?: string | null
          match_type?: string | null
          match_weight?: number | null
          mode?: string | null
          rounds?: string | null
          sport?: string | null
          sport_type?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_player_id_fkey"
            columns: ["away_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_player_id_fkey"
            columns: ["home_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_room_id: string
          content: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          chat_room_id: string
          content: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          chat_room_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          redirect_url: string | null
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          redirect_url?: string | null
          type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          redirect_url?: string | null
          type?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          is_representative: boolean | null
          location: string | null
          main_foot: string | null
          name: string | null
          photo_url: string | null
          player_nickname: string | null
          position: string | null
          record: string | null
          skill_level: string | null
          skills: Json | null
          sport_type: string | null
          status: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string | null
          weight_class: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_representative?: boolean | null
          location?: string | null
          main_foot?: string | null
          name?: string | null
          photo_url?: string | null
          player_nickname?: string | null
          position?: string | null
          record?: string | null
          skill_level?: string | null
          skills?: Json | null
          sport_type?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight_class?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_representative?: boolean | null
          location?: string | null
          main_foot?: string | null
          name?: string | null
          photo_url?: string | null
          player_nickname?: string | null
          position?: string | null
          record?: string | null
          skill_level?: string | null
          skills?: Json | null
          sport_type?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          weight_class?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nickname: string | null
          role: string | null
          roles: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nickname?: string | null
          role?: string | null
          roles?: Json | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nickname?: string | null
          role?: string | null
          roles?: Json | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          id: string
          joined_at: string | null
          player_id: string | null
          role: string | null
          team_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          player_id?: string | null
          role?: string | null
          team_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          player_id?: string | null
          role?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_requests: {
        Row: {
          created_at: string
          id: string
          player_id: string | null
          status: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          player_id?: string | null
          status?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          player_id?: string | null
          status?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_requests_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string
          captain_nickname: string | null
          coaches_info: Json | null
          created_at: string
          description: string | null
          emblem_url: string | null
          formation: Json | null
          id: string
          introduction: string | null
          location: string | null
          match_history: Json | null
          members_count: number | null
          rating: number | null
          representative_players: Json | null
          sport_type: string
          team_name: string
        }
        Insert: {
          captain_id: string
          captain_nickname?: string | null
          coaches_info?: Json | null
          created_at?: string
          description?: string | null
          emblem_url?: string | null
          formation?: Json | null
          id?: string
          introduction?: string | null
          location?: string | null
          match_history?: Json | null
          members_count?: number | null
          rating?: number | null
          representative_players?: Json | null
          sport_type: string
          team_name: string
        }
        Update: {
          captain_id?: string
          captain_nickname?: string | null
          coaches_info?: Json | null
          created_at?: string
          description?: string | null
          emblem_url?: string | null
          formation?: Json | null
          id?: string
          introduction?: string | null
          location?: string | null
          match_history?: Json | null
          members_count?: number | null
          rating?: number | null
          representative_players?: Json | null
          sport_type?: string
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_team_request: { Args: { request_id: string }; Returns: undefined }
      delete_team_and_captain:
        | {
            Args: { target_player_id: string; target_team_id: string }
            Returns: undefined
          }
        | {
            Args: {
              target_player_id: string
              target_sport_code: string
              target_team_id: string
            }
            Returns: undefined
          }
      kick_team_member: {
        Args: { p_player_id: string; p_team_id: string }
        Returns: undefined
      }
      transfer_team_captain: {
        Args: {
          p_new_captain_player_id: string
          p_old_captain_player_id: string
          p_team_id: string
        }
        Returns: undefined
      }
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
