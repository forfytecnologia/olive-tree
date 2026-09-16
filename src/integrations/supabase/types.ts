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
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          position: number
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          position?: number
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          position?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color: string
          created_at: string
          id: string
          image_url: string
          order_id: string
          product_id: string | null
          product_name: string
          product_slug: string
          quantity: number
          size: string
          unit_price: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_slug?: string
          quantity?: number
          size?: string
          unit_price?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_slug?: string
          quantity?: number
          size?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          city: string
          complement: string
          created_at: string
          customer_document: string
          customer_email: string
          customer_name: string
          customer_phone: string
          district: string
          fulfillment_status: string
          id: string
          notes: string
          number: string
          order_number: number
          payment_method: string
          payment_reference: string
          payment_status: string
          shipping_carrier: string
          shipping_days: number
          shipping_price: number
          shipping_service: string
          state: string
          street: string
          subtotal: number
          total: number
          tracking_code: string
          updated_at: string
          zip: string
        }
        Insert: {
          city: string
          complement?: string
          created_at?: string
          customer_document?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          district?: string
          fulfillment_status?: string
          id?: string
          notes?: string
          number: string
          order_number?: number
          payment_method?: string
          payment_reference?: string
          payment_status?: string
          shipping_carrier?: string
          shipping_days?: number
          shipping_price?: number
          shipping_service?: string
          state: string
          street: string
          subtotal?: number
          total?: number
          tracking_code?: string
          updated_at?: string
          zip: string
        }
        Update: {
          city?: string
          complement?: string
          created_at?: string
          customer_document?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          district?: string
          fulfillment_status?: string
          id?: string
          notes?: string
          number?: string
          order_number?: number
          payment_method?: string
          payment_reference?: string
          payment_status?: string
          shipping_carrier?: string
          shipping_days?: number
          shipping_price?: number
          shipping_service?: string
          state?: string
          street?: string
          subtotal?: number
          total?: number
          tracking_code?: string
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          size: string
          stock: number
        }
        Insert: {
          id?: string
          product_id: string
          size: string
          stock?: number
        }
        Update: {
          id?: string
          product_id?: string
          size?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          colors: string[]
          created_at: string
          description: string | null
          featured: boolean
          id: string
          name: string
          price: number
          slug: string
          status: string
          updated_at: string
          views: number
        }
        Insert: {
          category_id?: string | null
          colors?: string[]
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          name: string
          price?: number
          slug: string
          status?: string
          updated_at?: string
          views?: number
        }
        Update: {
          category_id?: string | null
          colors?: string[]
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          name?: string
          price?: number
          slug?: string
          status?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      shipping_settings: {
        Row: {
          box_height: number
          box_length: number
          box_weight: number
          box_width: number
          enabled: boolean
          id: boolean
          insurance_enabled: boolean
          melhor_envio_token: string
          origin_zip: string
          sandbox: boolean
          updated_at: string
        }
        Insert: {
          box_height?: number
          box_length?: number
          box_weight?: number
          box_width?: number
          enabled?: boolean
          id?: boolean
          insurance_enabled?: boolean
          melhor_envio_token?: string
          origin_zip?: string
          sandbox?: boolean
          updated_at?: string
        }
        Update: {
          box_height?: number
          box_length?: number
          box_weight?: number
          box_width?: number
          enabled?: boolean
          id?: boolean
          insurance_enabled?: boolean
          melhor_envio_token?: string
          origin_zip?: string
          sandbox?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          about_text: string
          id: boolean
          instagram_url: string
          updated_at: string
          welcome_message: string
          whatsapp: string
        }
        Insert: {
          about_text?: string
          id?: boolean
          instagram_url?: string
          updated_at?: string
          welcome_message?: string
          whatsapp?: string
        }
        Update: {
          about_text?: string
          id?: boolean
          instagram_url?: string
          updated_at?: string
          welcome_message?: string
          whatsapp?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_product_views: { Args: { _slug: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
