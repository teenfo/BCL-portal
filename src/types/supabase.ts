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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean | null
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      admin_user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          facility_id: string | null
          id: string
          role_id: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          facility_id?: string | null
          id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          facility_id?: string | null
          id?: string
          role_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_roles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      badge_awards: {
        Row: {
          badge_id: string
          created_at: string
          earned_at: string
          id: string
          member_id: string
          progress_snapshot: number
        }
        Insert: {
          badge_id: string
          created_at?: string
          earned_at?: string
          id?: string
          member_id: string
          progress_snapshot?: number
        }
        Update: {
          badge_id?: string
          created_at?: string
          earned_at?: string
          id?: string
          member_id?: string
          progress_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "badge_awards_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_awards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_definitions: {
        Row: {
          category: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          metric_type: string
          name: string
          sort_order: number
          threshold: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          metric_type: string
          name: string
          sort_order?: number
          threshold?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          metric_type?: string
          name?: string
          sort_order?: number
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          position: string | null
          priority_order: number | null
          start_date: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          position?: string | null
          priority_order?: number | null
          start_date: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          position?: string | null
          priority_order?: number | null
          start_date?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_type: string | null
          created_at: string | null
          id: string
          member_id: string | null
          membership_id: string | null
          session_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_type?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          membership_id?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_type?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          membership_id?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          booking_id: string | null
          checkin_method: string | null
          checkin_time: string | null
          created_at: string | null
          facility_id: string | null
          id: string
          member_id: string | null
          notes: string | null
          session_id: string | null
        }
        Insert: {
          booking_id?: string | null
          checkin_method?: string | null
          checkin_time?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          session_id?: string | null
        }
        Update: {
          booking_id?: string | null
          checkin_method?: string | null
          checkin_time?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_settlements: {
        Row: {
          base_salary: number
          coach_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          session_allowance: number
          session_count: number
          status: string
          total_amount: number
          year_month: string
        }
        Insert: {
          base_salary?: number
          coach_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          session_allowance?: number
          session_count?: number
          status?: string
          total_amount?: number
          year_month: string
        }
        Update: {
          base_salary?: number
          coach_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          session_allowance?: number
          session_count?: number
          status?: string
          total_amount?: number
          year_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_settlements_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          linked_at: string | null
          linked_by: string | null
          name: string
          phone: string | null
          profile_image_url: string | null
          specialties: string[] | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          name: string
          phone?: string | null
          profile_image_url?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          name?: string
          phone?: string | null
          profile_image_url?: string | null
          specialties?: string[] | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      coaching_notes: {
        Row: {
          coach_id: string
          content: string
          created_at: string
          id: string
          member_id: string
          note_type: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          content: string
          created_at?: string
          id?: string
          member_id: string
          note_type?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          note_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaching_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          images: string[] | null
          latitude: number | null
          longitude: number | null
          name: string
          operating_hours: Json | null
          phone: string | null
          privacy_policy: string | null
          refund_policy: string | null
          terms_of_service: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          privacy_policy?: string | null
          refund_policy?: string | null
          terms_of_service?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          privacy_policy?: string | null
          refund_policy?: string | null
          terms_of_service?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kiosk_devices: {
        Row: {
          created_at: string | null
          device_ip: string | null
          device_name: string
          display_message: string | null
          facility_id: string | null
          id: string
          last_heartbeat: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_ip?: string | null
          device_name: string
          display_message?: string | null
          facility_id?: string | null
          id?: string
          last_heartbeat?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_ip?: string | null
          device_name?: string
          display_message?: string | null
          facility_id?: string | null
          id?: string
          last_heartbeat?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_devices_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      lockers: {
        Row: {
          created_at: string | null
          expires_at: string | null
          facility_id: string | null
          id: string
          locker_number: string
          member_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          locker_number: string
          member_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          locker_number?: string
          member_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lockers_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lockers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birth_date: string | null
          blacklist_reason: string | null
          counseling_notes: string | null
          created_at: string | null
          email: string | null
          emergency_contact: string | null
          gender: string | null
          id: string
          is_blacklisted: boolean | null
          medical_notes: string | null
          name: string
          phone: string | null
          profile_image_url: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          blacklist_reason?: string | null
          counseling_notes?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          is_blacklisted?: boolean | null
          medical_notes?: string | null
          name: string
          phone?: string | null
          profile_image_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          blacklist_reason?: string | null
          counseling_notes?: string | null
          created_at?: string | null
          email?: string | null
          emergency_contact?: string | null
          gender?: string | null
          id?: string
          is_blacklisted?: boolean | null
          medical_notes?: string | null
          name?: string
          phone?: string | null
          profile_image_url?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      membership_history: {
        Row: {
          action_type: string
          changed_by: string | null
          created_at: string | null
          id: string
          membership_id: string | null
          new_values: Json | null
          notes: string | null
          old_values: Json | null
        }
        Insert: {
          action_type: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          membership_id?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Update: {
          action_type?: string
          changed_by?: string | null
          created_at?: string | null
          id?: string
          membership_id?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_history_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          auto_renewal: boolean | null
          created_at: string | null
          credit_count: number | null
          description: string | null
          discount_price: number | null
          discount_rate: number | null
          duration_days: number | null
          facility_sharing: boolean | null
          id: string
          is_active: boolean | null
          is_transferable: boolean | null
          max_pause_days: number | null
          max_pauses: number | null
          name: string
          price: number
          refund_policy: Json | null
          type: string
          updated_at: string | null
        }
        Insert: {
          auto_renewal?: boolean | null
          created_at?: string | null
          credit_count?: number | null
          description?: string | null
          discount_price?: number | null
          discount_rate?: number | null
          duration_days?: number | null
          facility_sharing?: boolean | null
          id?: string
          is_active?: boolean | null
          is_transferable?: boolean | null
          max_pause_days?: number | null
          max_pauses?: number | null
          name: string
          price: number
          refund_policy?: Json | null
          type: string
          updated_at?: string | null
        }
        Update: {
          auto_renewal?: boolean | null
          created_at?: string | null
          credit_count?: number | null
          description?: string | null
          discount_price?: number | null
          discount_rate?: number | null
          duration_days?: number | null
          facility_sharing?: boolean | null
          id?: string
          is_active?: boolean | null
          is_transferable?: boolean | null
          max_pause_days?: number | null
          max_pauses?: number | null
          name?: string
          price?: number
          refund_policy?: Json | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          member_id: string | null
          pause_count: number | null
          pause_reason: string | null
          paused_at: string | null
          plan_id: string | null
          remaining_credits: number | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id?: string | null
          pause_count?: number | null
          pause_reason?: string | null
          paused_at?: string | null
          plan_id?: string | null
          remaining_credits?: number | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          member_id?: string | null
          pause_count?: number | null
          pause_reason?: string | null
          paused_at?: string | null
          plan_id?: string | null
          remaining_credits?: number | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          facility_id: string | null
          id: string
          is_pinned: boolean | null
          is_published: boolean | null
          is_urgent: boolean | null
          priority: string | null
          published_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          is_urgent?: boolean | null
          priority?: string | null
          published_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          is_urgent?: boolean | null
          priority?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notices_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string
          created_at: string | null
          error_message: string | null
          id: string
          notification_id: string | null
          read_at: string | null
          rule_id: string | null
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          categories: Json | null
          email_enabled: boolean | null
          id: string
          kakao_enabled: boolean | null
          marketing_enabled: boolean | null
          push_enabled: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          categories?: Json | null
          email_enabled?: boolean | null
          id?: string
          kakao_enabled?: boolean | null
          marketing_enabled?: boolean | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          categories?: Json | null
          email_enabled?: boolean | null
          id?: string
          kakao_enabled?: boolean | null
          marketing_enabled?: boolean | null
          push_enabled?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          category: string
          channels: string[]
          created_at: string | null
          delay_minutes: number | null
          description: string | null
          event_type: string
          id: string
          is_active: boolean | null
          name: string
          template_message: string
          template_title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          channels: string[]
          created_at?: string | null
          delay_minutes?: number | null
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          name: string
          template_message: string
          template_title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          channels?: string[]
          created_at?: string | null
          delay_minutes?: number | null
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          template_message?: string
          template_title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string | null
          channel: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          member_id: string | null
          message: string
          metadata: Json | null
          rule_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_via: string | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          channel?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          message: string
          metadata?: Json | null
          rule_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          channel?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          message?: string
          metadata?: Json | null
          rule_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      pm5_devices: {
        Row: {
          ble_name: string | null
          created_at: string | null
          current_mode: string | null
          device_type: string
          facility_id: string | null
          firmware_version: string | null
          id: string
          last_sync_at: string | null
          mac_address: string | null
          qr_identifier: string | null
          serial_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ble_name?: string | null
          created_at?: string | null
          current_mode?: string | null
          device_type: string
          facility_id?: string | null
          firmware_version?: string | null
          id?: string
          last_sync_at?: string | null
          mac_address?: string | null
          qr_identifier?: string | null
          serial_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ble_name?: string | null
          created_at?: string | null
          current_mode?: string | null
          device_type?: string
          facility_id?: string | null
          firmware_version?: string | null
          id?: string
          last_sync_at?: string | null
          mac_address?: string | null
          qr_identifier?: string | null
          serial_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pm5_devices_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          subscription: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          subscription: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          subscription?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          facility_id: string | null
          id: string
          is_active: boolean | null
          qr_type: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          qr_type?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          qr_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      race_events: {
        Row: {
          coach_id: string | null
          created_at: string | null
          description: string | null
          distance_meters: number | null
          duration_minutes: number | null
          event_date: string
          event_type: string
          facility_id: string | null
          id: string
          lobby_status: string | null
          name: string
          race_format: string | null
          session_id: string | null
          status: string | null
          target_distance_m: number | null
          updated_at: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          distance_meters?: number | null
          duration_minutes?: number | null
          event_date: string
          event_type: string
          facility_id?: string | null
          id?: string
          lobby_status?: string | null
          name: string
          race_format?: string | null
          session_id?: string | null
          status?: string | null
          target_distance_m?: number | null
          updated_at?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          distance_meters?: number | null
          duration_minutes?: number | null
          event_date?: string
          event_type?: string
          facility_id?: string | null
          id?: string
          lobby_status?: string | null
          name?: string
          race_format?: string | null
          session_id?: string | null
          status?: string | null
          target_distance_m?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_events_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_events_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      race_live_state: {
        Row: {
          calories_burned: number | null
          connection_status: string | null
          device_id: string
          distance_m: number | null
          event_id: string
          hr_bpm: number | null
          id: string
          lane_number: number
          last_updated_at: string | null
          max_watts: number | null
          member_id: string | null
          power_w: number | null
          stroke_rate_spm: number | null
          team_id: string | null
        }
        Insert: {
          calories_burned?: number | null
          connection_status?: string | null
          device_id: string
          distance_m?: number | null
          event_id: string
          hr_bpm?: number | null
          id?: string
          lane_number: number
          last_updated_at?: string | null
          max_watts?: number | null
          member_id?: string | null
          power_w?: number | null
          stroke_rate_spm?: number | null
          team_id?: string | null
        }
        Update: {
          calories_burned?: number | null
          connection_status?: string | null
          device_id?: string
          distance_m?: number | null
          event_id?: string
          hr_bpm?: number | null
          id?: string
          lane_number?: number
          last_updated_at?: string | null
          max_watts?: number | null
          member_id?: string | null
          power_w?: number | null
          stroke_rate_spm?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_live_state_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pm5_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_live_state_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_live_state_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_live_state_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "race_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      race_recordings: {
        Row: {
          created_at: string | null
          device_id: string | null
          device_serial: string
          duration_seconds: number | null
          event_id: string | null
          facility_id: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          recorded_at: string | null
          recorded_by: string | null
          total_data_points: number | null
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          device_serial: string
          duration_seconds?: number | null
          event_id?: string | null
          facility_id?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          recorded_at?: string | null
          recorded_by?: string | null
          total_data_points?: number | null
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          device_serial?: string
          duration_seconds?: number | null
          event_id?: string | null
          facility_id?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          recorded_at?: string | null
          recorded_by?: string | null
          total_data_points?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "race_recordings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pm5_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_recordings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_recordings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      race_records: {
        Row: {
          avg_hr_bpm: number | null
          avg_pace: unknown
          avg_spm: number | null
          avg_watts: number | null
          calories_burned: number | null
          created_at: string | null
          device_serial: string | null
          event_id: string | null
          finish_rank: number | null
          id: string
          is_pr: boolean | null
          lane_number: number | null
          max_hr_bpm: number | null
          max_watts: number | null
          member_id: string | null
          recording_id: string | null
          result_distance: number | null
          result_time: unknown
          team_id: string | null
        }
        Insert: {
          avg_hr_bpm?: number | null
          avg_pace?: unknown
          avg_spm?: number | null
          avg_watts?: number | null
          calories_burned?: number | null
          created_at?: string | null
          device_serial?: string | null
          event_id?: string | null
          finish_rank?: number | null
          id?: string
          is_pr?: boolean | null
          lane_number?: number | null
          max_hr_bpm?: number | null
          max_watts?: number | null
          member_id?: string | null
          recording_id?: string | null
          result_distance?: number | null
          result_time?: unknown
          team_id?: string | null
        }
        Update: {
          avg_hr_bpm?: number | null
          avg_pace?: unknown
          avg_spm?: number | null
          avg_watts?: number | null
          calories_burned?: number | null
          created_at?: string | null
          device_serial?: string | null
          event_id?: string | null
          finish_rank?: number | null
          id?: string
          is_pr?: boolean | null
          lane_number?: number | null
          max_hr_bpm?: number | null
          max_watts?: number | null
          member_id?: string | null
          recording_id?: string | null
          result_distance?: number | null
          result_time?: unknown
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_records_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_records_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_records_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "race_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "race_records_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "race_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      race_teams: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          team_color: string
          team_name: string
          total_distance_m: number | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          team_color?: string
          team_name: string
          total_distance_m?: number | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          team_color?: string
          team_name?: string
          total_distance_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "race_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
            referencedColumns: ["id"]
          },
        ]
      }
      session_coaches: {
        Row: {
          coach_id: string | null
          created_at: string | null
          id: string
          role: string | null
          session_id: string | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string | null
          id?: string
          role?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_coaches_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_coaches_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          admin_response: string | null
          coach_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          member_id: string | null
          rating: number | null
          responded_at: string | null
          responded_by: string | null
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          admin_response?: string | null
          coach_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_response?: string | null
          coach_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          rating?: number | null
          responded_at?: string | null
          responded_by?: string | null
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number
          created_at: string | null
          description: string | null
          end_time: string
          facility_id: string | null
          id: string
          intensity_level: string | null
          session_date: string
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
          wod_description: string | null
        }
        Insert: {
          capacity?: number
          created_at?: string | null
          description?: string | null
          end_time: string
          facility_id?: string | null
          id?: string
          intensity_level?: string | null
          session_date: string
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
          wod_description?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          description?: string | null
          end_time?: string
          facility_id?: string | null
          id?: string
          intensity_level?: string | null
          session_date?: string
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          wod_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          content: string
          created_at: string | null
          id: string
          member_id: string | null
          priority: string | null
          resolved_at: string | null
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          member_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          member_id?: string | null
          priority?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          id: string
          member_id: string | null
          membership_id: string | null
          payment_method: string | null
          payment_status: string | null
          pg_transaction_id: string | null
          transaction_type: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          membership_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pg_transaction_id?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          membership_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pg_transaction_id?: string | null
          transaction_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      demote_from_coach: {
        Args: { admin_user_id: string; target_user_id: string }
        Returns: undefined
      }
      fn_calculate_badge_progress: {
        Args: { p_member_id: string; p_metric_type: string }
        Returns: number
      }
      fn_calculate_monthly_settlement: {
        Args: { p_admin_user_id: string; p_year_month: string }
        Returns: Json
      }
      fn_coach_mark_attendance: {
        Args: {
          p_coach_user_id: string
          p_member_id: string
          p_session_id: string
        }
        Returns: Json
      }
      fn_evaluate_badges: {
        Args: { p_member_id: string; p_metric_types?: string[] }
        Returns: {
          badge_id: string
          created_at: string
          earned_at: string
          id: string
          member_id: string
          progress_snapshot: number
        }[]
        SetofOptions: {
          from: "*"
          to: "badge_awards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_get_coach_dashboard: { Args: { p_user_id: string }; Returns: Json }
      fn_get_coach_performance_stats: { Args: never; Returns: Json }
      fn_get_my_badges: {
        Args: { p_user_id: string }
        Returns: {
          badge_id: string
          category: string
          description: string
          earned: boolean
          earned_at: string
          icon: string
          metric_type: string
          name: string
          progress: number
          sort_order: number
          threshold: number
        }[]
      }
      fn_get_session_attendees: {
        Args: { p_session_id: string }
        Returns: Json
      }
      get_dashboard_kpis: { Args: never; Returns: Json }
      get_member_with_membership: {
        Args: { p_member_id: string }
        Returns: Json
      }
      get_revenue_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_coach: { Args: never; Returns: boolean }
      promote_to_coach: {
        Args: { admin_user_id: string; target_user_id: string }
        Returns: undefined
      }
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
