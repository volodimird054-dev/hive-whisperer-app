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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      apiaries: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apiary_members: {
        Row: {
          apiary_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["apiary_role"]
          user_id: string
        }
        Insert: {
          apiary_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["apiary_role"]
          user_id: string
        }
        Update: {
          apiary_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["apiary_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apiary_members_apiary_id_fkey"
            columns: ["apiary_id"]
            isOneToOne: false
            referencedRelation: "apiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      apiary_points: {
        Row: {
          address: string | null
          apiary_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["point_kind"]
          lat: number | null
          lng: number | null
          location: string | null
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          apiary_id: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["point_kind"]
          lat?: number | null
          lng?: number | null
          location?: string | null
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          apiary_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["point_kind"]
          lat?: number | null
          lng?: number | null
          location?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apiary_points_apiary_id_fkey"
            columns: ["apiary_id"]
            isOneToOne: false
            referencedRelation: "apiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          done: boolean
          event_date: string
          id: string
          remind_at: string | null
          seasonal_task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          event_date: string
          id?: string
          remind_at?: string | null
          seasonal_task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          event_date?: string
          id?: string
          remind_at?: string | null
          seasonal_task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feedings: {
        Row: {
          amount: string | null
          created_at: string
          fed_at: string
          feed_type: string | null
          hive_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          amount?: string | null
          created_at?: string
          fed_at?: string
          feed_type?: string | null
          hive_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          amount?: string | null
          created_at?: string
          fed_at?: string
          feed_type?: string | null
          hive_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedings_hive_id_fkey"
            columns: ["hive_id"]
            isOneToOne: false
            referencedRelation: "hives"
            referencedColumns: ["id"]
          },
        ]
      }
      harvests: {
        Row: {
          created_at: string
          harvested_at: string
          hive_id: string | null
          honey_kg: number | null
          honey_type: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          harvested_at?: string
          hive_id?: string | null
          honey_kg?: number | null
          honey_type?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          harvested_at?: string
          hive_id?: string | null
          honey_kg?: number | null
          honey_type?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvests_hive_id_fkey"
            columns: ["hive_id"]
            isOneToOne: false
            referencedRelation: "hives"
            referencedColumns: ["id"]
          },
        ]
      }
      hives: {
        Row: {
          apiary_id: string | null
          archived_at: string | null
          breed: string | null
          created_at: string
          frames_brood: number | null
          frames_total: number | null
          id: string
          installed_at: string | null
          notes: string | null
          number: string
          photo_url: string | null
          point_id: string | null
          qr_uuid: string
          queen_mark: string | null
          queen_year: number | null
          status: string | null
          strength: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apiary_id?: string | null
          archived_at?: string | null
          breed?: string | null
          created_at?: string
          frames_brood?: number | null
          frames_total?: number | null
          id?: string
          installed_at?: string | null
          notes?: string | null
          number: string
          photo_url?: string | null
          point_id?: string | null
          qr_uuid?: string
          queen_mark?: string | null
          queen_year?: number | null
          status?: string | null
          strength?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apiary_id?: string | null
          archived_at?: string | null
          breed?: string | null
          created_at?: string
          frames_brood?: number | null
          frames_total?: number | null
          id?: string
          installed_at?: string | null
          notes?: string | null
          number?: string
          photo_url?: string | null
          point_id?: string | null
          qr_uuid?: string
          queen_mark?: string | null
          queen_year?: number | null
          status?: string | null
          strength?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hives_apiary_id_fkey"
            columns: ["apiary_id"]
            isOneToOne: false
            referencedRelation: "apiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hives_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "apiary_points"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          aggression: string | null
          brood_level: string | null
          created_at: string
          frames_bees: number | null
          frames_brood: number | null
          hive_id: string
          honey_level: string | null
          id: string
          inspected_at: string
          mood: string | null
          notes: string | null
          queen_seen: boolean | null
          queen_status: string | null
          swarming: string | null
          user_id: string
          works: string[] | null
        }
        Insert: {
          aggression?: string | null
          brood_level?: string | null
          created_at?: string
          frames_bees?: number | null
          frames_brood?: number | null
          hive_id: string
          honey_level?: string | null
          id?: string
          inspected_at?: string
          mood?: string | null
          notes?: string | null
          queen_seen?: boolean | null
          queen_status?: string | null
          swarming?: string | null
          user_id: string
          works?: string[] | null
        }
        Update: {
          aggression?: string | null
          brood_level?: string | null
          created_at?: string
          frames_bees?: number | null
          frames_brood?: number | null
          hive_id?: string
          honey_level?: string | null
          id?: string
          inspected_at?: string
          mood?: string | null
          notes?: string | null
          queen_seen?: boolean | null
          queen_status?: string | null
          swarming?: string | null
          user_id?: string
          works?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_hive_id_fkey"
            columns: ["hive_id"]
            isOneToOne: false
            referencedRelation: "hives"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string | null
          contact: string | null
          created_at: string
          currency: string | null
          description: string | null
          id: string
          kind: string
          location: string | null
          photo_url: string | null
          price: number | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          contact?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          kind?: string
          location?: string | null
          photo_url?: string | null
          price?: number | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          contact?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          id?: string
          kind?: string
          location?: string | null
          photo_url?: string | null
          price?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      queen_batches: {
        Row: {
          count: number | null
          created_at: string
          grafted_on: string
          id: string
          mother_hive: string | null
          name: string
          notes: string | null
          user_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          grafted_on: string
          id?: string
          mother_hive?: string | null
          name: string
          notes?: string | null
          user_id: string
        }
        Update: {
          count?: number | null
          created_at?: string
          grafted_on?: string
          id?: string
          mother_hive?: string | null
          name?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      seasonal_tasks: {
        Row: {
          apiary_id: string | null
          category: string | null
          created_at: string
          description: string | null
          done: boolean
          hive_id: string | null
          id: string
          month: string | null
          notes: string | null
          point_id: string | null
          priority: string
          season: string
          sort_order: number
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apiary_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          hive_id?: string | null
          id?: string
          month?: string | null
          notes?: string | null
          point_id?: string | null
          priority?: string
          season?: string
          sort_order?: number
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apiary_id?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          done?: boolean
          hive_id?: string | null
          id?: string
          month?: string | null
          notes?: string | null
          point_id?: string | null
          priority?: string
          season?: string
          sort_order?: number
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasonal_tasks_apiary_id_fkey"
            columns: ["apiary_id"]
            isOneToOne: false
            referencedRelation: "apiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_tasks_hive_id_fkey"
            columns: ["hive_id"]
            isOneToOne: false
            referencedRelation: "hives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasonal_tasks_point_id_fkey"
            columns: ["point_id"]
            isOneToOne: false
            referencedRelation: "apiary_points"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          created_at: string
          dose: string | null
          hive_id: string
          id: string
          notes: string | null
          product: string | null
          reason: string | null
          treated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          hive_id: string
          id?: string
          notes?: string | null
          product?: string | null
          reason?: string | null
          treated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          hive_id?: string
          id?: string
          notes?: string | null
          product?: string | null
          reason?: string | null
          treated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_hive_id_fkey"
            columns: ["hive_id"]
            isOneToOne: false
            referencedRelation: "hives"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_by_email: {
        Args: { _email: string }
        Returns: {
          display_name: string
          email: string
          id: string
        }[]
      }
      is_apiary_member: {
        Args: { _apiary_id: string; _user_id: string }
        Returns: boolean
      }
      is_apiary_owner: {
        Args: { _apiary_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      apiary_role: "owner" | "member"
      point_kind: "hives" | "nuclei"
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
      apiary_role: ["owner", "member"],
      point_kind: ["hives", "nuclei"],
    },
  },
} as const
