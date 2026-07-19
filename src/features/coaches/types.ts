// Admin 코치 도메인 타입 — coaches/profiles 스키마 반영 (docs/sql/01_core.sql)
// 코치 상태머신: unlinked(계정 미연결) → linked_unassigned/linked_active(연결) → on_leave(휴직)

export type CoachStatus = 'active' | 'inactive' | 'on_leave';

/** coaches 테이블 행 */
export interface CoachRow {
  id: string;
  user_id: string | null;
  facility_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  specialties: string[] | null;
  bio: string | null;
  base_salary: number;
  session_allowance: number;
  status: CoachStatus;
  linked_at: string | null;
  created_at: string;
}

/** 계정 연결 후보 (profiles) */
export interface LinkableProfile {
  id: string; // = auth user_id
  email: string | null;
  name: string | null;
}

/** fn_get_coach_performance_stats() 행 */
export interface CoachPerfStat {
  id: string;
  name: string;
  email: string | null;
  specialties: string[] | null;
  status: CoachStatus;
  total_sessions: number;
  avg_rating: number;
  total_members: number;
}

/**
 * 코치 표시 상태 — (user_id, status) 파생.
 * ⏳ linked_unassigned(연결됐으나 세션 미배정)는 세션 데이터 없이 구분 불가 → linked_active로 흡수.
 */
export type CoachDisplayState = 'unlinked' | 'linked_active' | 'on_leave' | 'inactive';

export function coachDisplayState(c: Pick<CoachRow, 'user_id' | 'status'>): CoachDisplayState {
  if (!c.user_id) return 'unlinked';
  if (c.status === 'on_leave') return 'on_leave';
  if (c.status === 'inactive') return 'inactive';
  return 'linked_active';
}

export const COACH_STATE_LABEL: Record<CoachDisplayState, string> = {
  unlinked: '계정 미연결',
  linked_active: '활동 중',
  on_leave: '휴직',
  inactive: '비활성',
};

export const COACH_STATE_BADGE: Record<CoachDisplayState, 'neutral' | 'success' | 'warning'> = {
  unlinked: 'neutral',
  linked_active: 'success',
  on_leave: 'warning',
  inactive: 'neutral',
};

/** promote_to_coach / demote_from_coach 서버 error 코드 → 한글 */
export const COACH_RPC_ERROR: Record<string, string> = {
  forbidden: '권한이 없습니다.',
  user_not_found: '사용자를 찾을 수 없습니다.',
  already_coach: '이미 코치로 연결된 계정입니다.',
  coach_not_found: '코치를 찾을 수 없습니다.',
};

export function coachRpcError(code: string | null): string {
  if (!code) return '요청에 실패했습니다.';
  return COACH_RPC_ERROR[code] ?? code;
}

export const krw = (n: number | null | undefined) =>
  `${Math.round(n ?? 0).toLocaleString('ko-KR')}원`;

export function parseSpecialties(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
