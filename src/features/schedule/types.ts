// 스케줄 도메인 타입 — sessions/session_coaches/bookings 스키마 반영 (docs/sql/03_sessions_bookings.sql)
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled';
export type AttendanceOutcome =
  | 'pending'
  | 'checked_in'
  | 'no_show'
  | 'late_cancel'
  | 'coach_excused'
  | 'walk_in';
export type AssignmentRole = 'lead' | 'assistant';

export interface SessionCoachLink {
  coach_id: string;
  assignment_role: AssignmentRole;
  display_order: number;
  coaches: { name: string } | null;
}

export interface ScheduleSession {
  id: string;
  facility_id: string;
  title: string;
  session_date: string; // yyyy-mm-dd
  start_time: string; // HH:MM:SS
  end_time: string;
  capacity: number;
  status: SessionStatus;
  session_coaches: SessionCoachLink[];
}

export interface BookingCountRow {
  session_id: string;
  status: BookingStatus;
}

export interface CoachOption {
  id: string;
  name: string;
  status: string;
}

export interface RosterBooking {
  id: string;
  member_id: string;
  status: BookingStatus;
  attendance_outcome: AttendanceOutcome;
  credit_used: boolean;
  created_at: string;
  members: { name: string } | null;
}

/** facilities.booking_policy — G-4/G-5 단일 소스 (하드코딩 금지, 조회 표시 전용) */
export interface BookingPolicy {
  booking_open_days?: number;
  cancel_deadline_hours?: number;
  weekly_booking_cap?: number | null;
  noshow_penalty?: {
    credit_forfeit?: boolean;
    monthly_threshold?: number;
    restrict_days?: number;
  };
}

/** fn_get_session_wod 반환 data (session_wods 스냅샷 또는 미배정 시 publish_state='none') */
export interface SessionWod {
  id?: string;
  session_id: string;
  template_id?: string | null;
  publish_state: 'none' | 'draft' | 'published' | 'archived';
  title_override?: string | null;
  format_override?: string | null;
  time_cap_override?: number | null;
  description_override?: string | null;
  movements_snapshot?: unknown[];
  coach_notes?: string | null;
  class_display_notes?: string | null;
  published_at?: string | null;
}

export interface MarkAttendanceResult {
  success_count: number;
  failure_count: number;
  results: { member_id: string; action: string; success: boolean; error: string | null }[];
}

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: '예정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소됨',
};

export const OUTCOME_LABEL: Record<AttendanceOutcome, string> = {
  pending: '미판정',
  checked_in: '출석',
  no_show: '노쇼',
  late_cancel: '지각취소',
  coach_excused: '인정결석',
  walk_in: '현장참여',
};

export const WOD_FORMAT_OPTIONS = [
  { value: 'for_time', label: 'For Time' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'emom', label: 'EMOM' },
  { value: 'tabata', label: 'Tabata' },
  { value: 'chipper', label: 'Chipper' },
  { value: 'strength', label: 'Strength' },
  { value: 'station_circuit', label: 'Station Circuit' },
  { value: 'custom', label: 'Custom' },
];
