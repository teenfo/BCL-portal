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
        ]
      }
      ai_widget_generation_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          generated_modal_ids: string[] | null
          generated_widget_id: string | null
          id: string
          model_used: string
          prompt: string
          raw_response: Json | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          generated_modal_ids?: string[] | null
          generated_widget_id?: string | null
          id?: string
          model_used?: string
          prompt: string
          raw_response?: Json | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          generated_modal_ids?: string[] | null
          generated_widget_id?: string | null
          id?: string
          model_used?: string
          prompt?: string
          raw_response?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_widget_generation_logs_generated_widget_id_fkey"
            columns: ["generated_widget_id"]
            isOneToOne: false
            referencedRelation: "widget_definitions"
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
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          attendance_outcome: string
          cancel_reason: string | null
          created_at: string | null
          id: string
          member_id: string | null
          session_id: string | null
          status: string | null
          user_id: string | null
          waitlist_promoted_at: string | null
        }
        Insert: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_outcome?: string
          cancel_reason?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          waitlist_promoted_at?: string | null
        }
        Update: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_outcome?: string
          cancel_reason?: string | null
          created_at?: string | null
          id?: string
          member_id?: string | null
          session_id?: string | null
          status?: string | null
          user_id?: string | null
          waitlist_promoted_at?: string | null
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
          facility: string | null
          facility_id: string | null
          id: string
          member_id: string | null
          member_name: string | null
          notes: string | null
          session_id: string | null
          status: string | null
          time: string | null
        }
        Insert: {
          booking_id?: string | null
          checkin_method?: string | null
          checkin_time?: string | null
          created_at?: string | null
          facility?: string | null
          facility_id?: string | null
          id?: string
          member_id?: string | null
          member_name?: string | null
          notes?: string | null
          session_id?: string | null
          status?: string | null
          time?: string | null
        }
        Update: {
          booking_id?: string | null
          checkin_method?: string | null
          checkin_time?: string | null
          created_at?: string | null
          facility?: string | null
          facility_id?: string | null
          id?: string
          member_id?: string | null
          member_name?: string | null
          notes?: string | null
          session_id?: string | null
          status?: string | null
          time?: string | null
        }
        Relationships: [
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
      coaches: {
        Row: {
          bio: string | null
          created_at: string | null
          email: string
          id: string
          joined_date: string | null
          linked_at: string | null
          linked_by: string | null
          name: string
          phone: string | null
          profile_image_url: string | null
          specialties: string[] | null
          specialty: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          email: string
          id?: string
          joined_date?: string | null
          linked_at?: string | null
          linked_by?: string | null
          name: string
          phone?: string | null
          profile_image_url?: string | null
          specialties?: string[] | null
          specialty?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          email?: string
          id?: string
          joined_date?: string | null
          linked_at?: string | null
          linked_by?: string | null
          name?: string
          phone?: string | null
          profile_image_url?: string | null
          specialties?: string[] | null
          specialty?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
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
          operating_hours: string | null
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
          operating_hours?: string | null
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
          operating_hours?: string | null
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
      locker_assignments: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          locker_id: string
          member_id: string
          note: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          locker_id: string
          member_id: string
          note?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          locker_id?: string
          member_id?: string
          note?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locker_assignments_locker_id_fkey"
            columns: ["locker_id"]
            isOneToOne: false
            referencedRelation: "lockers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locker_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      lockers: {
        Row: {
          assigned_member_id: string | null
          assignment_end_date: string | null
          assignment_start_date: string | null
          created_at: string | null
          facility_id: string | null
          id: string
          locker_number: string
          monthly_fee: number | null
          note: string | null
          size: string
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_member_id?: string | null
          assignment_end_date?: string | null
          assignment_start_date?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          locker_number: string
          monthly_fee?: number | null
          note?: string | null
          size?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_member_id?: string | null
          assignment_end_date?: string | null
          assignment_start_date?: string | null
          created_at?: string | null
          facility_id?: string | null
          id?: string
          locker_number?: string
          monthly_fee?: number | null
          note?: string | null
          size?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lockers_assigned_member_id_fkey"
            columns: ["assigned_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lockers_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notes: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          member_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          member_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          member_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          birthdate: string | null
          blacklist_reason: string | null
          counseling_notes: string | null
          created_at: string | null
          credits: number | null
          email: string
          gender: string | null
          id: string
          is_blacklisted: boolean | null
          joined_date: string | null
          locker_end_date: string | null
          locker_number: string | null
          membership_end_date: string | null
          membership_start_date: string | null
          name: string
          phone: string | null
          plan: string | null
          profile_image: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          birthdate?: string | null
          blacklist_reason?: string | null
          counseling_notes?: string | null
          created_at?: string | null
          credits?: number | null
          email: string
          gender?: string | null
          id?: string
          is_blacklisted?: boolean | null
          joined_date?: string | null
          locker_end_date?: string | null
          locker_number?: string | null
          membership_end_date?: string | null
          membership_start_date?: string | null
          name: string
          phone?: string | null
          plan?: string | null
          profile_image?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          birthdate?: string | null
          blacklist_reason?: string | null
          counseling_notes?: string | null
          created_at?: string | null
          credits?: number | null
          email?: string
          gender?: string | null
          id?: string
          is_blacklisted?: boolean | null
          joined_date?: string | null
          locker_end_date?: string | null
          locker_number?: string | null
          membership_end_date?: string | null
          membership_start_date?: string | null
          name?: string
          phone?: string | null
          plan?: string | null
          profile_image?: string | null
          status?: string | null
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
          created_at: string | null
          credit_count: number | null
          credits: number | null
          description: string | null
          discount_price: number | null
          duration_days: number | null
          facility_sharing: boolean | null
          id: string
          is_active: boolean | null
          max_pauses: number | null
          name: string
          price: number
          refund_policy: Json | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credit_count?: number | null
          credits?: number | null
          description?: string | null
          discount_price?: number | null
          duration_days?: number | null
          facility_sharing?: boolean | null
          id?: string
          is_active?: boolean | null
          max_pauses?: number | null
          name: string
          price: number
          refund_policy?: Json | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credit_count?: number | null
          credits?: number | null
          description?: string | null
          discount_price?: number | null
          duration_days?: number | null
          facility_sharing?: boolean | null
          id?: string
          is_active?: boolean | null
          max_pauses?: number | null
          name?: string
          price?: number
          refund_policy?: Json | null
          type?: string | null
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
          start_date: string | null
          status: string | null
          user_id: string | null
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
          start_date?: string | null
          status?: string | null
          user_id?: string | null
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
          start_date?: string | null
          status?: string | null
          user_id?: string | null
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
      modal_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          facility_id: string | null
          fields: Json
          id: string
          source: string
          submit_action: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          facility_id?: string | null
          fields?: Json
          id: string
          source?: string
          submit_action?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          facility_id?: string | null
          fields?: Json
          id?: string
          source?: string
          submit_action?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modal_definitions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          created_at: string | null
          date: string | null
          id: string
          is_published: boolean | null
          priority: string | null
          title: string
          views: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          title: string
          views?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          is_published?: boolean | null
          priority?: string | null
          title?: string
          views?: number | null
        }
        Relationships: []
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
          checkin: boolean | null
          class_reminder: boolean | null
          created_at: string | null
          email_enabled: boolean | null
          id: string
          kakao_enabled: boolean | null
          member_id: string | null
          membership_expiry: boolean | null
          promotion: boolean | null
          push_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          system_notification: boolean | null
          updated_at: string | null
          user_id: string
          waitlist_vacancy: boolean | null
        }
        Insert: {
          checkin?: boolean | null
          class_reminder?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          kakao_enabled?: boolean | null
          member_id?: string | null
          membership_expiry?: boolean | null
          promotion?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          system_notification?: boolean | null
          updated_at?: string | null
          user_id: string
          waitlist_vacancy?: boolean | null
        }
        Update: {
          checkin?: boolean | null
          class_reminder?: boolean | null
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          kakao_enabled?: boolean | null
          member_id?: string | null
          membership_expiry?: boolean | null
          promotion?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          system_notification?: boolean | null
          updated_at?: string | null
          user_id?: string
          waitlist_vacancy?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          category: string
          channels: string[]
          created_at: string | null
          description: string | null
          facility_id: string | null
          id: string
          is_active: boolean | null
          message_template: string
          name: string
          title_template: string
          trigger_config: Json
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          category: string
          channels?: string[]
          created_at?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          message_template: string
          name: string
          title_template: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          channels?: string[]
          created_at?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          message_template?: string
          name?: string
          title_template?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          category: string | null
          channel: string | null
          content: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          member_id: string | null
          metadata: Json | null
          rule_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          sent_via: string[] | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          channel?: string | null
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          metadata?: Json | null
          rule_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_via?: string[] | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          category?: string | null
          channel?: string | null
          content?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          metadata?: Json | null
          rule_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          sent_via?: string[] | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notifications_rule"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "notification_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          membership_id: string | null
          payment_method: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          membership_id?: string | null
          payment_method?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          membership_id?: string | null
          payment_method?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      pg_settings: {
        Row: {
          created_at: string | null
          facility_id: string | null
          id: string
          is_active: boolean | null
          live_client_key: string | null
          live_secret_key_encrypted: string | null
          payment_mode: string | null
          pos_api_key_encrypted: string | null
          provider: string
          test_client_key: string | null
          test_secret_key_encrypted: string | null
          updated_at: string | null
          webhook_secret_encrypted: string | null
        }
        Insert: {
          created_at?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          live_client_key?: string | null
          live_secret_key_encrypted?: string | null
          payment_mode?: string | null
          pos_api_key_encrypted?: string | null
          provider?: string
          test_client_key?: string | null
          test_secret_key_encrypted?: string | null
          updated_at?: string | null
          webhook_secret_encrypted?: string | null
        }
        Update: {
          created_at?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean | null
          live_client_key?: string | null
          live_secret_key_encrypted?: string | null
          payment_mode?: string | null
          pos_api_key_encrypted?: string | null
          provider?: string
          test_client_key?: string | null
          test_secret_key_encrypted?: string | null
          updated_at?: string | null
          webhook_secret_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pg_settings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
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
          approval_status: string
          avatar_url: string | null
          email: string | null
          facility_id: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          email?: string | null
          facility_id?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          email?: string | null
          facility_id?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_type: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          member_id: string | null
          p256dh_key: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_type?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          member_id?: string | null
          p256dh_key: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_type?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          member_id?: string | null
          p256dh_key?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
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
          avg_pace: string | null
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
          result_time: string | null
          team_id: string | null
        }
        Insert: {
          avg_hr_bpm?: number | null
          avg_pace?: string | null
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
          result_time?: string | null
          team_id?: string | null
        }
        Update: {
          avg_hr_bpm?: number | null
          avg_pace?: string | null
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
          result_time?: string | null
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
      refunds: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          penalty_amount: number | null
          processed_by: string | null
          reason: string
          refund_method: string | null
          status: string | null
          toss_cancel_key: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          penalty_amount?: number | null
          processed_by?: string | null
          reason: string
          refund_method?: string | null
          status?: string | null
          toss_cancel_key?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          penalty_amount?: number | null
          processed_by?: string | null
          reason?: string
          refund_method?: string | null
          status?: string | null
          toss_cancel_key?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_coaches: {
        Row: {
          assignment_role: string
          coach_id: string
          display_order: number
          session_id: string
        }
        Insert: {
          assignment_role?: string
          coach_id: string
          display_order?: number
          session_id: string
        }
        Update: {
          assignment_role?: string
          coach_id?: string
          display_order?: number
          session_id?: string
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
          capacity: number | null
          coach_name: string | null
          created_at: string | null
          end_time: string
          enrolled: number | null
          id: string
          intensity: string | null
          session_date: string | null
          start_time: string
          title: string
        }
        Insert: {
          capacity?: number | null
          coach_name?: string | null
          created_at?: string | null
          end_time: string
          enrolled?: number | null
          id?: string
          intensity?: string | null
          session_date?: string | null
          start_time: string
          title: string
        }
        Update: {
          capacity?: number | null
          coach_name?: string | null
          created_at?: string | null
          end_time?: string
          enrolled?: number | null
          id?: string
          intensity?: string | null
          session_date?: string | null
          start_time?: string
          title?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          category: string | null
          content: string | null
          created_at: string | null
          description: string | null
          id: string
          member_id: string | null
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string | null
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string | null
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
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
      system_config: {
        Row: {
          category: string
          config_key: string
          config_value: string
          created_at: string | null
          description: string | null
          id: string
          is_secret: boolean | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          config_key: string
          config_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number | null
          cancel_amount: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          category: string | null
          created_at: string | null
          date: string | null
          facility_id: string | null
          id: string
          member_email: string | null
          member_id: string | null
          membership_id: string | null
          method: string | null
          order_id: string | null
          payment_key: string | null
          payment_method: string | null
          payment_status: string | null
          pg_transaction_id: string | null
          plan_id: string | null
          receipt_url: string | null
          source: string | null
          status: string | null
          toss_raw_data: Json | null
          toss_status: string | null
          transaction_type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          cancel_amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          facility_id?: string | null
          id: string
          member_email?: string | null
          member_id?: string | null
          membership_id?: string | null
          method?: string | null
          order_id?: string | null
          payment_key?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pg_transaction_id?: string | null
          plan_id?: string | null
          receipt_url?: string | null
          source?: string | null
          status?: string | null
          toss_raw_data?: Json | null
          toss_status?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          cancel_amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          facility_id?: string | null
          id?: string
          member_email?: string | null
          member_id?: string | null
          membership_id?: string | null
          method?: string | null
          order_id?: string | null
          payment_key?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pg_transaction_id?: string | null
          plan_id?: string | null
          receipt_url?: string | null
          source?: string | null
          status?: string | null
          toss_raw_data?: Json | null
          toss_status?: string | null
          transaction_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_definitions: {
        Row: {
          actions: Json
          badge_key: string | null
          category: string
          context_items: Json
          created_at: string
          created_by: string | null
          default_enabled: boolean
          default_order: number
          description: string
          detail_href: string | null
          facility_id: string | null
          hero_metric: Json
          icon: string
          icon_color: string
          id: string
          mini_list: Json | null
          progress_bar: Json | null
          source: string
          title: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          badge_key?: string | null
          category?: string
          context_items?: Json
          created_at?: string
          created_by?: string | null
          default_enabled?: boolean
          default_order?: number
          description?: string
          detail_href?: string | null
          facility_id?: string | null
          hero_metric?: Json
          icon?: string
          icon_color?: string
          id: string
          mini_list?: Json | null
          progress_bar?: Json | null
          source?: string
          title: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          badge_key?: string | null
          category?: string
          context_items?: Json
          created_at?: string
          created_by?: string | null
          default_enabled?: boolean
          default_order?: number
          description?: string
          detail_href?: string | null
          facility_id?: string | null
          hero_metric?: Json
          icon?: string
          icon_color?: string
          id?: string
          mini_list?: Json | null
          progress_bar?: Json | null
          source?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_definitions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_settings: {
        Row: {
          active_widgets: string[]
          created_at: string
          customizations: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_widgets?: string[]
          created_at?: string
          customizations?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_widgets?: string[]
          created_at?: string
          customizations?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wods: {
        Row: {
          cooldown: Json | null
          created_at: string | null
          date: string
          id: string
          metcon: Json | null
          strength: Json | null
          title: string
          warmup: Json | null
        }
        Insert: {
          cooldown?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          metcon?: Json | null
          strength?: Json | null
          title: string
          warmup?: Json | null
        }
        Update: {
          cooldown?: Json | null
          created_at?: string | null
          date?: string
          id?: string
          metcon?: Json | null
          strength?: Json | null
          title?: string
          warmup?: Json | null
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          coach_feedback: string | null
          content: string
          created_at: string | null
          date: string | null
          id: string
          is_reviewed: boolean | null
          member_id: string | null
        }
        Insert: {
          coach_feedback?: string | null
          content: string
          created_at?: string | null
          date?: string | null
          id?: string
          is_reviewed?: boolean | null
          member_id?: string | null
        }
        Update: {
          coach_feedback?: string | null
          content?: string
          created_at?: string | null
          date?: string | null
          id?: string
          is_reviewed?: boolean | null
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_results: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          profile_id: string | null
          result_type: string
          score: string
          wod_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id?: string | null
          result_type: string
          score: string
          wod_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          profile_id?: string | null
          result_type?: string
          score?: string
          wod_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_results_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_results_wod_id_fkey"
            columns: ["wod_id"]
            isOneToOne: false
            referencedRelation: "wods"
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
      fn_bulk_mark_session_attendance: {
        Args: { p_payload: Json; p_session_id: string }
        Returns: Json
      }
      fn_get_coach_schedule: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      fn_get_coach_session_board: {
        Args: { p_session_id: string }
        Returns: Json
      }
      fn_get_my_coach_context: { Args: never; Returns: Json }
      fn_get_my_coach_dashboard: { Args: never; Returns: Json }
      fn_mark_session_attendance: {
        Args: { p_action: string; p_member_id: string; p_session_id: string }
        Returns: Json
      }
      fn_send_class_reminders: { Args: never; Returns: undefined }
      fn_send_membership_expiry_reminders: { Args: never; Returns: undefined }
      get_dashboard_kpis: { Args: never; Returns: Json }
      get_decrypted_pg_settings: {
        Args: { p_encryption_key: string; p_facility_id: string }
        Returns: {
          live_secret_key: string
          payment_mode: string
          test_secret_key: string
          webhook_secret: string
        }[]
      }
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
      save_pg_settings: {
        Args: {
          p_encryption_key: string
          p_facility_id: string
          p_live_secret_key: string
          p_test_secret_key: string
          p_webhook_secret: string
        }
        Returns: Json
      }
      update_user_role: {
        Args: { new_role: string; user_id: string }
        Returns: Json
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
