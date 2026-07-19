// Admin 설정 도메인 타입 (02-admin §3.14)
// facilities(+booking_policy) / pg_settings / system_config / kiosk_devices / qr_codes /
// admin_roles / admin_user_roles / audit_logs — docs/sql/01_core.sql · 02 · 08

export interface NoshowPenalty {
  credit_forfeit: boolean;
  monthly_threshold: number;
  restrict_days: number;
}

export interface BookingPolicy {
  booking_open_days: number;
  cancel_deadline_hours: number;
  weekly_booking_cap: number | null;
  noshow_penalty: NoshowPenalty;
}

export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  booking_open_days: 7,
  cancel_deadline_hours: 3,
  weekly_booking_cap: null,
  noshow_penalty: { credit_forfeit: true, monthly_threshold: 3, restrict_days: 7 },
};

export interface Facility {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  operating_hours: Record<string, unknown> | null;
  terms_of_service: string | null;
  privacy_policy: string | null;
  refund_policy: string | null;
  booking_policy: BookingPolicy | null;
  is_active: boolean;
}

export interface PgSettings {
  id: string;
  facility_id: string | null;
  provider: string;
  test_client_key: string | null;
  test_secret_key_encrypted: string | null;
  live_client_key: string | null;
  live_secret_key_encrypted: string | null;
  webhook_secret_encrypted: string | null;
  payment_mode: 'simulation' | 'live';
  is_active: boolean;
}

export interface KioskDevice {
  id: string;
  facility_id: string | null;
  device_name: string;
  device_ip: string | null;
  status: 'active' | 'offline' | 'maintenance';
  display_message: string | null;
  last_heartbeat: string | null;
}

export interface QrCode {
  id: string;
  facility_id: string | null;
  code: string;
  qr_type: 'facility' | 'session' | 'member';
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SystemConfigRow {
  id: string;
  config_key: string;
  config_value: unknown;
  category: string;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve';

export interface AdminRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  permissions: Record<string, string[]>;
  is_system_role: boolean;
}

export interface AdminUserRole {
  id: string;
  user_id: string;
  role_id: string;
  facility_id: string | null;
  assigned_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

// 권한 매트릭스 — 그룹(Admin 14화면 + audit) × 액션
export const PERMISSION_GROUPS: { key: string; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'members', label: '회원' },
  { key: 'attendance', label: '출석' },
  { key: 'payments', label: '결제' },
  { key: 'plans', label: '요금제' },
  { key: 'schedule', label: '스케줄' },
  { key: 'coaches', label: '코치' },
  { key: 'wod_studio', label: 'WOD 스튜디오' },
  { key: 'race', label: 'Race' },
  { key: 'lockers', label: '락커' },
  { key: 'badges', label: '배지' },
  { key: 'feedback', label: '피드백' },
  { key: 'crm', label: 'CRM' },
  { key: 'settings', label: '설정' },
  { key: 'audit', label: '감사' },
];

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view', label: '조회' },
  { key: 'create', label: '생성' },
  { key: 'edit', label: '수정' },
  { key: 'delete', label: '삭제' },
  { key: 'approve', label: '승인' },
];

export function isSuperAdminRole(role: Pick<AdminRole, 'permissions'>): boolean {
  return '*' in (role.permissions ?? {});
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

export function settingsError(code: string | null): string {
  if (!code) return '요청에 실패했습니다.';
  const map: Record<string, string> = {
    forbidden: '권한이 없습니다.',
    facility_not_found: '지점을 찾을 수 없습니다.',
  };
  return map[code] ?? code;
}
