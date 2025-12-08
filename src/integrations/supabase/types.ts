export type Json =
   | string
   | number
   | boolean
   | null
   | { [key: string]: Json | undefined }
   | Json[];

export type Database = {
   // Allows to automatically instantiate createClient with right options
   // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
   __InternalSupabase: {
      PostgrestVersion: "13.0.4";
   };
   public: {
      Tables: {
         categories: {
            Row: {
               created_at: string;
               icon_url: string | null;
               id: string;
               name: string;
            };
            Insert: {
               created_at?: string;
               icon_url?: string | null;
               id?: string;
               name: string;
            };
            Update: {
               created_at?: string;
               icon_url?: string | null;
               id?: string;
               name?: string;
            };
            Relationships: [];
         };
         product_images: {
            Row: {
               created_at: string;
               id: string;
               is_primary: boolean;
               position: number;
               product_id: string;
               url: string;
            };
            Insert: {
               created_at?: string;
               id?: string;
               is_primary?: boolean;
               position?: number;
               product_id: string;
               url: string;
            };
            Update: {
               created_at?: string;
               id?: string;
               is_primary?: boolean;
               position?: number;
               product_id?: string;
               url?: string;
            };
            Relationships: [
               {
                  foreignKeyName: "product_images_product_id_fkey";
                  columns: ["product_id"];
                  isOneToOne: false;
                  referencedRelation: "products";
                  referencedColumns: ["id"];
               }
            ];
         };
         product_variations: {
            Row: {
               attributes: Json;
               created_at: string;
               id: string;
               name: string | null;
               price: number | null;
               product_id: string;
               sku: string | null;
               stock: number;
               updated_at: string;
            };
            Insert: {
               attributes?: Json;
               created_at?: string;
               id?: string;
               name?: string | null;
               price?: number | null;
               product_id: string;
               sku?: string | null;
               stock?: number;
               updated_at?: string;
            };
            Update: {
               attributes?: Json;
               created_at?: string;
               id?: string;
               name?: string | null;
               price?: number | null;
               product_id?: string;
               sku?: string | null;
               stock?: number;
               updated_at?: string;
            };
            Relationships: [
               {
                  foreignKeyName: "product_variations_product_id_fkey";
                  columns: ["product_id"];
                  isOneToOne: false;
                  referencedRelation: "products";
                  referencedColumns: ["id"];
               }
            ];
         };
         products: {
            Row: {
               barcode: string | null;
               brand: string | null;
               category: string | null;
               category_id: string | null;
               compare_at_price: number | null;
               continue_selling_when_oos: boolean;
               cost_price: number | null;
               created_at: string;
               description: string | null;
               dimensions: string | null;
               featured: boolean;
               id: string;
               main_image_url: string | null;
               meta_description: string | null;
               meta_title: string | null;
               name: string;
               price: number;
               requires_shipping: boolean;
               short_description: string | null;
               sku: string | null;
               status: Database["public"]["Enums"]["app_product_status"];
               stock: number;
               subcategory: string | null;
               subcategory_id: string | null;
               tags: string[];
               taxable: boolean;
               track_quantity: boolean;
               updated_at: string;
               weight_kg: number | null;
            };
            Insert: {
               barcode?: string | null;
               brand?: string | null;
               category?: string | null;
               category_id?: string | null;
               compare_at_price?: number | null;
               continue_selling_when_oos?: boolean;
               cost_price?: number | null;
               created_at?: string;
               description?: string | null;
               dimensions?: string | null;
               featured?: boolean;
               id?: string;
               main_image_url?: string | null;
               meta_description?: string | null;
               meta_title?: string | null;
               name: string;
               price?: number;
               requires_shipping?: boolean;
               short_description?: string | null;
               sku?: string | null;
               status?: Database["public"]["Enums"]["app_product_status"];
               stock?: number;
               subcategory?: string | null;
               subcategory_id?: string | null;
               tags?: string[];
               taxable?: boolean;
               track_quantity?: boolean;
               updated_at?: string;
               weight_kg?: number | null;
            };
            Update: {
               barcode?: string | null;
               brand?: string | null;
               category?: string | null;
               category_id?: string | null;
               compare_at_price?: number | null;
               continue_selling_when_oos?: boolean;
               cost_price?: number | null;
               created_at?: string;
               description?: string | null;
               dimensions?: string | null;
               featured?: boolean;
               id?: string;
               main_image_url?: string | null;
               meta_description?: string | null;
               meta_title?: string | null;
               name?: string;
               price?: number;
               requires_shipping?: boolean;
               short_description?: string | null;
               sku?: string | null;
               status?: Database["public"]["Enums"]["app_product_status"];
               stock?: number;
               subcategory?: string | null;
               subcategory_id?: string | null;
               tags?: string[];
               taxable?: boolean;
               track_quantity?: boolean;
               updated_at?: string;
               weight_kg?: number | null;
            };
            Relationships: [
               {
                  foreignKeyName: "products_category_id_fkey";
                  columns: ["category_id"];
                  isOneToOne: false;
                  referencedRelation: "categories";
                  referencedColumns: ["id"];
               },
               {
                  foreignKeyName: "products_subcategory_id_fkey";
                  columns: ["subcategory_id"];
                  isOneToOne: false;
                  referencedRelation: "subcategories";
                  referencedColumns: ["id"];
               }
            ];
         };
         profiles: {
            Row: {
               address: string | null;
               avatar_url: string | null;
               city: string | null;
               created_at: string;
               full_name: string | null;
               id: string;
               phone: string | null;
               updated_at: string;
            };
            Insert: {
               address?: string | null;
               avatar_url?: string | null;
               city?: string | null;
               created_at?: string;
               full_name?: string | null;
               id: string;
               phone?: string | null;
               updated_at?: string;
            };
            Update: {
               address?: string | null;
               avatar_url?: string | null;
               city?: string | null;
               created_at?: string;
               full_name?: string | null;
               id?: string;
               phone?: string | null;
               updated_at?: string;
            };
            Relationships: [];
         };
         subcategories: {
            Row: {
               category_id: string;
               created_at: string;
               id: string;
               name: string;
            };
            Insert: {
               category_id: string;
               created_at?: string;
               id?: string;
               name: string;
            };
            Update: {
               category_id?: string;
               created_at?: string;
               id?: string;
               name?: string;
            };
            Relationships: [
               {
                  foreignKeyName: "subcategories_category_id_fkey";
                  columns: ["category_id"];
                  isOneToOne: false;
                  referencedRelation: "categories";
                  referencedColumns: ["id"];
               }
            ];
         };
         user_roles: {
            Row: {
               created_at: string;
               id: string;
               role: Database["public"]["Enums"]["app_role"];
               user_id: string;
            };
            Insert: {
               created_at?: string;
               id?: string;
               role: Database["public"]["Enums"]["app_role"];
               user_id: string;
            };
            Update: {
               created_at?: string;
               id?: string;
               role?: Database["public"]["Enums"]["app_role"];
               user_id?: string;
            };
            Relationships: [];
         };
         wishlist: {
            Row: {
               created_at: string;
               id: string;
               product_id: string;
               user_id: string;
            };
            Insert: {
               created_at?: string;
               id?: string;
               product_id: string;
               user_id: string;
            };
            Update: {
               created_at?: string;
               id?: string;
               product_id?: string;
               user_id?: string;
            };
            Relationships: [
               {
                  foreignKeyName: "wishlist_product_id_fkey";
                  columns: ["product_id"];
                  isOneToOne: false;
                  referencedRelation: "products";
                  referencedColumns: ["id"];
               },
               {
                  foreignKeyName: "wishlist_user_id_fkey";
                  columns: ["user_id"];
                  isOneToOne: false;
                  referencedRelation: "users";
                  referencedColumns: ["id"];
               }
            ];
         };
      };
      Views: {
         [_ in never]: never;
      };
      Functions: {
         get_product_stats: {
            Args: Record<PropertyKey, never>;
            Returns: Json;
         };
         has_role: {
            Args: {
               _role: Database["public"]["Enums"]["app_role"];
               _user_id: string;
            };
            Returns: boolean;
         };
      };
      Enums: {
         app_product_status: "active" | "draft" | "out_of_stock";
         app_role: "admin" | "user" | "rider";
         product_status: "draft" | "active" | "archived";
      };
      CompositeTypes: {
         [_ in never]: never;
      };
   };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
   keyof Database,
   "public"
>];

