// 요금제 도메인 타입 — membership_plans 스키마(docs/sql/02_membership_finance.sql) 반영
export type PlanType = 'period' | 'count';
export type PlanKind = 'standard' | 'drop_in' | 'trial';

export interface RefundTier {
  /** 경과 일수 상한(이하) */
  max_elapsed_days: number;
  /** 환급률 0~1 */
  refund_rate: number;
}

export interface RefundPolicy {
  formula?: string;
  /** 위약금 상한율 — CHECK penalty_rate_cap <= 0.10 */
  penalty_rate_cap: number;
  /** 경과 기간별 환급률(선택) */
  tiers?: RefundTier[];
}

export interface MembershipPlan {
  id: string;
  facility_id: string | null;
  name: string;
  type: PlanType;
  plan_kind: PlanKind;
  duration_days: number | null;
  credit_count: number | null;
  price: number;
  discount_price: number | null;
  description: string | null;
  refund_policy: RefundPolicy;
  max_pauses: number;
  facility_sharing: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PLAN_TYPE_LABEL: Record<PlanType, string> = {
  period: '기간제',
  count: '횟수권',
};

export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
  standard: '정규',
  drop_in: '드롭인',
  trial: '체험',
};
