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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          active: boolean
          channels: string[]
          created_at: string
          id: string
          name: string
          prompt: string
          role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          channels?: string[]
          created_at?: string
          id?: string
          name: string
          prompt?: string
          role?: string
          user_id: string
        }
        Update: {
          active?: boolean
          channels?: string[]
          created_at?: string
          id?: string
          name?: string
          prompt?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      flow_runs: {
        Row: {
          created_at: string
          flow_id: string
          id: string
          node_id: string | null
          order_id: string | null
          resume_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flow_id: string
          id?: string
          node_id?: string | null
          order_id?: string | null
          resume_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flow_id?: string
          id?: string
          node_id?: string | null
          order_id?: string | null
          resume_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_runs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_runs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          active: boolean
          created_at: string
          edges: Json
          id: string
          name: string
          nodes: Json
          trigger: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          edges?: Json
          id?: string
          name: string
          nodes?: Json
          trigger?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          edges?: Json
          id?: string
          name?: string
          nodes?: Json
          trigger?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gateways: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          platform: string
          render_server_id: string | null
          token: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          platform: string
          render_server_id?: string | null
          token?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          platform?: string
          render_server_id?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateways_render_server_id_fkey"
            columns: ["render_server_id"]
            isOneToOne: false
            referencedRelation: "render_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          channel: string
          created_at: string
          error: string
          flow_id: string | null
          id: string
          ok: boolean
          order_id: string | null
          recipient: string
          user_id: string
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          error?: string
          flow_id?: string | null
          id?: string
          ok?: boolean
          order_id?: string | null
          recipient: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          error?: string
          flow_id?: string | null
          id?: string
          ok?: boolean
          order_id?: string | null
          recipient?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checkout_url: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          event: string
          external_id: string | null
          fee: number
          gateway_id: string | null
          id: string
          payment_method: string
          pix_code: string
          product: string
          raw: Json
          recovered: boolean
          status: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          checkout_url?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          event?: string
          external_id?: string | null
          fee?: number
          gateway_id?: string | null
          id?: string
          payment_method?: string
          pix_code?: string
          product?: string
          raw?: Json
          recovered?: boolean
          status?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          checkout_url?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          event?: string
          external_id?: string | null
          fee?: number
          gateway_id?: string | null
          id?: string
          payment_method?: string
          pix_code?: string
          product?: string
          raw?: Json
          recovered?: boolean
          status?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_gateway_id_fkey"
            columns: ["gateway_id"]
            isOneToOne: false
            referencedRelation: "gateways"
            referencedColumns: ["id"]
          },
        ]
      }
      render_servers: {
        Row: {
          api_key: string
          created_at: string
          id: string
          name: string
          url: string
          user_id: string
        }
        Insert: {
          api_key?: string
          created_at?: string
          id?: string
          name: string
          url: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          name?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          ai_base_url: string
          ai_key: string
          ai_model: string
          ai_provider: string
          cron_secret: string
          email_server_id: string | null
          marketing_spend: number
          product_cost_percent: number
          sms_server_id: string | null
          store_name: string
          tax_percent: number
          telegram_token: string
          updated_at: string
          user_id: string
          whatsapp_server_id: string | null
        }
        Insert: {
          ai_base_url?: string
          ai_key?: string
          ai_model?: string
          ai_provider?: string
          cron_secret?: string
          email_server_id?: string | null
          marketing_spend?: number
          product_cost_percent?: number
          sms_server_id?: string | null
          store_name?: string
          tax_percent?: number
          telegram_token?: string
          updated_at?: string
          user_id: string
          whatsapp_server_id?: string | null
        }
        Update: {
          ai_base_url?: string
          ai_key?: string
          ai_model?: string
          ai_provider?: string
          cron_secret?: string
          email_server_id?: string | null
          marketing_spend?: number
          product_cost_percent?: number
          sms_server_id?: string | null
          store_name?: string
          tax_percent?: number
          telegram_token?: string
          updated_at?: string
          user_id?: string
          whatsapp_server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_email_server_id_fkey"
            columns: ["email_server_id"]
            isOneToOne: false
            referencedRelation: "render_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_sms_server_id_fkey"
            columns: ["sms_server_id"]
            isOneToOne: false
            referencedRelation: "render_servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settings_whatsapp_server_id_fkey"
            columns: ["whatsapp_server_id"]
            isOneToOne: false
            referencedRelation: "render_servers"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
