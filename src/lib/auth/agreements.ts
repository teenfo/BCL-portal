// G-6 전자 동의·웨이버 필수 문서 — 단일 정의처 (signup Step4 · pending-approval 미서명 감지 공유)
// DB CHECK와 1:1: member_agreements.doc_type IN ('terms','privacy','refund_policy','health_waiver')
export const REQUIRED_AGREEMENT_DOCS = ['terms', 'privacy', 'refund_policy', 'health_waiver'] as const;
export type AgreementDocType = (typeof REQUIRED_AGREEMENT_DOCS)[number];

// ⏳ 문서 버전 SSOT는 system_config 연동 예정(docs/01 §3b) — Phase 1은 고정 버전
export const AGREEMENT_DOC_VERSION = '2026-07-08';

export const AGREEMENT_DOC_LABELS: Record<AgreementDocType, string> = {
  terms: '이용약관',
  privacy: '개인정보 처리방침',
  refund_policy: '환불규정 동의',
  health_waiver: '건강 및 부상 위험 고지·면책 동의서',
};