export type Tables<
   DefaultSchemaTableNameOrOptions extends
      | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
      | { schema: keyof DatabaseWithoutInternals },
   TableName extends DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
   }
      ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
           DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
      : never = never
> = DefaultSchemaTableNameOrOptions extends {
   schema: keyof DatabaseWithoutInternals;
}
   ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
        Row: infer R;
     }
      ? R
      : never
   : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
   ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
     }
      ? R
      : never
   : never;

export type TablesInsert<
   DefaultSchemaTableNameOrOptions extends
      | keyof DefaultSchema["Tables"]
      | { schema: keyof DatabaseWithoutInternals },
   TableName extends DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
   }
      ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
      : never = never
> = DefaultSchemaTableNameOrOptions extends {
   schema: keyof DatabaseWithoutInternals;
}
   ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I;
     }
      ? I
      : never
   : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
   ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
     }
      ? I
      : never
   : never;

export type TablesUpdate<
   DefaultSchemaTableNameOrOptions extends
      | keyof DefaultSchema["Tables"]
      | { schema: keyof DatabaseWithoutInternals },
   TableName extends DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
   }
      ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
      : never = never
> = DefaultSchemaTableNameOrOptions extends {
   schema: keyof DatabaseWithoutInternals;
}
   ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U;
     }
      ? U
      : never
   : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
   ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
     }
      ? U
      : never
   : never;

export type Enums<
   DefaultSchemaEnumNameOrOptions extends
      | keyof DefaultSchema["Enums"]
      | { schema: keyof DatabaseWithoutInternals },
   EnumName extends DefaultSchemaEnumNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
   }
      ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
      : never = never
> = DefaultSchemaEnumNameOrOptions extends {
   schema: keyof DatabaseWithoutInternals;
}
   ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
   : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
   ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
   : never;

export type CompositeTypes<
   PublicCompositeTypeNameOrOptions extends
      | keyof DefaultSchema["CompositeTypes"]
      | { schema: keyof DatabaseWithoutInternals },
   CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
   }
      ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
      : never = never
> = PublicCompositeTypeNameOrOptions extends {
   schema: keyof DatabaseWithoutInternals;
}
   ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
   : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
   ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
   : never;

export const Constants = {
   public: {
      Enums: {
         app_product_status: ["active", "draft", "out_of_stock"],
         app_role: ["admin", "user", "rider"],
         product_status: ["draft", "active", "archived"],
      },
   },
} as const;
