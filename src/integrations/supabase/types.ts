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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["announcement_category"]
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          message: string
          priority: Database["public"]["Enums"]["announcement_priority"]
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          message: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["announcement_category"]
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          message?: string
          priority?: Database["public"]["Enums"]["announcement_priority"]
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      cart_ownership: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          customer_id: string
          id: string
          owner_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          owner_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_ownership_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_ownership_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_logos: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          logo_url: string
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url: string
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string
          name?: string
        }
        Relationships: []
      }
      customer_phones: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          is_primary: boolean | null
          phone: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          is_primary?: boolean | null
          phone: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          is_primary?: boolean | null
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_phones_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_shifts: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string | null
          employee_id: string
          hours_worked: number | null
          id: string
          notes: string | null
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          employee_id: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          employee_id?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      geofence_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          geofence_id: string
          id: string
          latitude: number
          longitude: number
          timestamp: string
          vehicle_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          geofence_id: string
          id?: string
          latitude: number
          longitude: number
          timestamp?: string
          vehicle_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          geofence_id?: string
          id?: string
          latitude?: number
          longitude?: number
          timestamp?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "geofence_alerts_geofence_id_fkey"
            columns: ["geofence_id"]
            isOneToOne: false
            referencedRelation: "geofences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geofence_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      geofences: {
        Row: {
          active: boolean | null
          alert_on_enter: boolean | null
          alert_on_exit: boolean | null
          center_lat: number | null
          center_lng: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          polygon_coords: Json | null
          radius: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          alert_on_enter?: boolean | null
          alert_on_exit?: boolean | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          polygon_coords?: Json | null
          radius?: number | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          alert_on_enter?: boolean | null
          alert_on_exit?: boolean | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          polygon_coords?: Json | null
          radius?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gps_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      location_history: {
        Row: {
          accuracy: number | null
          altitude: number | null
          created_at: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          speed: number | null
          timestamp: string
          tracking_source: string
          vehicle_id: string
        }
        Insert: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          speed?: number | null
          timestamp?: string
          tracking_source: string
          vehicle_id: string
        }
        Update: {
          accuracy?: number | null
          altitude?: number | null
          created_at?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          speed?: number | null
          timestamp?: string
          tracking_source?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_backgrounds: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          quality: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          quality?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          quality?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          order_id: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          order_id: string
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          order_id?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          box_size: string | null
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Insert: {
          box_size?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id: string
          quantity: number
        }
        Update: {
          box_size?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
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
          assigned_worker_id: string | null
          created_at: string | null
          customer_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total: number
          updated_at: string | null
        }
        Insert: {
          assigned_worker_id?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total: number
          updated_at?: string | null
        }
        Update: {
          assigned_worker_id?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          box_sizes: string[] | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          low_stock_threshold: number | null
          name: string
          price: number
          quantity: number
          reorder_point: number | null
          reorder_quantity: number | null
          supplier_name: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          box_sizes?: string[] | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          name: string
          price: number
          quantity?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          supplier_name?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          box_sizes?: string[] | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number | null
          name?: string
          price?: number
          quantity?: number
          reorder_point?: number | null
          reorder_quantity?: number | null
          supplier_name?: string | null
          updated_at?: string | null
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
          cart_name: string | null
          cart_number: string | null
          created_at: string | null
          customer_tier: string | null
          email: string
          email_notifications: boolean | null
          full_name: string | null
          id: string
          loyalty_points: number | null
          phone: string | null
          sms_notifications: boolean | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          cart_name?: string | null
          cart_number?: string | null
          created_at?: string | null
          customer_tier?: string | null
          email: string
          email_notifications?: boolean | null
          full_name?: string | null
          id: string
          loyalty_points?: number | null
          phone?: string | null
          sms_notifications?: boolean | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          cart_name?: string | null
          cart_number?: string | null
          created_at?: string | null
          customer_tier?: string | null
          email?: string
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          loyalty_points?: number | null
          phone?: string | null
          sms_notifications?: boolean | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          cost_price: number
          created_at: string | null
          id: string
          product_id: string
          purchase_order_id: string
          quantity: number
        }
        Insert: {
          cost_price: number
          created_at?: string | null
          id?: string
          product_id: string
          purchase_order_id: string
          quantity: number
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          id?: string
          product_id?: string
          purchase_order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          notes: string | null
          received_at: string | null
          status: string
          supplier_name: string
          total: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          notes?: string | null
          received_at?: string | null
          status?: string
          supplier_name: string
          total?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          status?: string
          supplier_name?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      receipt_templates: {
        Row: {
          created_at: string | null
          footer_text: string | null
          header_text: string | null
          id: string
          is_default: boolean | null
          name: string
          paper_width: number | null
          show_barcode: boolean | null
          show_company_info: boolean | null
          show_logo: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          paper_width?: number | null
          show_barcode?: boolean | null
          show_company_info?: boolean | null
          show_logo?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          footer_text?: string | null
          header_text?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          paper_width?: number | null
          show_barcode?: boolean | null
          show_company_info?: boolean | null
          show_logo?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_change_audit: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string
        }
        Relationships: []
      }
      sms_rate_limit: {
        Row: {
          id: string
          message_type: string
          order_id: string | null
          phone_number: string
          sent_at: string
        }
        Insert: {
          id?: string
          message_type: string
          order_id?: string | null
          phone_number: string
          sent_at?: string
        }
        Update: {
          id?: string
          message_type?: string
          order_id?: string | null
          phone_number?: string
          sent_at?: string
        }
        Relationships: []
      }
      stock_take_items: {
        Row: {
          actual_quantity: number | null
          created_at: string | null
          expected_quantity: number
          id: string
          product_id: string
          stock_take_id: string
          updated_at: string | null
          variance: number | null
        }
        Insert: {
          actual_quantity?: number | null
          created_at?: string | null
          expected_quantity: number
          id?: string
          product_id: string
          stock_take_id: string
          updated_at?: string | null
          variance?: number | null
        }
        Update: {
          actual_quantity?: number | null
          created_at?: string | null
          expected_quantity?: number
          id?: string
          product_id?: string
          stock_take_id?: string
          updated_at?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_take_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_take_items_stock_take_id_fkey"
            columns: ["stock_take_id"]
            isOneToOne: false
            referencedRelation: "stock_takes"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_takes: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string
          id: string
          name: string
          notes: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          notes?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      themes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_system: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
        }
        Relationships: []
      }
      user_dismissed_announcements: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dismissed_announcements_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_phone_numbers: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean | null
          phone_number: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          phone_number: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean | null
          phone_number?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          assigned_driver_id: string | null
          created_at: string | null
          device_id: string | null
          id: string
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          status: string | null
          tracking_type: string
          type: string
          updated_at: string | null
          vehicle_number: string
          vin: string | null
          year: number | null
        }
        Insert: {
          assigned_driver_id?: string | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          status?: string | null
          tracking_type?: string
          type: string
          updated_at?: string | null
          vehicle_number: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          assigned_driver_id?: string | null
          created_at?: string | null
          device_id?: string | null
          id?: string
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          status?: string | null
          tracking_type?: string
          type?: string
          updated_at?: string | null
          vehicle_number?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
      violation_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          violation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          violation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_images_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "violations"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          cart_name: string | null
          cart_number: string | null
          created_at: string
          customer_id: string
          description: string
          id: string
          inspector_id: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
          violation_type: string
        }
        Insert: {
          cart_name?: string | null
          cart_number?: string | null
          created_at?: string
          customer_id: string
          description: string
          id?: string
          inspector_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          updated_at?: string
          violation_type: string
        }
        Update: {
          cart_name?: string | null
          cart_number?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          inspector_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_inspector_id_fkey"
            columns: ["inspector_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_balances: {
        Row: {
          amount_paid: number | null
          commissary_rent: number | null
          created_at: string | null
          customer_id: string
          franchise_fee: number | null
          id: string
          old_balance: number | null
          orders_total: number | null
          payment_status: string | null
          remaining_balance: number | null
          total_balance: number | null
          updated_at: string | null
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          amount_paid?: number | null
          commissary_rent?: number | null
          created_at?: string | null
          customer_id: string
          franchise_fee?: number | null
          id?: string
          old_balance?: number | null
          orders_total?: number | null
          payment_status?: string | null
          remaining_balance?: number | null
          total_balance?: number | null
          updated_at?: string | null
          week_end_date: string
          week_start_date: string
        }
        Update: {
          amount_paid?: number | null
          commissary_rent?: number | null
          created_at?: string | null
          customer_id?: string
          franchise_fee?: number | null
          id?: string
          old_balance?: number | null
          orders_total?: number | null
          payment_status?: string | null
          remaining_balance?: number | null
          total_balance?: number | null
          updated_at?: string | null
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_balances_customer_id_fkey"
            columns: ["customer_id"]
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
      check_low_stock: { Args: never; Returns: undefined }
      cleanup_old_sms_logs: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_message: string
          p_order_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_customer_profiles: {
        Args: never
        Returns: {
          cart_name: string
          cart_number: string
          email: string
          full_name: string
          id: string
        }[]
      }
      get_manageable_profiles: {
        Args: never
        Returns: {
          cart_name: string
          cart_number: string
          email: string
          full_name: string
          id: string
          phone: string
          user_roles: Json
        }[]
      }
      get_user_cart_number: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner_of_customer: {
        Args: { _customer_id: string; _owner_id: string }
        Returns: boolean
      }
      rollover_unpaid_balance: {
        Args: { p_current_week_start: string; p_customer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      announcement_category: "price" | "fleet" | "general"
      announcement_priority: "urgent" | "important" | "info"
      app_role:
        | "customer"
        | "worker"
        | "manager"
        | "super_admin"
        | "admin"
        | "owner"
      order_status: "pending" | "processing" | "completed" | "cancelled"
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
      announcement_category: ["price", "fleet", "general"],
      announcement_priority: ["urgent", "important", "info"],
      app_role: [
        "customer",
        "worker",
        "manager",
        "super_admin",
        "admin",
        "owner",
      ],
      order_status: ["pending", "processing", "completed", "cancelled"],
    },
  },
} as const
