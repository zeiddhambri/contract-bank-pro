export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_contract_generations: {
        Row: {
          ai_suggestions: Json | null
          contract_id: string | null
          created_at: string | null
          generated_content: string | null
          generation_type: string
          id: string
          input_parameters: Json | null
          quality_score: number | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          ai_suggestions?: Json | null
          contract_id?: string | null
          created_at?: string | null
          generated_content?: string | null
          generation_type: string
          id?: string
          input_parameters?: Json | null
          quality_score?: number | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          ai_suggestions?: Json | null
          contract_id?: string | null
          created_at?: string | null
          generated_content?: string | null
          generation_type?: string
          id?: string
          input_parameters?: Json | null
          quality_score?: number | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_contract_generations_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_contract_generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "ai_contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_contract_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_contract_templates: {
        Row: {
          bank_id: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          prompt_template: string
          template_content: Json
          updated_at: string | null
        }
        Insert: {
          bank_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          prompt_template: string
          template_content: Json
          updated_at?: string | null
        }
        Update: {
          bank_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          prompt_template?: string
          template_content?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_contract_templates_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          bank_id: string | null
          created_at: string
          details: Json | null
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          bank_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          bank_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          ai_features_enabled: boolean | null
          created_at: string
          domain_config: Json | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          subscription_plan: string | null
          theme_config: Json | null
          updated_at: string
        }
        Insert: {
          ai_features_enabled?: boolean | null
          created_at?: string
          domain_config?: Json | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          subscription_plan?: string | null
          theme_config?: Json | null
          updated_at?: string
        }
        Update: {
          ai_features_enabled?: boolean | null
          created_at?: string
          domain_config?: Json | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          subscription_plan?: string | null
          theme_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_templates: {
        Row: {
          bank_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          bank_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          bank_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          agence: string
          bank_id: string
          client: string
          created_at: string
          date_decision: string
          date_signature: string | null
          description: string | null
          file_path: string | null
          garantie: string
          garanties: Json
          id: string
          montant: number
          reference_decision: string
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          agence: string
          bank_id: string
          client: string
          created_at?: string
          date_decision?: string
          date_signature?: string | null
          description?: string | null
          file_path?: string | null
          garantie: string
          garanties?: Json
          id?: string
          montant: number
          reference_decision: string
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          agence?: string
          bank_id?: string
          client?: string
          created_at?: string
          date_decision?: string
          date_signature?: string | null
          description?: string | null
          file_path?: string | null
          garantie?: string
          garanties?: Json
          id?: string
          montant?: number
          reference_decision?: string
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          accent_color: string | null
          bank_id: string | null
          created_at: string | null
          custom_css: string | null
          document_template_config: Json | null
          email_template_config: Json | null
          id: string
          logo_primary_url: string | null
          logo_secondary_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          bank_id?: string | null
          created_at?: string | null
          custom_css?: string | null
          document_template_config?: Json | null
          email_template_config?: Json | null
          id?: string
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          bank_id?: string | null
          created_at?: string | null
          custom_css?: string | null
          document_template_config?: Json | null
          email_template_config?: Json | null
          id?: string
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: true
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bank_id: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          bank_id?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          bank_id?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      template_fields: {
        Row: {
          created_at: string
          display_order: number
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean
          template_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_required?: boolean
          template_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_workflow_steps: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          required_role: string | null
          step_description: string | null
          step_name: string
          step_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          required_role?: string | null
          step_description?: string | null
          step_name: string
          step_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          required_role?: string | null
          step_description?: string | null
          step_name?: string
          step_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_workflow_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_reference_decision: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_bank_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "bank_admin"
        | "user"
        | "manager"
        | "validator"
        | "auditor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "bank_admin",
        "user",
        "manager",
        "validator",
        "auditor",
      ],
    },
  },
} as const
