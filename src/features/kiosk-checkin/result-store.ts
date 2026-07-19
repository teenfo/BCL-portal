// scan → success 라우트 간 결과 전달용 경량 모듈 스토어.
// 라우트 전환 시 React state가 소실되므로, 성공 데이터를 재조회 없이 넘기기 위한 단일 슬롯.
// (docs/06 §3.3: success는 RPC 응답 data만 사용 — 추가 조회 금지)
import type { KioskCheckinData, KioskDuplicateData } from './types';

export type SuccessResult =
  | { kind: 'success'; data: KioskCheckinData }
  | { kind: 'duplicate'; data: KioskDuplicateData }
  | { kind: 'queued' };

let slot: SuccessResult | null = null;

export function setSuccessResult(r: SuccessResult): void {
  slot = r;
}

/** 1회성 소비 — 읽으면 비운다(새로고침 시 stale 표시 방지) */
export function takeSuccessResult(): SuccessResult | null {
  const r = slot;
  slot = null;
  return r;
}
