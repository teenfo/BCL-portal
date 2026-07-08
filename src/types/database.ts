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
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_system_role: boolean
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_system_role?: boolean
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_system_role?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      admin_user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          facility_id: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          facility_id?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          facility_id?: string | null
          id?: string
          role_id?: string
          user_id?: string
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          member_id: string
          progress_value: number | null
          source: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          member_id: string
          progress_value?: number | null
          source?: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          member_id?: string
          progress_value?: number | null
          source?: string
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
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          metric_type: string
          name: string
          slug: string
          sort_order: number
          threshold_value: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          metric_type: string
          name: string
          slug: string
          sort_order?: number
          threshold_value?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          metric_type?: string
          name?: string
          slug?: string
          sort_order?: number
          threshold_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          position: string
          priority_order: number
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          priority_order?: number
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          priority_order?: number
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      benchmark_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          facility_id: string | null
          id: string
          is_active: boolean
          metric_type: string
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          metric_type: string
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          metric_type?: string
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_definitions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          attendance_outcome: string
          booking_type: string
          cancel_reason: string | null
          created_at: string
          credit_used: boolean
          id: string
          member_id: string
          membership_id: string | null
          session_id: string
          status: string
          updated_at: string
          waitlist_promoted_at: string | null
        }
        Insert: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_outcome?: string
          booking_type?: string
          cancel_reason?: string | null
          created_at?: string
          credit_used?: boolean
          id?: string
          member_id: string
          membership_id?: string | null
          session_id: string
          status?: string
          updated_at?: string
          waitlist_promoted_at?: string | null
        }
        Update: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_outcome?: string
          booking_type?: string
          cancel_reason?: string | null
          created_at?: string
          credit_used?: boolean
          id?: string
          member_id?: string
          membership_id?: string | null
          session_id?: string
          status?: string
          updated_at?: string
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
          checkin_method: string
          checkin_time: string
          created_at: string
          facility_id: string | null
          id: string
          member_id: string
          notes: string | null
          session_id: string | null
        }
        Insert: {
          booking_id?: string | null
          checkin_method?: string
          checkin_time?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          member_id: string
          notes?: string | null
          session_id?: string | null
        }
        Update: {
          booking_id?: string | null
          checkin_method?: string
          checkin_time?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          member_id?: string
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
      class_runbook_templates: {
        Row: {
          class_type: string | null
          coach_cues: string | null
          created_at: string
          created_by: string | null
          default_wod_template_id: string | null
          facility_id: string
          finish_notes: string | null
          id: string
          is_default: boolean
          movement_prep: string | null
          name: string
          safety_notes: string | null
          scaling_options: string | null
          updated_at: string
          updated_by: string | null
          warmup: string | null
        }
        Insert: {
          class_type?: string | null
          coach_cues?: string | null
          created_at?: string
          created_by?: string | null
          default_wod_template_id?: string | null
          facility_id: string
          finish_notes?: string | null
          id?: string
          is_default?: boolean
          movement_prep?: string | null
          name: string
          safety_notes?: string | null
          scaling_options?: string | null
          updated_at?: string
          updated_by?: string | null
          warmup?: string | null
        }
        Update: {
          class_type?: string | null
          coach_cues?: string | null
          created_at?: string
          created_by?: string | null
          default_wod_template_id?: string | null
          facility_id?: string
          finish_notes?: string | null
          id?: string
          is_default?: boolean
          movement_prep?: string | null
          name?: string
          safety_notes?: string | null
          scaling_options?: string | null
          updated_at?: string
          updated_by?: string | null
          warmup?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_runbook_templates_default_wod_template_id_fkey"
            columns: ["default_wod_template_id"]
            isOneToOne: false
            referencedRelation: "wod_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_runbook_templates_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_followups: {
        Row: {
          coach_id: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          followup_type: string
          id: string
          member_id: string
          note: string | null
          priority: string
          session_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          coach_id: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          followup_type: string
          id?: string
          member_id: string
          note?: string | null
          priority?: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          coach_id?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          followup_type?: string
          id?: string
          member_id?: string
          note?: string | null
          priority?: string
          session_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_followups_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_followups_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_followups_session_id_fkey"
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
          base_salary: number
          bio: string | null
          created_at: string
          email: string | null
          facility_id: string | null
          id: string
          linked_at: string | null
          linked_by: string | null
          name: string
          phone: string | null
          profile_image_url: string | null
          session_allowance: number
          specialties: string[] | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_salary?: number
          bio?: string | null
          created_at?: string
          email?: string | null
          facility_id?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          name: string
          phone?: string | null
          profile_image_url?: string | null
          session_allowance?: number
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_salary?: number
          bio?: string | null
          created_at?: string
          email?: string | null
          facility_id?: string | null
          id?: string
          linked_at?: string | null
          linked_by?: string | null
          name?: string
          phone?: string | null
          profile_image_url?: string | null
          session_allowance?: number
          specialties?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coaches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          booking_policy: Json
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          operating_hours: Json | null
          phone: string | null
          photos: string[] | null
          privacy_policy: string | null
          refund_policy: string | null
          terms_of_service: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          booking_policy?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          operating_hours?: Json | null
          phone?: string | null
          photos?: string[] | null
          privacy_policy?: string | null
          refund_policy?: string | null
          terms_of_service?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          booking_policy?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          operating_hours?: Json | null
          phone?: string | null
          photos?: string[] | null
          privacy_policy?: string | null
          refund_policy?: string | null
          terms_of_service?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      kiosk_devices: {
        Row: {
          created_at: string
          device_ip: string | null
          device_name: string
          display_message: string | null
          facility_id: string | null
          id: string
          last_heartbeat: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_ip?: string | null
          device_name: string
          display_message?: string | null
          facility_id?: string | null
          id?: string
          last_heartbeat?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_ip?: string | null
          device_name?: string
          display_message?: string | null
          facility_id?: string | null
          id?: string
          last_heartbeat?: string | null
          status?: string
          updated_at?: string
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
          assigned_end_date: string | null
          assigned_member_id: string | null
          assigned_start_date: string | null
          created_at: string
          facility_id: string
          id: string
          locker_number: string
          memo: string | null
          monthly_fee: number
          size: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_end_date?: string | null
          assigned_member_id?: string | null
          assigned_start_date?: string | null
          created_at?: string
          facility_id: string
          id?: string
          locker_number: string
          memo?: string | null
          monthly_fee?: number
          size?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_end_date?: string | null
          assigned_member_id?: string | null
          assigned_start_date?: string | null
          created_at?: string
          facility_id?: string
          id?: string
          locker_number?: string
          memo?: string | null
          monthly_fee?: number
          size?: string
          status?: string
          updated_at?: string
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
      member_agreements: {
        Row: {
          created_at: string
          doc_type: string
          doc_version: string
          id: string
          ip_address: unknown
          member_id: string
          signature: string
          signed_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          doc_version: string
          id?: string
          ip_address?: unknown
          member_id: string
          signature: string
          signed_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          doc_version?: string
          id?: string
          ip_address?: unknown
          member_id?: string
          signature?: string
          signed_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_agreements_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_alert_flags: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          flag_type: string
          id: string
          member_id: string
          note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          flag_type: string
          id?: string
          member_id: string
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          starts_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          flag_type?: string
          id?: string
          member_id?: string
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_alert_flags_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_benchmark_results: {
        Row: {
          benchmark_id: string
          created_at: string
          id: string
          is_pr: boolean
          member_id: string
          race_event_id: string | null
          recorded_at: string
          recorded_by: string | null
          result_meta: Json
          result_value: number
          rx_status: string
          session_id: string | null
        }
        Insert: {
          benchmark_id: string
          created_at?: string
          id?: string
          is_pr?: boolean
          member_id: string
          race_event_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          result_meta?: Json
          result_value: number
          rx_status?: string
          session_id?: string | null
        }
        Update: {
          benchmark_id?: string
          created_at?: string
          id?: string
          is_pr?: boolean
          member_id?: string
          race_event_id?: string | null
          recorded_at?: string
          recorded_by?: string | null
          result_meta?: Json
          result_value?: number
          rx_status?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_benchmark_results_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "benchmark_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_benchmark_results_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_benchmark_results_race_event_id_fkey"
            columns: ["race_event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_benchmark_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notes: {
        Row: {
          author_id: string | null
          author_role: string
          content: string
          created_at: string
          id: string
          member_id: string
          note_type: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          author_role?: string
          content: string
          created_at?: string
          id?: string
          member_id: string
          note_type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          note_type?: string
          updated_at?: string
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
          avatar_url: string | null
          birthday: string | null
          blacklist_reason: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          facility_id: string | null
          gender: string | null
          id: string
          is_blacklisted: boolean
          medical_notes: string | null
          name: string
          phone: string | null
          preferences: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          birthday?: string | null
          blacklist_reason?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          facility_id?: string | null
          gender?: string | null
          id?: string
          is_blacklisted?: boolean
          medical_notes?: string | null
          name: string
          phone?: string | null
          preferences?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          birthday?: string | null
          blacklist_reason?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          facility_id?: string | null
          gender?: string | null
          id?: string
          is_blacklisted?: boolean
          medical_notes?: string | null
          name?: string
          phone?: string | null
          preferences?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_history: {
        Row: {
          action_type: string
          changed_by: string | null
          created_at: string
          id: string
          membership_id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
        }
        Insert: {
          action_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          membership_id: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
        }
        Update: {
          action_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          membership_id?: string
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
          created_at: string
          credit_count: number | null
          description: string | null
          discount_price: number | null
          duration_days: number | null
          facility_id: string | null
          facility_sharing: boolean
          id: string
          is_active: boolean
          max_pauses: number
          name: string
          plan_kind: string
          price: number
          refund_policy: Json
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_count?: number | null
          description?: string | null
          discount_price?: number | null
          duration_days?: number | null
          facility_id?: string | null
          facility_sharing?: boolean
          id?: string
          is_active?: boolean
          max_pauses?: number
          name: string
          plan_kind?: string
          price: number
          refund_policy?: Json
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_count?: number | null
          description?: string | null
          discount_price?: number | null
          duration_days?: number | null
          facility_id?: string | null
          facility_sharing?: boolean
          id?: string
          is_active?: boolean
          max_pauses?: number
          name?: string
          plan_kind?: string
          price?: number
          refund_policy?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          member_id: string
          pause_count: number
          pause_reason: string | null
          paused_at: string | null
          plan_id: string | null
          remaining_credits: number | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          member_id: string
          pause_count?: number
          pause_reason?: string | null
          paused_at?: string | null
          plan_id?: string | null
          remaining_credits?: number | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          member_id?: string
          pause_count?: number
          pause_reason?: string | null
          paused_at?: string | null
          plan_id?: string | null
          remaining_credits?: number | null
          start_date?: string
          status?: string
          updated_at?: string
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
      movement_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_ko: string
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_ko: string
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_ko?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      movement_library: {
        Row: {
          category: string
          coaching_points: string | null
          created_at: string
          difficulty_level: number
          equipment: string[] | null
          id: string
          is_active: boolean
          name_en: string
          name_ko: string
          primary_muscles: string[] | null
          slug: string
          source_tag: string | null
          thumbnail_url: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          coaching_points?: string | null
          created_at?: string
          difficulty_level?: number
          equipment?: string[] | null
          id?: string
          is_active?: boolean
          name_en: string
          name_ko: string
          primary_muscles?: string[] | null
          slug: string
          source_tag?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          coaching_points?: string | null
          created_at?: string
          difficulty_level?: number
          equipment?: string[] | null
          id?: string
          is_active?: boolean
          name_en?: string
          name_ko?: string
          primary_muscles?: string[] | null
          slug?: string
          source_tag?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movement_library_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "movement_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      notices: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          facility_id: string | null
          id: string
          is_pinned: boolean
          is_published: boolean
          priority: string
          published_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          priority?: string
          published_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean
          priority?: string
          published_at?: string | null
          title?: string
          updated_at?: string
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
          created_at: string
          error_message: string | null
          id: string
          notification_id: string | null
          read_at: string | null
          rule_id: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          read_at?: string | null
          rule_id?: string | null
          sent_at?: string | null
          status?: string
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
          celebrate_opt_in: boolean
          checkin: boolean
          class_reminder: boolean
          created_at: string
          email_enabled: boolean
          id: string
          kakao_enabled: boolean
          membership_expiry: boolean
          promotion: boolean
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean
          system_notification: boolean
          updated_at: string
          user_id: string
          waitlist_vacancy: boolean
        }
        Insert: {
          celebrate_opt_in?: boolean
          checkin?: boolean
          class_reminder?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          kakao_enabled?: boolean
          membership_expiry?: boolean
          promotion?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          system_notification?: boolean
          updated_at?: string
          user_id: string
          waitlist_vacancy?: boolean
        }
        Update: {
          celebrate_opt_in?: boolean
          checkin?: boolean
          class_reminder?: boolean
          created_at?: string
          email_enabled?: boolean
          id?: string
          kakao_enabled?: boolean
          membership_expiry?: boolean
          promotion?: boolean
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean
          system_notification?: boolean
          updated_at?: string
          user_id?: string
          waitlist_vacancy?: boolean
        }
        Relationships: []
      }
      notification_rules: {
        Row: {
          category: string
          channels: string[]
          created_at: string
          description: string | null
          facility_id: string | null
          id: string
          is_active: boolean
          message_template: string
          name: string
          title_template: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          category: string
          channels?: string[]
          created_at?: string
          description?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          message_template: string
          name: string
          title_template: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          category?: string
          channels?: string[]
          created_at?: string
          description?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          message_template?: string
          name?: string
          title_template?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
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
          action_url: string | null
          category: string
          channel: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          member_id: string | null
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string
          channel?: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          member_id?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string
          channel?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          member_id?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
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
      pg_settings: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          is_active: boolean
          live_client_key: string | null
          live_secret_key_encrypted: string | null
          payment_mode: string
          pos_api_key_encrypted: string | null
          provider: string
          test_client_key: string | null
          test_secret_key_encrypted: string | null
          updated_at: string
          webhook_secret_encrypted: string | null
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          is_active?: boolean
          live_client_key?: string | null
          live_secret_key_encrypted?: string | null
          payment_mode?: string
          pos_api_key_encrypted?: string | null
          provider?: string
          test_client_key?: string | null
          test_secret_key_encrypted?: string | null
          updated_at?: string
          webhook_secret_encrypted?: string | null
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          is_active?: boolean
          live_client_key?: string | null
          live_secret_key_encrypted?: string | null
          payment_mode?: string
          pos_api_key_encrypted?: string | null
          provider?: string
          test_client_key?: string | null
          test_secret_key_encrypted?: string | null
          updated_at?: string
          webhook_secret_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pg_settings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      pm5_devices: {
        Row: {
          ble_name: string | null
          created_at: string
          current_mode: string
          device_type: string
          facility_id: string | null
          firmware_version: string | null
          id: string
          last_sync_at: string | null
          mac_address: string | null
          qr_identifier: string | null
          serial_number: string
          status: string
          updated_at: string
        }
        Insert: {
          ble_name?: string | null
          created_at?: string
          current_mode?: string
          device_type?: string
          facility_id?: string | null
          firmware_version?: string | null
          id?: string
          last_sync_at?: string | null
          mac_address?: string | null
          qr_identifier?: string | null
          serial_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          ble_name?: string | null
          created_at?: string
          current_mode?: string
          device_type?: string
          facility_id?: string | null
          firmware_version?: string | null
          id?: string
          last_sync_at?: string | null
          mac_address?: string | null
          qr_identifier?: string | null
          serial_number?: string
          status?: string
          updated_at?: string
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
          approved_at: string | null
          approved_by: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          rejected_reason: string | null
          role: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          rejected_reason?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          rejected_reason?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          device_type: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_used_at: string | null
          p256dh_key: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          device_type?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          device_type?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          p256dh_key?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string | null
          facility_id: string | null
          id: string
          is_active: boolean
          qr_type: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          qr_type: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string | null
          facility_id?: string | null
          id?: string
          is_active?: boolean
          qr_type?: string
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
          carryover_m: number
          coach_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          event_date: string
          event_type: string
          facility_id: string | null
          group_target_m: number | null
          heat_no: number
          id: string
          lobby_status: string
          name: string
          parent_event_id: string | null
          race_format: string
          session_id: string | null
          status: string
          target_distance_m: number | null
          updated_at: string
        }
        Insert: {
          carryover_m?: number
          coach_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_type?: string
          facility_id?: string | null
          group_target_m?: number | null
          heat_no?: number
          id?: string
          lobby_status?: string
          name: string
          parent_event_id?: string | null
          race_format?: string
          session_id?: string | null
          status?: string
          target_distance_m?: number | null
          updated_at?: string
        }
        Update: {
          carryover_m?: number
          coach_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_type?: string
          facility_id?: string | null
          group_target_m?: number | null
          heat_no?: number
          id?: string
          lobby_status?: string
          name?: string
          parent_event_id?: string | null
          race_format?: string
          session_id?: string | null
          status?: string
          target_distance_m?: number | null
          updated_at?: string
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
            foreignKeyName: "race_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
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
          calories_burned: number
          connection_status: string
          device_id: string
          distance_m: number
          event_id: string
          hr_bpm: number | null
          id: string
          lane_number: number
          last_updated_at: string
          max_watts: number
          member_id: string | null
          power_w: number
          stroke_rate_spm: number
          team_id: string | null
        }
        Insert: {
          calories_burned?: number
          connection_status?: string
          device_id: string
          distance_m?: number
          event_id: string
          hr_bpm?: number | null
          id?: string
          lane_number: number
          last_updated_at?: string
          max_watts?: number
          member_id?: string | null
          power_w?: number
          stroke_rate_spm?: number
          team_id?: string | null
        }
        Update: {
          calories_burned?: number
          connection_status?: string
          device_id?: string
          distance_m?: number
          event_id?: string
          hr_bpm?: number | null
          id?: string
          lane_number?: number
          last_updated_at?: string
          max_watts?: number
          member_id?: string | null
          power_w?: number
          stroke_rate_spm?: number
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
          created_at: string
          device_id: string | null
          device_serial: string
          duration_seconds: number | null
          event_id: string | null
          facility_id: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          recorded_at: string
          recorded_by: string | null
          total_data_points: number | null
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          device_serial: string
          duration_seconds?: number | null
          event_id?: string | null
          facility_id?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          recorded_at?: string
          recorded_by?: string | null
          total_data_points?: number | null
        }
        Update: {
          created_at?: string
          device_id?: string | null
          device_serial?: string
          duration_seconds?: number | null
          event_id?: string | null
          facility_id?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          recorded_at?: string
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
          created_at: string
          device_serial: string | null
          event_id: string | null
          finish_rank: number | null
          id: string
          is_pr: boolean
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
          created_at?: string
          device_serial?: string | null
          event_id?: string | null
          finish_rank?: number | null
          id?: string
          is_pr?: boolean
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
          created_at?: string
          device_serial?: string | null
          event_id?: string | null
          finish_rank?: number | null
          id?: string
          is_pr?: boolean
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
          created_at: string
          event_id: string
          id: string
          team_color: string
          team_name: string
          total_distance_m: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          team_color?: string
          team_name: string
          total_distance_m?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          team_color?: string
          team_name?: string
          total_distance_m?: number
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
          created_at: string
          id: string
          penalty_amount: number
          processed_by: string | null
          reason: string
          refund_method: string | null
          status: string
          toss_cancel_key: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          penalty_amount?: number
          processed_by?: string | null
          reason: string
          refund_method?: string | null
          status?: string
          toss_cancel_key?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          penalty_amount?: number
          processed_by?: string | null
          reason?: string
          refund_method?: string | null
          status?: string
          toss_cancel_key?: string | null
          transaction_id?: string
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
          created_at: string
          display_order: number
          id: string
          session_id: string
        }
        Insert: {
          assignment_role?: string
          coach_id: string
          created_at?: string
          display_order?: number
          id?: string
          session_id: string
        }
        Update: {
          assignment_role?: string
          coach_id?: string
          created_at?: string
          display_order?: number
          id?: string
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
          created_at: string
          id: string
          member_id: string | null
          rating: number
          responded_at: string | null
          responded_by: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          coach_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          rating: number
          responded_at?: string | null
          responded_by?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          coach_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          rating?: number
          responded_at?: string | null
          responded_by?: string | null
          session_id?: string
          updated_at?: string
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
      session_rotation_states: {
        Row: {
          current_round: number
          facility_id: string
          is_running: boolean
          paused_remaining_seconds: number | null
          seconds_per_round: number
          session_id: string
          team_assignments: Json
          timer_started_at: string | null
          total_rounds: number
          updated_at: string
        }
        Insert: {
          current_round?: number
          facility_id: string
          is_running?: boolean
          paused_remaining_seconds?: number | null
          seconds_per_round?: number
          session_id: string
          team_assignments?: Json
          timer_started_at?: string | null
          total_rounds?: number
          updated_at?: string
        }
        Update: {
          current_round?: number
          facility_id?: string
          is_running?: boolean
          paused_remaining_seconds?: number | null
          seconds_per_round?: number
          session_id?: string
          team_assignments?: Json
          timer_started_at?: string | null
          total_rounds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_rotation_states_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_rotation_states_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_runbooks: {
        Row: {
          created_at: string
          cue_override: string | null
          finish_note_override: string | null
          id: string
          movement_prep_override: string | null
          published_at: string | null
          safety_override: string | null
          scaling_override: string | null
          session_id: string
          session_wod_id: string | null
          template_id: string | null
          updated_at: string
          updated_by: string | null
          warmup_override: string | null
        }
        Insert: {
          created_at?: string
          cue_override?: string | null
          finish_note_override?: string | null
          id?: string
          movement_prep_override?: string | null
          published_at?: string | null
          safety_override?: string | null
          scaling_override?: string | null
          session_id: string
          session_wod_id?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warmup_override?: string | null
        }
        Update: {
          created_at?: string
          cue_override?: string | null
          finish_note_override?: string | null
          id?: string
          movement_prep_override?: string | null
          published_at?: string | null
          safety_override?: string | null
          scaling_override?: string | null
          session_id?: string
          session_wod_id?: string | null
          template_id?: string | null
          updated_at?: string
          updated_by?: string | null
          warmup_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_runbooks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_runbooks_session_wod_id_fkey"
            columns: ["session_wod_id"]
            isOneToOne: false
            referencedRelation: "session_wods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_runbooks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "class_runbook_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      session_wod_results: {
        Row: {
          created_at: string
          id: string
          member_id: string
          note: string | null
          recorded_by: string | null
          rx_status: string
          score: number
          score_type: string
          session_wod_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          note?: string | null
          recorded_by?: string | null
          rx_status?: string
          score: number
          score_type: string
          session_wod_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          note?: string | null
          recorded_by?: string | null
          rx_status?: string
          score?: number
          score_type?: string
          session_wod_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_wod_results_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_wod_results_session_wod_id_fkey"
            columns: ["session_wod_id"]
            isOneToOne: false
            referencedRelation: "session_wods"
            referencedColumns: ["id"]
          },
        ]
      }
      session_wods: {
        Row: {
          class_display_notes: string | null
          coach_notes: string | null
          created_at: string
          description_override: string | null
          edited_by: string | null
          format_override: string | null
          id: string
          movements_snapshot: Json
          publish_state: string
          published_at: string | null
          published_by: string | null
          session_id: string
          source_version: number
          template_id: string | null
          time_cap_override: number | null
          title_override: string | null
          updated_at: string
        }
        Insert: {
          class_display_notes?: string | null
          coach_notes?: string | null
          created_at?: string
          description_override?: string | null
          edited_by?: string | null
          format_override?: string | null
          id?: string
          movements_snapshot?: Json
          publish_state?: string
          published_at?: string | null
          published_by?: string | null
          session_id: string
          source_version?: number
          template_id?: string | null
          time_cap_override?: number | null
          title_override?: string | null
          updated_at?: string
        }
        Update: {
          class_display_notes?: string | null
          coach_notes?: string | null
          created_at?: string
          description_override?: string | null
          edited_by?: string | null
          format_override?: string | null
          id?: string
          movements_snapshot?: Json
          publish_state?: string
          published_at?: string | null
          published_by?: string | null
          session_id?: string
          source_version?: number
          template_id?: string | null
          time_cap_override?: number | null
          title_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_wods_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_wods_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "wod_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number
          class_type: string | null
          created_at: string
          description: string | null
          end_time: string
          facility_id: string
          id: string
          intensity_level: string | null
          session_date: string
          session_type: string
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          class_type?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          facility_id: string
          id?: string
          intensity_level?: string | null
          session_date: string
          session_type?: string
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          class_type?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          facility_id?: string
          id?: string
          intensity_level?: string | null
          session_date?: string
          session_type?: string
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
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
          category: string
          content: string
          created_at: string
          id: string
          member_id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          content: string
          created_at?: string
          id?: string
          member_id: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
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
          config_value: Json
          created_at: string
          description: string | null
          id: string
          is_secret: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          config_key: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_secret?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          cancel_amount: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          cash_receipt_approval_no: string | null
          cash_receipt_status: string
          category: string
          created_at: string
          facility_id: string | null
          id: string
          member_id: string | null
          membership_id: string | null
          order_id: string | null
          payment_key: string | null
          payment_method: string | null
          plan_id: string | null
          receipt_url: string | null
          source: string
          status: string
          toss_raw_data: Json
          toss_status: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancel_amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cash_receipt_approval_no?: string | null
          cash_receipt_status?: string
          category?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          member_id?: string | null
          membership_id?: string | null
          order_id?: string | null
          payment_key?: string | null
          payment_method?: string | null
          plan_id?: string | null
          receipt_url?: string | null
          source?: string
          status?: string
          toss_raw_data?: Json
          toss_status?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancel_amount?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cash_receipt_approval_no?: string | null
          cash_receipt_status?: string
          category?: string
          created_at?: string
          facility_id?: string | null
          id?: string
          member_id?: string | null
          membership_id?: string | null
          order_id?: string | null
          payment_key?: string | null
          payment_method?: string | null
          plan_id?: string | null
          receipt_url?: string | null
          source?: string
          status?: string
          toss_raw_data?: Json
          toss_status?: string | null
          transaction_type?: string
          updated_at?: string
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
            foreignKeyName: "transactions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
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
      widget_settings: {
        Row: {
          config: Json
          created_at: string
          facility_id: string | null
          id: string
          is_enabled: boolean
          sort_order: number
          title: string | null
          updated_at: string
          updated_by: string | null
          widget_key: string
        }
        Insert: {
          config?: Json
          created_at?: string
          facility_id?: string | null
          id?: string
          is_enabled?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          widget_key: string
        }
        Update: {
          config?: Json
          created_at?: string
          facility_id?: string | null
          id?: string
          is_enabled?: boolean
          sort_order?: number
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          widget_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_settings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      wod_template_movements: {
        Row: {
          created_at: string
          custom_label: string | null
          distance_meters: number | null
          duration_seconds: number | null
          id: string
          load_female_rx: string | null
          load_male_rx: string | null
          movement_id: string | null
          rx_notes: string | null
          scaling_notes: string | null
          sort_order: number
          target_unit: string | null
          target_value: number | null
          wod_template_id: string
        }
        Insert: {
          created_at?: string
          custom_label?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          load_female_rx?: string | null
          load_male_rx?: string | null
          movement_id?: string | null
          rx_notes?: string | null
          scaling_notes?: string | null
          sort_order?: number
          target_unit?: string | null
          target_value?: number | null
          wod_template_id: string
        }
        Update: {
          created_at?: string
          custom_label?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          id?: string
          load_female_rx?: string | null
          load_male_rx?: string | null
          movement_id?: string | null
          rx_notes?: string | null
          scaling_notes?: string | null
          sort_order?: number
          target_unit?: string | null
          target_value?: number | null
          wod_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wod_template_movements_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movement_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wod_template_movements_wod_template_id_fkey"
            columns: ["wod_template_id"]
            isOneToOne: false
            referencedRelation: "wod_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      wod_templates: {
        Row: {
          coach_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          facility_id: string | null
          format_type: string | null
          id: string
          is_benchmark: boolean
          is_shared: boolean
          public_notes: string | null
          published_at: string | null
          rounds: number | null
          template_kind: string
          time_cap_minutes: number | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          format_type?: string | null
          id?: string
          is_benchmark?: boolean
          is_shared?: boolean
          public_notes?: string | null
          published_at?: string | null
          rounds?: number | null
          template_kind?: string
          time_cap_minutes?: number | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          facility_id?: string | null
          format_type?: string | null
          id?: string
          is_benchmark?: boolean
          is_shared?: boolean
          public_notes?: string | null
          published_at?: string | null
          rounds?: number | null
          template_kind?: string
          time_cap_minutes?: number | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wod_templates_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_coach_can_edit_session: {
        Args: { p_session_id: string }
        Returns: string
      }
      _assert_coach_or_admin: { Args: never; Returns: string }
      _notify_edge_config: {
        Args: never
        Returns: {
          base_url: string
          service_key: string
        }[]
      }
      current_member_id: { Args: never; Returns: string }
      demote_from_coach: { Args: { p_target_user_id: string }; Returns: Json }
      fn_book_with_credit: { Args: { p_session_id: string }; Returns: Json }
      fn_calculate_monthly_settlement: {
        Args: { p_year_month: string }
        Returns: Json
      }
      fn_calculate_refund: {
        Args: { p_membership_id: string; p_transaction_id: string }
        Returns: Json
      }
      fn_cancel_booking_with_credit: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: Json
      }
      fn_complete_followup: {
        Args: { p_followup_id: string; p_status?: string }
        Returns: Json
      }
      fn_create_followup: { Args: { p_payload: Json }; Returns: Json }
      fn_evaluate_badges: {
        Args: { p_member_id: string; p_trigger?: string }
        Returns: Json
      }
      fn_get_class_display_wod: {
        Args: { p_date?: string; p_facility_id?: string; p_session_id?: string }
        Returns: Json
      }
      fn_get_class_leaderboard: {
        Args: { p_facility_id: string; p_scope?: string }
        Returns: Json
      }
      fn_get_class_live_board: {
        Args: { p_facility_id: string }
        Returns: Json
      }
      fn_get_class_screen_prs: {
        Args: { p_days?: number; p_facility_id: string }
        Returns: Json
      }
      fn_get_coach_monthly_report: {
        Args: { p_sections?: string[]; p_year_month?: string }
        Returns: Json
      }
      fn_get_coach_performance_stats: { Args: never; Returns: Json }
      fn_get_coach_schedule: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      fn_get_coach_session_board: {
        Args: { p_session_id: string }
        Returns: Json
      }
      fn_get_dashboard_kpis: { Args: never; Returns: Json }
      fn_get_member_context_panel: {
        Args: { p_member_id: string }
        Returns: Json
      }
      fn_get_member_performance_profile: {
        Args: { p_member_id: string }
        Returns: Json
      }
      fn_get_my_badges: { Args: never; Returns: Json }
      fn_get_my_coach_context: { Args: never; Returns: Json }
      fn_get_my_coach_dashboard: { Args: never; Returns: Json }
      fn_get_my_followups: {
        Args: { p_limit?: number; p_member_id?: string; p_status?: string }
        Returns: Json
      }
      fn_get_my_wod_prep: { Args: { p_session_id: string }; Returns: Json }
      fn_get_revenue_stats: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      fn_get_session_runbook: { Args: { p_session_id: string }; Returns: Json }
      fn_get_session_wod: { Args: { p_session_id: string }; Returns: Json }
      fn_get_session_wod_whiteboard: {
        Args: { p_session_id: string }
        Returns: Json
      }
      fn_get_wod_template: { Args: { p_template_id: string }; Returns: Json }
      fn_kiosk_checkin: { Args: { p_payload: Json }; Returns: Json }
      fn_list_benchmark_definitions: {
        Args: { p_include_inactive?: boolean }
        Returns: Json
      }
      fn_list_movement_library: {
        Args: {
          p_category?: string
          p_is_active?: boolean
          p_limit?: number
          p_offset?: number
          p_query?: string
        }
        Returns: Json
      }
      fn_list_runbook_templates: {
        Args: { p_class_type?: string; p_facility_id?: string }
        Returns: Json
      }
      fn_list_wod_templates: {
        Args: {
          p_facility_id?: string
          p_scope?: string
          p_template_kind?: string
        }
        Returns: Json
      }
      fn_mark_attendance: {
        Args: { p_items: Json; p_session_id: string }
        Returns: Json
      }
      fn_my_permissions: { Args: never; Returns: Json }
      fn_prepare_race_session: {
        Args: { p_options?: Json; p_race_format?: string; p_session_id: string }
        Returns: Json
      }
      fn_publish_session_wod: { Args: { p_session_id: string }; Returns: Json }
      fn_publish_wod_template: {
        Args: { p_template_id: string }
        Returns: Json
      }
      fn_record_member_benchmark_result: {
        Args: {
          p_benchmark_id: string
          p_member_id: string
          p_race_event_id?: string
          p_result_meta?: Json
          p_result_value: number
          p_rx_status?: string
          p_session_id?: string
        }
        Returns: Json
      }
      fn_record_session_wod_result: {
        Args: {
          p_note?: string
          p_rx_status?: string
          p_score: number
          p_score_type: string
          p_session_id: string
        }
        Returns: Json
      }
      fn_search_wod_movements: {
        Args: {
          p_category?: string
          p_equipment?: string
          p_limit?: number
          p_query?: string
        }
        Returns: Json
      }
      fn_send_class_reminders: { Args: never; Returns: undefined }
      fn_send_membership_expiry_reminders: { Args: never; Returns: undefined }
      fn_sign_agreement: {
        Args: { p_doc_type: string; p_doc_version: string; p_signature: string }
        Returns: Json
      }
      fn_upsert_member_alert_flag: {
        Args: { p_member_id: string; p_payload: Json }
        Returns: Json
      }
      fn_upsert_runbook_template: { Args: { p_payload: Json }; Returns: Json }
      fn_upsert_session_runbook: {
        Args: { p_payload: Json; p_session_id: string }
        Returns: Json
      }
      fn_upsert_session_wod: {
        Args: { p_payload: Json; p_session_id: string }
        Returns: Json
      }
      fn_upsert_wod_template: { Args: { p_payload: Json }; Returns: Json }
      get_decrypted_pg_settings: {
        Args: { p_encryption_key: string; p_facility_id: string }
        Returns: {
          live_secret_key: string
          payment_mode: string
          test_secret_key: string
          webhook_secret: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_coach: { Args: never; Returns: boolean }
      promote_to_coach: { Args: { p_target_user_id: string }; Returns: Json }
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
