export interface CoachRef {
  name: string | null;
  profile_image_url?: string | null;
}
export interface SessionCoachRow {
  coaches: CoachRef | null;
}
export interface SessionItem {
  id: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: string;
  session_coaches: SessionCoachRow[] | null;
}
export interface MyBookingItem {
  id: string;
  session_id: string;
  status: string;
  attendance_outcome: string;
  sessions: {
    title: string | null;
    session_date: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
}

// fn_book_with_credit / fn_cancel_booking_with_credit error 코드 → 한국어 안내
export const BOOKING_ERROR_KO: Record<string, string> = {
  member_not_found: '계정에 연결된 회원 정보가 없습니다.',
  session_not_found: '세션을 찾을 수 없습니다.',
  session_not_bookable: '예약할 수 없는 세션입니다.',
  booking_not_open: '아직 예약 오픈 전입니다.',
  weekly_cap_reached: '이번 주 예약 가능 횟수를 초과했습니다.',
  booking_restricted_noshow: '노쇼 페널티로 예약이 제한되어 있습니다.',
  already_booked: '이미 예약한 세션입니다.',
  booking_not_found: '예약을 찾을 수 없습니다.',
  already_cancelled: '이미 취소된 예약입니다.',
};
