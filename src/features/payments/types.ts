// 결제/환불 도메인 타입 — transactions/refunds 스키마(docs/sql/02_membership_finance.sql) 반영
// 환불 계약: fn_calculate_refund → fn_request_refund → cancel-payment EF(fn_process_refund) (docs/08 §1.2·§1.6)

export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partial_refunded';

export type PaymentMode = 'simulation' | 'live';

/** 목록 조회 시 members(name)·membership_plans(name) 임베드 (PostgREST to-one) */
export interface TransactionRow {
  id: string;
  member_id: string | null;
  plan_id: string | null;
  membership_id: string | null;
  order_id: string | null;
  amount: number | string;
  status: TransactionStatus;
  payment_method: string | null;
  source: 'online' | 'pos' | 'manual';
  toss_status: string | null;
  toss_raw_data: { mode?: PaymentMode; [k: string]: unknown } | null;
  created_at: string;
  members?: { name: string | null } | null;
  membership_plans?: { name: string | null } | null;
}

export type RefundStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export interface RefundRow {
  id: string;
  transaction_id: string;
  amount: number | string;
  penalty_amount: number | string;
  reason: string;
  status: RefundStatus;
  created_at: string;
  completed_at: string | null;
}

/** fn_calculate_refund 반환(data). fn_request_refund는 여기에 refund_id·membership_id를 더해 반환 */
export interface RefundCalc {
  refund_amount: number;
  penalty_amount: number;
  penalty_rate: number;
  used_amount: number;
  used_days: number;
  total_days: number;
  basis: 'period' | 'credit';
  transaction_amount: number;
  refund_id?: string;
  membership_id?: string;
}

export const TX_STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: '결제대기',
  completed: '결제완료',
  failed: '실패',
  cancelled: '취소',
  refunded: '환불',
  partial_refunded: '부분환불',
};

export const TX_STATUS_BADGE: Record<
  TransactionStatus,
  'neutral' | 'success' | 'warning' | 'danger' | 'info'
> = {
  pending: 'warning',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
  refunded: 'neutral',
  partial_refunded: 'info',
};

export const SOURCE_LABEL: Record<TransactionRow['source'], string> = {
  online: '온라인',
  pos: 'POS',
  manual: '수동',
};

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  pending: '대기',
  approved: '승인',
  completed: '완료',
  rejected: '반려',
};

export const REFUND_STATUS_BADGE: Record<RefundStatus, 'warning' | 'info' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'info',
  completed: 'success',
  rejected: 'danger',
};

/** RPC/EF 에러코드 → 한글 메시지 (계약 envelope error) */
export const REFUND_ERROR_LABEL: Record<string, string> = {
  forbidden: '환불 권한이 없습니다.',
  unauthorized: '인증이 만료되었습니다. 다시 로그인해주세요.',
  reason_required: '환불 사유를 입력해주세요.',
  refund_already_exists: '이미 진행 중이거나 완료된 환불이 있습니다.',
  transaction_not_found: '거래를 찾을 수 없습니다.',
  transaction_not_refundable: '환불 가능한(결제완료) 거래가 아닙니다.',
  membership_not_found: '연결된 멤버십을 찾을 수 없습니다.',
  membership_mismatch: '거래와 멤버십이 일치하지 않습니다.',
  refund_not_found: '환불 요청을 찾을 수 없습니다.',
  refund_not_approved: '승인된 환불 건이 아닙니다.',
  pg_inactive: 'PG 설정이 비활성 상태입니다.',
  live_not_configured: '라이브 결제 키가 구성되지 않았습니다.',
  bad_request: '잘못된 요청입니다.',
};

export function refundErrorMessage(code: string | null | undefined, fallback: string): string {
  if (!code) return fallback;
  return REFUND_ERROR_LABEL[code] ?? code;
}

/** 원화 정수 표기 (numeric은 string으로 올 수 있어 coerce) */
export function krw(n: number | string): string {
  return `${Math.round(Number(n)).toLocaleString('ko-KR')}원`;
}
