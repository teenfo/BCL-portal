// Admin Race 도메인 타입 — race_events/pm5_devices/race_records/race_teams (docs/sql/05_race.sql)
// 명명: race-admin (향후 Class/Coach의 라이브 race 렌더와 구분 — 02-admin §3.9)

export type RaceEventType = 'rowing' | 'bike' | 'skierg' | 'run' | 'other';
export type RaceFormat = 'individual' | 'team' | 'group' | 'relay';
export type RaceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type LobbyStatus = 'setup' | 'lobby' | 'countdown' | 'racing' | 'finished';
/** 코스 레이아웃(표시 전용, 15 §5b) — 세로(측면)/가로(사선 탑뷰). 두 모드 기능 동등 유지 필수 */
export type CourseLayout = 'vertical' | 'horizontal';

export interface RaceEvent {
  id: string;
  facility_id: string | null;
  session_id: string | null;
  coach_id: string | null;
  name: string;
  event_date: string;
  event_type: RaceEventType;
  race_format: RaceFormat;
  target_distance_m: number | null;
  duration_minutes: number | null;
  group_target_m: number | null;
  heat_no: number;
  description: string | null;
  status: RaceStatus;
  lobby_status: LobbyStatus;
  course_layout: CourseLayout;
  created_at: string;
}

export type DeviceType = 'rower' | 'bike' | 'skierg' | 'treadmill' | 'other';
export type DeviceStatus = 'online' | 'offline' | 'maintenance';
export type DeviceMode = 'idle' | 'racing' | 'personal_recording';

export interface Pm5Device {
  id: string;
  facility_id: string | null;
  serial_number: string;
  mac_address: string | null;
  ble_name: string | null;
  qr_identifier: string | null;
  device_type: DeviceType;
  status: DeviceStatus;
  current_mode: DeviceMode;
  firmware_version: string | null;
  last_sync_at: string | null;
  created_at: string;
}

/** race_records + members(name) join (조회 위주) */
export interface RaceRecordRow {
  id: string;
  event_id: string | null;
  member_id: string | null;
  device_serial: string | null;
  lane_number: number | null;
  result_distance: number | null;
  calories_burned: number | null;
  avg_watts: number | null;
  max_watts: number | null;
  avg_spm: number | null;
  avg_hr_bpm: number | null;
  finish_rank: number | null;
  is_pr: boolean;
  created_at: string;
  members: { name: string } | null;
}

// ── 라벨 상수 ──────────────────────────────────────────────
export const EVENT_TYPE_LABEL: Record<RaceEventType, string> = {
  rowing: '로잉',
  bike: '바이크',
  skierg: '스키어그',
  run: '런',
  other: '기타',
};

export const RACE_FORMAT_LABEL: Record<RaceFormat, string> = {
  individual: '개인전',
  team: '팀전',
  group: '단체전',
  relay: '릴레이',
};

export const RACE_STATUS_LABEL: Record<RaceStatus, string> = {
  scheduled: '예정',
  in_progress: '진행 중',
  completed: '완료',
  cancelled: '취소',
};

export const LOBBY_STATUS_LABEL: Record<LobbyStatus, string> = {
  setup: '준비',
  lobby: '로비',
  countdown: '카운트다운',
  racing: '레이싱',
  finished: '종료',
};

export const DEVICE_TYPE_LABEL: Record<DeviceType, string> = {
  rower: '로워',
  bike: '바이크',
  skierg: '스키어그',
  treadmill: '트레드밀',
  other: '기타',
};

export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  online: '온라인',
  offline: '오프라인',
  maintenance: '점검',
};

export const DEVICE_MODE_LABEL: Record<DeviceMode, string> = {
  idle: '대기',
  racing: '레이싱',
  personal_recording: '개인 기록',
};

// 기기 RPC 엔벨로프 에러코드 → 한글.
const RPC_ERROR_LABEL: Record<string, string> = {
  forbidden: '권한이 없습니다.',
  serial_required: '시리얼 넘버를 입력하세요.',
  serial_duplicate: '이미 존재하는 시리얼 넘버입니다.',
  device_not_found: '기기를 찾을 수 없습니다.',
  device_racing: '레이싱 중에는 삭제할 수 없습니다.',
  invalid_device_type: '기기 종류 값이 올바르지 않습니다.',
  invalid_status: '상태 값이 올바르지 않습니다.',
  invalid_current_mode: '모드 값이 올바르지 않습니다.',
};

export function writeError(code: string | null): string {
  if (!code) return '요청에 실패했습니다.';
  if (RPC_ERROR_LABEL[code]) return RPC_ERROR_LABEL[code];
  if (/duplicate|unique/i.test(code)) return '이미 존재하는 값입니다 (중복).';
  if (/row-level security|permission|policy/i.test(code)) return '권한이 없습니다.';
  return code;
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}
