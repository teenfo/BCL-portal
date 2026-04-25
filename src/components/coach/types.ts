export type CoachContextStatus =
    | 'unauthenticated'
    | 'unlinked'
    | 'linked_unassigned'
    | 'linked_active'
    | 'on_leave';

export interface CoachContext {
    status: CoachContextStatus;
    linked: boolean;
    coach_id?: string | null;
    coach_name?: string | null;
    has_assignments: boolean;
    assignment_count?: number;
}

export type AttendanceOutcome =
    | 'pending'
    | 'checked_in'
    | 'no_show'
    | 'late_cancel'
    | 'coach_excused'
    | 'walk_in';

export interface SessionBoardAttendee {
    booking_id: string;
    member_id: string;
    member_name: string;
    avatar_url: string | null;
    booking_status: string;
    booking_type: string | null;
    attendance_outcome: AttendanceOutcome;
    attendance_marked_at: string | null;
    checked_in: boolean;
    checkin_time: string | null;
}

export interface SessionBoardCoach {
    coach_id: string;
    coach_name: string;
    profile_image_url: string | null;
    assignment_role: 'lead' | 'assistant';
    display_order: number;
}

export interface SessionBoardSummary {
    confirmed: number;
    waitlisted: number;
    checked_in: number;
    no_show: number;
    late_cancel: number;
    coach_excused: number;
    pending: number;
}

export interface SessionBoardHeader {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    capacity: number;
    session_date: string;
    wod_description: string | null;
    status: string;
    facility_id: string | null;
    race_linked: boolean;
}

export interface SessionBoardData {
    session: SessionBoardHeader;
    coaches: SessionBoardCoach[];
    attendees: SessionBoardAttendee[];
    summary: SessionBoardSummary;
}
