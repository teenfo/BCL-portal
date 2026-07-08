// /admin/feedback 공용 타입 (02-admin §3.12)

export interface FeedbackRow {
  id: string;
  session_id: string;
  member_id: string | null;
  coach_id: string | null;
  rating: number;
  comment: string | null;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
  members: { name: string } | null;
  coaches: { name: string } | null;
  sessions: { title: string; session_date: string } | null;
}

export const LOW_RATING_MAX = 2; // 저평점 기준(≤2)
