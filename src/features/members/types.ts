// Admin 회원 도메인 타입 — members/memberships/membership_history 스키마 반영
// (docs/sql/01_core.sql · 02_membership_finance.sql · 04_wod_runbook.sql)

export type MemberStatus = 'active' | 'inactive' | 'suspended';
export type MembershipStatus = 'active' | 'paused' | 'expired' | 'cancelled';
export type PlanType = 'period' | 'count';

/** 목록 join용 경량 멤버십 */
export interface MembershipLite {
  id: string;
  status: MembershipStatus;
  start_date: string;
  end_date: string | null;
  remaining_credits: number | null;
  plan_id: string | null;
}

/** 목록 행 (members + memberships 임베드) */
export interface MemberRow {
  id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: MemberStatus;
  is_blacklisted: boolean;
  created_at: string;
  memberships: MembershipLite[];
}

/** 상세 프로필 전체 컬럼 */
export interface MemberDetail {
  id: string;
  user_id: string | null;
  facility_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  gender: 'male' | 'female' | 'other' | null;
  emergency_contact: string | null;
  medical_notes: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  status: MemberStatus;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  created_at: string;
}

export interface MembershipPlanLite {
  name: string;
  type: PlanType;
  max_pauses: number;
  duration_days: number | null;
  credit_count: number | null;
}

/** 상세 멤버십 (membership_plans join) */
export interface Membership {
  id: string;
  member_id: string;
  plan_id: string | null;
  start_date: string;
  end_date: string | null;
  remaining_credits: number | null;
  status: MembershipStatus;
  pause_count: number;
  paused_at: string | null;
  pause_reason: string | null;
  created_at: string;
  membership_plans: MembershipPlanLite | null;
}

export interface MembershipHistoryRow {
  id: string;
  membership_id: string;
  action_type: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export type AlertFlagType =
  | 'trial'
  | 'injury'
  | 'renewal_due'
  | 'returning_after_absence'
  | 'vip_attention';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface MemberAlertFlag {
  id: string;
  member_id: string;
  flag_type: AlertFlagType;
  severity: AlertSeverity;
  starts_at: string;
  ends_at: string | null;
  note: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface MemberNote {
  id: string;
  member_id: string;
  author_id: string | null;
  author_role: 'admin' | 'coach';
  note_type: 'general' | 'injury' | 'progress' | 'caution' | 'counseling';
  content: string;
  created_at: string;
}

export interface PendingProfile {
  id: string; // = auth user_id
  email: string | null;
  name: string | null;
}

// ── 라벨 상수 ──────────────────────────────────────────────
export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: '활성',
  inactive: '비활성',
  suspended: '정지',
};

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  active: '활성',
  paused: '홀딩',
  expired: '만료',
  cancelled: '취소',
};

export const ALERT_FLAG_LABEL: Record<AlertFlagType, string> = {
  trial: '체험',
  injury: '부상',
  renewal_due: '갱신 임박',
  returning_after_absence: '복귀',
  vip_attention: 'VIP 주의',
};

export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: '정보',
  warning: '주의',
  critical: '중요',
};

export const NOTE_TYPE_LABEL: Record<MemberNote['note_type'], string> = {
  general: '일반',
  injury: '부상',
  progress: '진척',
  caution: '주의',
  counseling: '상담',
};

export const HISTORY_ACTION_LABEL: Record<string, string> = {
  created: '발급',
  extended: '연장',
  paused: '홀딩',
  resumed: '재개',
  credit_adjusted: '크레딧 조정',
  transferred: '양도',
  cancelled: '취소',
};

/** fn_admin_adjust_membership 서버 error 코드 → 한글 메시지 */
export const RPC_ERROR_LABEL: Record<string, string> = {
  forbidden: '권한이 없습니다.',
  reason_required: '사유를 입력하세요.',
  invalid_action: '잘못된 요청입니다.',
  membership_not_found: '멤버십을 찾을 수 없습니다.',
  member_not_found: '회원을 찾을 수 없습니다.',
  plan_not_found: '요금제를 찾을 수 없습니다.',
  target_member_not_found: '대상 회원을 찾을 수 없습니다.',
  max_pauses_exceeded: '홀딩 가능 횟수를 모두 사용했습니다.',
  negative_credits: '잔여 크레딧이 음수가 될 수 없습니다.',
  delta_required: '조정할 크레딧 수를 입력하세요.',
  nothing_to_extend: '연장할 기간 또는 크레딧을 입력하세요.',
  already_paused: '이미 홀딩 중입니다.',
  not_paused: '홀딩 상태가 아닙니다.',
  already_cancelled: '이미 취소된 멤버십입니다.',
  source_not_transferable: '양도할 수 없는 멤버십입니다 (활성/홀딩만 가능).',
  same_member: '동일 회원에게는 양도할 수 없습니다.',
  missing_required_fields: '필수 항목이 누락되었습니다.',
};

export function rpcError(code: string | null): string {
  if (!code) return '요청에 실패했습니다.';
  return RPC_ERROR_LABEL[code] ?? code;
}

// ── 공통 포맷 헬퍼 ─────────────────────────────────────────
export function fmtDate(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR');
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 종료일 기준 D-Day (양수=남은 일수, 음수=경과). null이면 null */
export function daysUntil(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  const a = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}

/** 여러 멤버십 중 대표(현재) 멤버십 선택: active > paused > 최신 end_date */
export function primaryMembership<T extends { status: MembershipStatus; end_date: string | null }>(
  list: T[],
): T | null {
  if (!list || list.length === 0) return null;
  const active = list.find((m) => m.status === 'active');
  if (active) return active;
  const paused = list.find((m) => m.status === 'paused');
  if (paused) return paused;
  return [...list].sort((a, b) => (b.end_date ?? '').localeCompare(a.end_date ?? ''))[0] ?? null;
}
