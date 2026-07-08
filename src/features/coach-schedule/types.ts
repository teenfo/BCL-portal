// 코치 스케줄/세션 보드 공용 타입 (fn_get_coach_schedule / fn_get_coach_session_board 반환 매핑)

export interface ScheduleSession {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  has_wod: boolean;
  booked_count: number;
  waitlist_count: number;
  checkin_count: number;
  no_show_count: number;
  late_cancel_count: number;
  race_linked: boolean;
}

export type AttendanceOutcome =
  | 'pending'
  | 'checked_in'
  | 'no_show'
  | 'late_cancel'
  | 'coach_excused'
  | 'walk_in';

export type MarkAction = 'checked_in' | 'no_show' | 'late_cancel' | 'coach_excused' | 'walk_in';

export interface ActiveFlag {
  flag_type: string;
  severity: string;
}

export interface BoardAttendee {
  booking_id: string;
  member_id: string;
  member_name: string;
  avatar_url: string | null;
  booking_status: 'confirmed' | 'waitlisted';
  booking_type: string | null;
  attendance_outcome: AttendanceOutcome;
  attendance_marked_at: string | null;
  checked_in: boolean;
  checkin_time: string | null;
  active_flags: ActiveFlag[];
}

export interface BoardCoach {
  coach_id: string;
  coach_name: string;
  profile_image_url: string | null;
  assignment_role: string;
  display_order: number;
}

export interface BoardHeader {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  facility_id: string | null;
  class_type: string | null;
  has_wod: boolean;
  race_linked: boolean;
}

export interface BoardSummary {
  confirmed: number;
  waitlisted: number;
  checked_in: number;
  no_show: number;
  late_cancel: number;
  coach_excused: number;
  walk_in: number;
  pending: number;
}

export interface SessionBoardData {
  session: BoardHeader;
  coaches: BoardCoach[];
  attendees: BoardAttendee[];
  summary: BoardSummary;
}

export const OUTCOME_LABEL: Record<AttendanceOutcome, string> = {
  pending: '대기중',
  checked_in: '체크인',
  no_show: '노쇼',
  late_cancel: '지각취소',
  coach_excused: '사유결석',
  walk_in: '현장등록',
};
