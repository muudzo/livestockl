export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string;
          avatar_url: string | null;
          verified: boolean;
          rating: number;
          sales_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          first_name: string;
          last_name: string;
          phone: string;
          avatar_url?: string | null;
          verified?: boolean;
          rating?: number;
          sales_count?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      livestock_items: {
        Row: {
          id: string;
          title: string;
          category: 'Cattle' | 'Goats' | 'Sheep' | 'Pigs' | 'Chickens' | 'Other';
          breed: string;
          age: string;
          weight: string;
          description: string;
          location: string;
          health: 'Excellent' | 'Good' | 'Fair';
          starting_price: number;
          current_bid: number;
          bid_count: number;
          view_count: number;
          image_urls: string[];
          seller_id: string;
          status: 'active' | 'ended' | 'sold' | 'cancelled';
          duration_days: number;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category: 'Cattle' | 'Goats' | 'Sheep' | 'Pigs' | 'Chickens' | 'Other';
          breed: string;
          age: string;
          weight: string;
          description: string;
          location: string;
          health: 'Excellent' | 'Good' | 'Fair';
          starting_price: number;
          current_bid?: number;
          bid_count?: number;
          view_count?: number;
          image_urls?: string[];
          seller_id: string;
          status?: 'active' | 'ended' | 'sold' | 'cancelled';
          duration_days: number;
          end_time: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['livestock_items']['Insert']>;
      };
      bids: {
        Row: {
          id: string;
          livestock_id: string;
          user_id: string;
          amount: number;
          is_winner: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          livestock_id: string;
          user_id: string;
          amount: number;
          is_winner?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bids']['Insert']>;
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          livestock_id: string;
          reference: string;
          amount: number;
          method: 'EcoCash' | 'OneMoney' | 'Card';
          status: 'pending' | 'paid' | 'failed';
          paynow_reference: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          livestock_id: string;
          reference: string;
          amount: number;
          method: 'EcoCash' | 'OneMoney' | 'Card';
          status?: 'pending' | 'paid' | 'failed';
          paynow_reference?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payments']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'bid' | 'message' | 'auction_ending' | 'auction_won' | 'auction_lost' | 'verification' | 'payment';
          title: string;
          message: string;
          read: boolean;
          priority: 'high' | 'medium' | 'low';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'bid' | 'message' | 'auction_ending' | 'auction_won' | 'auction_lost' | 'verification' | 'payment';
          title: string;
          message: string;
          read?: boolean;
          priority?: 'high' | 'medium' | 'low';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          livestock_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          livestock_id: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
      };
      conversations: {
        Row: {
          id: string;
          participant_1: string;
          participant_2: string;
          livestock_id: string | null;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_1: string;
          participant_2: string;
          livestock_id?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      bill_payments: {
        Row: {
          id: string;
          user_id: string;
          reference: string;
          biller_code: string;
          biller_name: string;
          account_number: string;
          account_holder: string | null;
          amount: number;
          total_amount: number | null;
          currency: string;
          requires_forex: boolean;
          status: 'pending' | 'authorized' | 'being_processed' | 'paid' | 'failed' | 'flagged' | 'reversed';
          billpay_reference: string | null;
          biller_payment_reference: string | null;
          wallet_debit_reference: string | null;
          vendor_commission: number;
          vendor_service_fee: number;
          vendor_service_fee_currency: string | null;
          products: Record<string, unknown>[];
          auth_data: Record<string, unknown> | null;
          vouchers: Record<string, unknown>[];
          receipt_smses: string[];
          receipt_html: string[];
          display_data: Record<string, string>;
          payer_details: Record<string, string> | null;
          narration: string | null;
          status_check_count: number;
          last_status_check_at: string | null;
          flagged_at: string | null;
          linked_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reference: string;
          biller_code: string;
          biller_name: string;
          account_number: string;
          account_holder?: string | null;
          amount: number;
          total_amount?: number | null;
          currency?: string;
          requires_forex?: boolean;
          status?: 'pending' | 'authorized' | 'being_processed' | 'paid' | 'failed' | 'flagged' | 'reversed';
          billpay_reference?: string | null;
          biller_payment_reference?: string | null;
          wallet_debit_reference?: string | null;
          vendor_commission?: number;
          vendor_service_fee?: number;
          vendor_service_fee_currency?: string | null;
          products?: Record<string, unknown>[];
          auth_data?: Record<string, unknown> | null;
          vouchers?: Record<string, unknown>[];
          receipt_smses?: string[];
          receipt_html?: string[];
          display_data?: Record<string, string>;
          payer_details?: Record<string, string> | null;
          narration?: string | null;
          status_check_count?: number;
          last_status_check_at?: string | null;
          flagged_at?: string | null;
          linked_payment_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bill_payments']['Insert']>;
      };
      billers_cache: {
        Row: {
          biller_code: string;
          biller_name: string;
          description: string | null;
          icon_url: string | null;
          logo_url: string | null;
          enabled: boolean;
          member_number_field_label: string | null;
          member_number_field_desc: string | null;
          member_number_field_regex: string | null;
          allow_multiple_products: boolean;
          vendor_must_invoice: boolean;
          products: Record<string, unknown>[];
          raw_config: Record<string, unknown> | null;
          updated_at: string;
        };
        Insert: {
          biller_code: string;
          biller_name: string;
          description?: string | null;
          icon_url?: string | null;
          logo_url?: string | null;
          enabled?: boolean;
          member_number_field_label?: string | null;
          member_number_field_desc?: string | null;
          member_number_field_regex?: string | null;
          allow_multiple_products?: boolean;
          vendor_must_invoice?: boolean;
          products?: Record<string, unknown>[];
          raw_config?: Record<string, unknown> | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['billers_cache']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      place_bid: {
        Args: { p_livestock_id: string; p_user_id: string; p_amount: number };
        Returns: string;
      };
      increment_view_count: {
        Args: { p_item_id: string };
        Returns: undefined;
      };
      end_expired_auctions: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
