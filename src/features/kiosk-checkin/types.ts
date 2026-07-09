// Kiosk QR 체크인 프로토콜 타입 (docs/06 §4)
// 판정은 전부 서버(fn_kiosk_checkin) — 여기 타입은 페이로드/응답 계약만 고정한다.

/** QR 페이로드 (docs/06 §4.1) — 회원 앱이 발급, 키오스크는 판독만 */
export interface QrPayload {
  /** member_id UUID (auth user_id 아님 — 데이터 규칙) */
  mid: string;
  /** 발급 시점 회원 소속 facility_id */
  fid: string;
  /** 발급 시각 epoch(초) — 5분 만료 */
  ts: number;
  /** 페이로드 스키마 버전 — 현행 1 */
  v: number;
}

/**
 * fn_kiosk_checkin 성공 응답 data (Phase 3.5 신 시그니처 — migration R1.1 기준).
 * duplicated=false 정상 체크인 payload. 크레딧 원자 차감 후 잔여/만료 D-day 포함.
 */
export interface KioskCheckinData {
  checkin_id: string | null;
  /** 같은 날 중복 여부 — 정상 성공은 false (중복은 KioskDuplicateData로 분기) */
  duplicated: boolean;
  member_name: string;
  membership_plan_kind: 'standard' | 'drop_in' | 'trial' | string;
  membership_plan_name: string | null;
  /** 차감 후 잔여 횟수 — 기간제/무제한은 null */
  remaining_credits: number | null;
  /** 멤버십 만료 D-day(남은 일수) — 만료일 없으면 null */
  membership_dday: number | null;
  session_id: string | null;
  session_title: string | null;
  /** 예약 감지되어 수업에 연결됐는지 — true=수업 체크인, false=시설(자유) 체크인 */
  linked_booking: boolean;
  checkin_time: string;
  /** 게스트(드롭인/체험) 코드 상환 경로 여부 — success 화면 라벨용(§4.6 G-7) */
  guest?: boolean;
}

/**
 * 같은 날 중복 체크인 성공 payload (migration R1.1 duplicated:true).
 * 오류가 아니라 성공 화면에서 "이미 체크인됨"으로 친화 표기한다(2차 미기록).
 */
export interface KioskDuplicateData {
  member_name: string;
  /** 최초 체크인 시각(ISO) */
  checkin_time: string;
  remaining_credits: number | null;
  membership_dday: number | null;
}

/** 수기 대체 조회 후보 (fn_kiosk_lookup_member data 원소 — 마스킹된 최소 정보) */
export interface KioskCandidate {
  member_id: string;
  masked_name: string;
  phone_tail: string;
}

/** 서버/클라이언트 공통 오류 코드 — 실제 RPC가 반환하는 문자열 + 클라이언트 선검증 코드 */
export type KioskErrorCode =
  | 'invalid_payload'
  | 'qr_expired'
  | 'member_not_found'
  | 'member_not_active'
  | 'no_active_membership'
  | 'duplicate_checkin'
  | 'facility_mismatch' // 클라이언트 선검증 (서버 미강제 — FLAG)
  | 'unsupported_version' // 클라이언트 선검증
  | 'invalid_code' // 게스트 코드: 오타·이미 사용·존재하지 않음(§4.6)
  | 'code_expired' // 게스트 코드: 당일 만료
  | 'network_error';

/** 스캔 결과 — 성공(데이터) / 중복(성공 화면 경유, 회원명·시각) / 오류(토스트) / 오프라인 접수 */
export type ScanOutcome =
  | { kind: 'success'; data: KioskCheckinData }
  | { kind: 'duplicate'; data: KioskDuplicateData } // §4.2⑥ — 오류 아님, success 화면 표기
  | { kind: 'queued' } // 오프라인 접수(§7)
  | { kind: 'error'; code: KioskErrorCode };

/** 키오스크 표시 문구 (docs/06 §4.2 오류표). 개인정보 사유는 비노출 */
export const KIOSK_ERROR_MESSAGE: Record<KioskErrorCode, string> = {
  qr_expired: 'QR이 만료되었습니다. 앱에서 새로 열어주세요.',
  unsupported_version: '앱 업데이트가 필요합니다.',
  facility_mismatch: '이 지점에서 사용할 수 없는 QR입니다.',
  invalid_payload: 'QR을 읽을 수 없습니다. 다시 시도해주세요.',
  member_not_found: '데스크에 문의해주세요.',
  member_not_active: '데스크에 문의해주세요.',
  no_active_membership: '데스크에 문의해주세요.',
  duplicate_checkin: '이미 체크인되었습니다.',
  invalid_code: '코드가 올바르지 않거나 이미 사용되었습니다.',
  code_expired: '코드가 만료되었습니다. 데스크에 문의해주세요.',
  network_error: '네트워크 오류입니다. 잠시 후 다시 시도해주세요.',
};

export const PAYLOAD_VERSION = 1;
export const QR_TTL_SECONDS = 300; // 5분 만료 (docs §4.1)
export const FUTURE_SKEW_SECONDS = 60; // 미래 시각 허용 오차 (시계 조작 방지)
