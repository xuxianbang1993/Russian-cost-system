export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      calculations: {
        Row: {
          created_at: string | null;
          expenses: Json;
          id: string;
          product_id: string | null;
          rates: Json;
          results: Json;
          revenue: number;
          tier: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          expenses: Json;
          id?: string;
          product_id?: string | null;
          rates: Json;
          results: Json;
          revenue: number;
          tier: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          expenses?: Json;
          id?: string;
          product_id?: string | null;
          rates?: Json;
          results?: Json;
          revenue?: number;
          tier?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'calculations_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calculations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          created_at: string | null;
          declared_cost: number;
          duty_rate: number | null;
          emoji: string | null;
          id: string;
          name: string;
          platform_fee_rate: number | null;
          platform_price: number;
          purchase_cost: number;
          shipping_method: string | null;
          updated_at: string | null;
          user_id: string;
          volume: number | null;
          weight: number | null;
        };
        Insert: {
          created_at?: string | null;
          declared_cost: number;
          duty_rate?: number | null;
          emoji?: string | null;
          id?: string;
          name: string;
          platform_fee_rate?: number | null;
          platform_price: number;
          purchase_cost: number;
          shipping_method?: string | null;
          updated_at?: string | null;
          user_id: string;
          volume?: number | null;
          weight?: number | null;
        };
        Update: {
          created_at?: string | null;
          declared_cost?: number;
          duty_rate?: number | null;
          emoji?: string | null;
          id?: string;
          name?: string;
          platform_fee_rate?: number | null;
          platform_price?: number;
          purchase_cost?: number;
          shipping_method?: string | null;
          updated_at?: string | null;
          user_id?: string;
          volume?: number | null;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          company_name: string | null;
          created_at: string | null;
          display_name: string | null;
          email: string;
          id: string;
          role: 'admin' | 'user' | null;
          updated_at: string | null;
        };
        Insert: {
          company_name?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email: string;
          id: string;
          role?: 'admin' | 'user' | null;
          updated_at?: string | null;
        };
        Update: {
          company_name?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          email?: string;
          id?: string;
          role?: 'admin' | 'user' | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      tax_config: {
        Row: {
          created_at: string | null;
          created_by: string | null;
          effective_date: string;
          id: string;
          params: Json;
          regime: string;
          tier: string;
        };
        Insert: {
          created_at?: string | null;
          created_by?: string | null;
          effective_date: string;
          id?: string;
          params: Json;
          regime: string;
          tier: string;
        };
        Update: {
          created_at?: string | null;
          created_by?: string | null;
          effective_date?: string;
          id?: string;
          params?: Json;
          regime?: string;
          tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tax_config_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
