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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agent_activity_log: {
        Row: {
          agent_id: string
          created_at: string | null
          event_type: string
          id: string
          message: string
          metadata: Json | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_bids: {
        Row: {
          agent_id: string
          amount: number
          bid_id: string | null
          created_at: string | null
          goal_id: string | null
          id: string
          livestock_id: string
          status: string | null
          strategy: string
        }
        Insert: {
          agent_id: string
          amount: number
          bid_id?: string | null
          created_at?: string | null
          goal_id?: string | null
          id?: string
          livestock_id: string
          status?: string | null
          strategy: string
        }
        Update: {
          agent_id?: string
          amount?: number
          bid_id?: string | null
          created_at?: string | null
          goal_id?: string | null
          id?: string
          livestock_id?: string
          status?: string | null
          strategy?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_bids_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_bids_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_bids_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "agent_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_bids_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_decisions: {
        Row: {
          agent_id: string
          confidence: number | null
          created_at: string | null
          decision: string
          goal_id: string | null
          id: string
          livestock_id: string | null
          metadata: Json | null
          reasoning: string
        }
        Insert: {
          agent_id: string
          confidence?: number | null
          created_at?: string | null
          decision: string
          goal_id?: string | null
          id?: string
          livestock_id?: string | null
          metadata?: Json | null
          reasoning: string
        }
        Update: {
          agent_id?: string
          confidence?: number | null
          created_at?: string | null
          decision?: string
          goal_id?: string | null
          id?: string
          livestock_id?: string | null
          metadata?: Json | null
          reasoning?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "agent_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_goals: {
        Row: {
          agent_id: string
          category: string
          created_at: string | null
          id: string
          max_price: number
          min_health: string | null
          preferred_breed: string | null
          preferred_location: string | null
          quantity: number
          quantity_fulfilled: number | null
          status: string | null
        }
        Insert: {
          agent_id: string
          category: string
          created_at?: string | null
          id?: string
          max_price: number
          min_health?: string | null
          preferred_breed?: string | null
          preferred_location?: string | null
          quantity?: number
          quantity_fulfilled?: number | null
          status?: string | null
        }
        Update: {
          agent_id?: string
          category?: string
          created_at?: string | null
          id?: string
          max_price?: number
          min_health?: string | null
          preferred_breed?: string | null
          preferred_location?: string | null
          quantity?: number
          quantity_fulfilled?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_goals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_payment_orders: {
        Row: {
          agent_bid_id: string | null
          agent_id: string
          amount: number
          attempt_count: number | null
          created_at: string | null
          id: string
          last_error: string | null
          livestock_id: string
          max_attempts: number | null
          method: string
          paid_at: string | null
          paynow_reference: string | null
          status: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_bid_id?: string | null
          agent_id: string
          amount: number
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          livestock_id: string
          max_attempts?: number | null
          method?: string
          paid_at?: string | null
          paynow_reference?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_bid_id?: string | null
          agent_id?: string
          amount?: number
          attempt_count?: number | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          livestock_id?: string
          max_attempts?: number | null
          method?: string
          paid_at?: string | null
          paynow_reference?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_payment_orders_agent_bid_id_fkey"
            columns: ["agent_bid_id"]
            isOneToOne: false
            referencedRelation: "agent_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_orders_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_orders_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_payment_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_type: string
          config: Json
          created_at: string | null
          id: string
          last_run_at: string | null
          name: string
          stats: Json
          status: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_type: string
          config?: Json
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          stats?: Json
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_type?: string
          config?: Json
          created_at?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          stats?: Json
          status?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          idempotency_key: string | null
          is_winner: boolean | null
          livestock_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_winner?: boolean | null
          livestock_id: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_winner?: boolean | null
          livestock_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_payments: {
        Row: {
          account_holder: string | null
          account_number: string
          amount: number
          auth_data: Json | null
          biller_code: string
          biller_name: string
          biller_payment_reference: string | null
          billpay_reference: string | null
          created_at: string | null
          currency: string | null
          display_data: Json | null
          flagged_at: string | null
          id: string
          last_status_check_at: string | null
          linked_payment_id: string | null
          narration: string | null
          payer_details: Json | null
          products: Json | null
          receipt_html: Json | null
          receipt_smses: Json | null
          reference: string
          requires_forex: boolean | null
          status: string | null
          status_check_count: number | null
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
          user_id: string
          vendor_commission: number | null
          vendor_service_fee: number | null
          vendor_service_fee_currency: string | null
          vouchers: Json | null
          wallet_debit_reference: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number: string
          amount: number
          auth_data?: Json | null
          biller_code: string
          biller_name: string
          biller_payment_reference?: string | null
          billpay_reference?: string | null
          created_at?: string | null
          currency?: string | null
          display_data?: Json | null
          flagged_at?: string | null
          id?: string
          last_status_check_at?: string | null
          linked_payment_id?: string | null
          narration?: string | null
          payer_details?: Json | null
          products?: Json | null
          receipt_html?: Json | null
          receipt_smses?: Json | null
          reference: string
          requires_forex?: boolean | null
          status?: string | null
          status_check_count?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id: string
          vendor_commission?: number | null
          vendor_service_fee?: number | null
          vendor_service_fee_currency?: string | null
          vouchers?: Json | null
          wallet_debit_reference?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string
          amount?: number
          auth_data?: Json | null
          biller_code?: string
          biller_name?: string
          biller_payment_reference?: string | null
          billpay_reference?: string | null
          created_at?: string | null
          currency?: string | null
          display_data?: Json | null
          flagged_at?: string | null
          id?: string
          last_status_check_at?: string | null
          linked_payment_id?: string | null
          narration?: string | null
          payer_details?: Json | null
          products?: Json | null
          receipt_html?: Json | null
          receipt_smses?: Json | null
          reference?: string
          requires_forex?: boolean | null
          status?: string | null
          status_check_count?: number | null
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          user_id?: string
          vendor_commission?: number | null
          vendor_service_fee?: number | null
          vendor_service_fee_currency?: string | null
          vouchers?: Json | null
          wallet_debit_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_linked_payment_id_fkey"
            columns: ["linked_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billers_cache: {
        Row: {
          allow_multiple_products: boolean | null
          biller_code: string
          biller_name: string
          description: string | null
          enabled: boolean | null
          icon_url: string | null
          logo_url: string | null
          member_number_field_desc: string | null
          member_number_field_label: string | null
          member_number_field_regex: string | null
          products: Json | null
          raw_config: Json | null
          updated_at: string | null
          vendor_must_invoice: boolean | null
        }
        Insert: {
          allow_multiple_products?: boolean | null
          biller_code: string
          biller_name: string
          description?: string | null
          enabled?: boolean | null
          icon_url?: string | null
          logo_url?: string | null
          member_number_field_desc?: string | null
          member_number_field_label?: string | null
          member_number_field_regex?: string | null
          products?: Json | null
          raw_config?: Json | null
          updated_at?: string | null
          vendor_must_invoice?: boolean | null
        }
        Update: {
          allow_multiple_products?: boolean | null
          biller_code?: string
          biller_name?: string
          description?: string | null
          enabled?: boolean | null
          icon_url?: string | null
          logo_url?: string | null
          member_number_field_desc?: string | null
          member_number_field_label?: string | null
          member_number_field_regex?: string | null
          products?: Json | null
          raw_config?: Json | null
          updated_at?: string | null
          vendor_must_invoice?: boolean | null
        }
        Relationships: []
      }
      billpay_inbound_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          member: string | null
          paynow_reference: string | null
          remote_ip: string | null
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          member?: string | null
          paynow_reference?: string | null
          remote_ip?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          member?: string | null
          paynow_reference?: string | null
          remote_ip?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
        }
        Relationships: []
      }
      clearance_events: {
        Row: {
          bid_id: string | null
          created_at: string | null
          district: string | null
          id: string
          idempotency_key: string | null
          livestock_id: string
          metadata: Json | null
          notes: string | null
          officer_badge: string | null
          officer_name: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          bid_id?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          idempotency_key?: string | null
          livestock_id: string
          metadata?: Json | null
          notes?: string | null
          officer_badge?: string | null
          officer_name?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          bid_id?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          idempotency_key?: string | null
          livestock_id?: string
          metadata?: Json | null
          notes?: string | null
          officer_badge?: string | null
          officer_name?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clearance_events_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_events_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          livestock_id: string | null
          participant_1: string
          participant_2: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          livestock_id?: string | null
          participant_1: string
          participant_2: string
          tenant_id?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          livestock_id?: string | null
          participant_1?: string
          participant_2?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          livestock_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          livestock_id: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          livestock_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fb_message_log: {
        Row: {
          body: string | null
          created_at: string | null
          direction: string
          error: string | null
          id: string
          message_type: string
          payload: string | null
          psid: string
          state_after: string | null
          state_before: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          direction: string
          error?: string | null
          id?: string
          message_type: string
          payload?: string | null
          psid: string
          state_after?: string | null
          state_before?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          direction?: string
          error?: string | null
          id?: string
          message_type?: string
          payload?: string | null
          psid?: string
          state_after?: string | null
          state_before?: string | null
        }
        Relationships: []
      }
      fb_sessions: {
        Row: {
          created_at: string | null
          draft: Json
          last_message_at: string | null
          psid: string
          state: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          draft?: Json
          last_message_at?: string | null
          psid: string
          state?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          draft?: Json
          last_message_at?: string | null
          psid?: string
          state?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fb_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          approved_at: string | null
          auction_house_name: string
          biggest_friction: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          current_payment_rail: string
          id: string
          lots_per_week: string
          notes: string | null
          onboard_token: string | null
          status: string
          submitted_via: string | null
          tenant_id: string | null
          town: string | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          approved_at?: string | null
          auction_house_name: string
          biggest_friction: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          current_payment_rail: string
          id?: string
          lots_per_week: string
          notes?: string | null
          onboard_token?: string | null
          status?: string
          submitted_via?: string | null
          tenant_id?: string | null
          town?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          approved_at?: string | null
          auction_house_name?: string
          biggest_friction?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          current_payment_rail?: string
          id?: string
          lots_per_week?: string
          notes?: string | null
          onboard_token?: string | null
          status?: string
          submitted_via?: string | null
          tenant_id?: string | null
          town?: string | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_items: {
        Row: {
          age: string
          auction_format: string
          bid_count: number | null
          breed: string
          category: string
          created_at: string | null
          current_bid: number | null
          description: string
          duration_days: number
          end_time: string
          health: string
          id: string
          image_urls: string[] | null
          is_demo: boolean
          location: string
          pickup_lat: number | null
          pickup_lng: number | null
          reference: string | null
          seller_id: string
          starting_price: number
          status: string | null
          tenant_id: string
          title: string
          transport_available: boolean
          verified_bidders_only: boolean
          view_count: number | null
          weight: string
        }
        Insert: {
          age: string
          auction_format?: string
          bid_count?: number | null
          breed: string
          category: string
          created_at?: string | null
          current_bid?: number | null
          description: string
          duration_days: number
          end_time: string
          health: string
          id?: string
          image_urls?: string[] | null
          is_demo?: boolean
          location: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          reference?: string | null
          seller_id: string
          starting_price: number
          status?: string | null
          tenant_id?: string
          title: string
          transport_available?: boolean
          verified_bidders_only?: boolean
          view_count?: number | null
          weight: string
        }
        Update: {
          age?: string
          auction_format?: string
          bid_count?: number | null
          breed?: string
          category?: string
          created_at?: string | null
          current_bid?: number | null
          description?: string
          duration_days?: number
          end_time?: string
          health?: string
          id?: string
          image_urls?: string[] | null
          is_demo?: boolean
          location?: string
          pickup_lat?: number | null
          pickup_lng?: number | null
          reference?: string | null
          seller_id?: string
          starting_price?: number
          status?: string | null
          tenant_id?: string
          title?: string
          transport_available?: boolean
          verified_bidders_only?: boolean
          view_count?: number | null
          weight?: string
        }
        Relationships: [
          {
            foreignKeyName: "livestock_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "livestock_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_intel: {
        Row: {
          avg_bid_count: number | null
          avg_price: number
          breed: string | null
          category: string
          created_at: string | null
          id: string
          listing_count: number
          location: string | null
          max_price: number
          min_price: number
          period_end: string
          period_start: string
          sell_through_rate: number | null
        }
        Insert: {
          avg_bid_count?: number | null
          avg_price: number
          breed?: string | null
          category: string
          created_at?: string | null
          id?: string
          listing_count: number
          location?: string | null
          max_price: number
          min_price: number
          period_end: string
          period_start: string
          sell_through_rate?: number | null
        }
        Update: {
          avg_bid_count?: number | null
          avg_price?: number
          breed?: string | null
          category?: string
          created_at?: string | null
          id?: string
          listing_count?: number
          location?: string | null
          max_price?: number
          min_price?: number
          period_end?: string
          period_start?: string
          sell_through_rate?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
          tenant_id?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          priority: string | null
          read: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          priority?: string | null
          read?: boolean | null
          tenant_id?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          priority?: string | null
          read?: boolean | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ownership_transitions: {
        Row: {
          bid_id: string | null
          clearance_id: string | null
          created_at: string | null
          event: string
          from_owner_id: string | null
          id: string
          livestock_id: string
          metadata: Json | null
          payment_id: string | null
          state: string
          to_owner_id: string | null
        }
        Insert: {
          bid_id?: string | null
          clearance_id?: string | null
          created_at?: string | null
          event: string
          from_owner_id?: string | null
          id?: string
          livestock_id: string
          metadata?: Json | null
          payment_id?: string | null
          state: string
          to_owner_id?: string | null
        }
        Update: {
          bid_id?: string | null
          clearance_id?: string | null
          created_at?: string | null
          event?: string
          from_owner_id?: string | null
          id?: string
          livestock_id?: string
          metadata?: Json | null
          payment_id?: string | null
          state?: string
          to_owner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ownership_transitions_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transitions_clearance_id_fkey"
            columns: ["clearance_id"]
            isOneToOne: false
            referencedRelation: "clearance_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transitions_from_owner_id_fkey"
            columns: ["from_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transitions_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transitions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownership_transitions_to_owner_id_fkey"
            columns: ["to_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          idempotency_key: string | null
          livestock_id: string
          method: string
          paynow_reference: string | null
          phone: string | null
          reference: string
          status: string | null
          tenant_id: string
          transport_fee: number | null
          transport_request_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          livestock_id: string
          method: string
          paynow_reference?: string | null
          phone?: string | null
          reference: string
          status?: string | null
          tenant_id?: string
          transport_fee?: number | null
          transport_request_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          livestock_id?: string
          method?: string
          paynow_reference?: string | null
          phone?: string | null
          reference?: string
          status?: string | null
          tenant_id?: string
          transport_fee?: number | null
          transport_request_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_livestock_id_fkey"
            columns: ["livestock_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transport_request_id_fkey"
            columns: ["transport_request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          paynow_merchant_id: string | null
          phone: string
          rating: number | null
          sales_count: number | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          paynow_merchant_id?: string | null
          phone: string
          rating?: number | null
          sales_count?: number | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          paynow_merchant_id?: string | null
          phone?: string
          rating?: number | null
          sales_count?: number | null
          verified?: boolean | null
        }
        Relationships: []
      }
      settlement_ledger: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          details: Json | null
          event: string
          id: string
          method: string | null
          payment_order_id: string
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          details?: Json | null
          event: string
          id?: string
          method?: string | null
          payment_order_id: string
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          details?: Json | null
          event?: string
          id?: string
          method?: string | null
          payment_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_ledger_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "agent_payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_log: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          event_type: string
          id: string
          message: string
          phone: string
          provider_reference: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          message: string
          phone: string
          provider_reference?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string
          phone?: string
          provider_reference?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          joined_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          config: Json
          created_at: string
          id: string
          name: string
          slug: string
          status: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
        }
        Relationships: []
      }
      transport_requests: {
        Row: {
          buyer_id: string
          created_at: string | null
          distance_km: number
          dropoff_label: string
          dropoff_lat: number
          dropoff_lng: number
          id: string
          item_id: string
          pickup_lat: number
          pickup_lng: number
          quote_usd: number
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          distance_km: number
          dropoff_label: string
          dropoff_lat: number
          dropoff_lng: number
          id?: string
          item_id: string
          pickup_lat: number
          pickup_lng: number
          quote_usd: number
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          distance_km?: number
          dropoff_label?: string
          dropoff_lat?: number
          dropoff_lng?: number
          id?: string
          item_id?: string
          pickup_lat?: number
          pickup_lng?: number
          quote_usd?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "livestock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      ussd_sessions: {
        Row: {
          created_at: string
          id: string
          last_text: string
          phone: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_text?: string
          phone: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_text?: string
          phone?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      wa_cloud_message_log: {
        Row: {
          body: string | null
          created_at: string | null
          direction: string
          error: string | null
          id: string
          msg_type: string | null
          payload: string | null
          state_after: string | null
          state_before: string | null
          wa_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          direction: string
          error?: string | null
          id?: string
          msg_type?: string | null
          payload?: string | null
          state_after?: string | null
          state_before?: string | null
          wa_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          direction?: string
          error?: string | null
          id?: string
          msg_type?: string | null
          payload?: string | null
          state_after?: string | null
          state_before?: string | null
          wa_id?: string
        }
        Relationships: []
      }
      wa_cloud_sessions: {
        Row: {
          created_at: string | null
          draft: Json
          last_inbound_at: string | null
          state: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          wa_id: string
        }
        Insert: {
          created_at?: string | null
          draft?: Json
          last_inbound_at?: string | null
          state?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          wa_id: string
        }
        Update: {
          created_at?: string | null
          draft?: Json
          last_inbound_at?: string | null
          state?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_cloud_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_cloud_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_message_log: {
        Row: {
          body: string | null
          created_at: string | null
          direction: string
          error: string | null
          id: string
          media_url: string | null
          message_type: string
          phone: string
          state_after: string | null
          state_before: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          direction: string
          error?: string | null
          id?: string
          media_url?: string | null
          message_type: string
          phone: string
          state_after?: string | null
          state_before?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          direction?: string
          error?: string | null
          id?: string
          media_url?: string | null
          message_type?: string
          phone?: string
          state_after?: string | null
          state_before?: string | null
        }
        Relationships: []
      }
      wa_sessions: {
        Row: {
          created_at: string | null
          draft: Json
          last_message_at: string | null
          phone: string
          state: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          draft?: Json
          last_message_at?: string | null
          phone: string
          state?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          draft?: Json
          last_message_at?: string | null
          phone?: string
          state?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_top_bid: {
        Args: { p_listing_id: string; p_seller_phone: string }
        Returns: Json
      }
      agent_place_bid: {
        Args: {
          p_agent_id: string
          p_amount: number
          p_goal_id: string
          p_livestock_id: string
          p_strategy: string
        }
        Returns: string
      }
      agent_scan_listings: {
        Args: { p_agent_id: string; p_goal_id: string }
        Returns: {
          age: string
          auction_format: string
          bid_count: number | null
          breed: string
          category: string
          created_at: string | null
          current_bid: number | null
          description: string
          duration_days: number
          end_time: string
          health: string
          id: string
          image_urls: string[] | null
          is_demo: boolean
          location: string
          pickup_lat: number | null
          pickup_lng: number | null
          reference: string | null
          seller_id: string
          starting_price: number
          status: string | null
          tenant_id: string
          title: string
          transport_available: boolean
          verified_bidders_only: boolean
          view_count: number | null
          weight: string
        }[]
        SetofOptions: {
          from: "*"
          to: "livestock_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      default_user_tenant: { Args: never; Returns: string }
      end_expired_auctions: { Args: never; Returns: undefined }
      generate_market_intel: { Args: never; Returns: undefined }
      increment_view_count: { Args: { p_item_id: string }; Returns: undefined }
      place_bid: {
        Args: {
          p_amount: number
          p_idempotency_key?: string
          p_livestock_id: string
          p_user_id: string
        }
        Returns: string
      }
      place_bid_on_behalf: {
        Args: { p_amount: number; p_livestock_id: string; p_phone: string }
        Returns: Json
      }
      provision_tenant: {
        Args: {
          p_config: Json
          p_lead_id: string
          p_name: string
          p_slug: string
          p_user_id: string
        }
        Returns: string
      }
      record_ownership_transition: {
        Args: {
          p_bid_id?: string
          p_clearance_id?: string
          p_event: string
          p_from_owner?: string
          p_livestock_id: string
          p_metadata?: Json
          p_payment_id?: string
          p_state: string
          p_to_owner?: string
        }
        Returns: string
      }
      sync_listing_bid: { Args: { p_livestock_id: string }; Returns: undefined }
      tenant_immutable_field: {
        Args: { p_field: string; p_id: string }
        Returns: string
      }
      user_has_role: {
        Args: { p_role: string; p_tenant: string; p_user?: string }
        Returns: boolean
      }
      user_tenant_ids: { Args: { p_user?: string }; Returns: string[] }
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
