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
      articles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          body: string
          created_at: string
          created_by: string
          id: string
          image_caption: string
          key_facts: Json
          section: string
          source_id: string | null
          source_note: string
          status: Database["public"]["Enums"]["article_status"]
          subtitle: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          created_by: string
          id?: string
          image_caption?: string
          key_facts?: Json
          section?: string
          source_id?: string | null
          source_note?: string
          status?: Database["public"]["Enums"]["article_status"]
          subtitle?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          image_caption?: string
          key_facts?: Json
          section?: string
          source_id?: string | null
          source_note?: string
          status?: Database["public"]["Enums"]["article_status"]
          subtitle?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "source_items"
            referencedColumns: ["id"]
          },
        ]
      }
      edition_pages: {
        Row: {
          created_at: string
          edition_id: string
          id: string
          page_number: number
          section: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edition_id: string
          id?: string
          page_number: number
          section: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edition_id?: string
          id?: string
          page_number?: number
          section?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "edition_pages_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      editions: {
        Row: {
          created_at: string
          created_by: string | null
          date_bn: string
          edition_number: string
          hijri_date: string
          id: string
          publication_date: string
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["edition_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_bn: string
          edition_number: string
          hijri_date?: string
          id?: string
          publication_date: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["edition_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_bn?: string
          edition_number?: string
          hijri_date?: string
          id?: string
          publication_date?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["edition_status"]
          updated_at?: string
        }
        Relationships: []
      }
      page_blocks: {
        Row: {
          article_id: string | null
          block_type: string
          body: string
          column_span: number
          column_start: number
          created_at: string
          credit: string
          id: string
          image_url: string | null
          label: string
          page_id: string
          section: string
          sort_order: number
          style: Json
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          block_type: string
          body?: string
          column_span?: number
          column_start?: number
          created_at?: string
          credit?: string
          id?: string
          image_url?: string | null
          label?: string
          page_id: string
          section?: string
          sort_order?: number
          style?: Json
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          block_type?: string
          body?: string
          column_span?: number
          column_start?: number
          created_at?: string
          credit?: string
          id?: string
          image_url?: string | null
          label?: string
          page_id?: string
          section?: string
          sort_order?: number
          style?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "edition_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      share_cards: {
        Row: {
          article_id: string | null
          created_at: string
          created_by: string | null
          edition_id: string | null
          headline: string
          id: string
          image_url: string | null
          preset: string
          section: string
          source_note: string
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          created_by?: string | null
          edition_id?: string | null
          headline: string
          id?: string
          image_url?: string | null
          preset: string
          section?: string
          source_note?: string
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          created_by?: string | null
          edition_id?: string | null
          headline?: string
          id?: string
          image_url?: string | null
          preset?: string
          section?: string
          source_note?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_cards_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_cards_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "editions"
            referencedColumns: ["id"]
          },
        ]
      }
      source_items: {
        Row: {
          created_at: string
          created_by: string
          fetch_error: string | null
          fetch_status: string
          fetched_at: string | null
          id: string
          key_facts: string
          lead_image_url: string | null
          raw_text: string
          source_domain: string | null
          source_title: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          fetch_error?: string | null
          fetch_status?: string
          fetched_at?: string | null
          id?: string
          key_facts?: string
          lead_image_url?: string | null
          raw_text?: string
          source_domain?: string | null
          source_title?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          fetch_error?: string | null
          fetch_status?: string
          fetched_at?: string | null
          id?: string
          key_facts?: string
          lead_image_url?: string | null
          raw_text?: string
          source_domain?: string | null
          source_title?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      publish_due_editions: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "editor" | "designer"
      article_status:
        | "source"
        | "ai_draft"
        | "approved"
        | "placed"
        | "published"
      edition_status:
        | "draft"
        | "review"
        | "approved"
        | "scheduled"
        | "published"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "editor", "designer"],
      article_status: ["source", "ai_draft", "approved", "placed", "published"],
      edition_status: ["draft", "review", "approved", "scheduled", "published"],
    },
  },
} as const
