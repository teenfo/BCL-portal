// Admin 락커 도메인 타입 — lockers 단일 테이블 (docs/sql/08_rbac_supplementary.sql)
// 🔄 locker_assignments·members.locker_number 폐지 — 배정=본 테이블 컬럼, 이력=audit_logs

export type LockerSize = 'S' | 'M' | 'L';
export type LockerStatus = 'available' | 'occupied' | 'maintenance' | 'disabled';

export interface Locker {
  id: string;
  facility_id: string;
  locker_number: string;
  size: LockerSize;
  monthly_fee: number;
  status: LockerStatus;
  assigned_member_id: string | null;
  assigned_start_date: string | null;
  assigned_end_date: string | null;
  memo: string | null;
  created_at: string;
  members: { name: string; phone: string | null } | null;
}

export const LOCKER_SIZE_LABEL: Record<LockerSize, string> = {
  S: '소',
  M: '중',
  L: '대',
};

export const LOCKER_STATUS_LABEL: Record<LockerStatus, string> = {
  available: '가용',
  occupied: '사용 중',
  maintenance: '점검',
  disabled: '비활성',
};

export function writeError(code: string | null): string {
  if (!code) return '요청에 실패했습니다.';
  if (/duplicate|unique/i.test(code)) return '이미 존재하는 락커 번호입니다.';
  if (/chk_locker_assignment|check constraint/i.test(code)) return '배정 상태와 회원 정보가 일치하지 않습니다.';
  if (/row-level security|permission|policy/i.test(code)) return '권한이 없습니다.';
  return code;
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

/** 종료일 기준 D-Day (양수=남은 일수). null이면 null */
export function daysUntil(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  const a = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86_400_000);
}
