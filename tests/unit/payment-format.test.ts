// 결제/환불 표기·에러 매핑 순수 헬퍼 — src/features/payments/types.ts
// 환불 금액 산정은 서버(fn_calculate_refund, 10% 캡)가 소스 — 여기서는 클라 표기/검증만 테스트.
import { describe, expect, it } from 'vitest';
import {
  krw,
  refundErrorMessage,
  REFUND_ERROR_LABEL,
  TX_STATUS_LABEL,
  TX_STATUS_BADGE,
} from '@/features/payments/types';

describe('krw — 원화 정수 표기', () => {
  it('숫자를 천단위 구분 + 원 접미', () => {
    expect(krw(0)).toBe('0원');
    expect(krw(1000)).toBe('1,000원');
    expect(krw(1234567)).toBe('1,234,567원');
  });

  it('numeric(string)도 coerce', () => {
    expect(krw('50000')).toBe('50,000원');
    expect(krw('1234.9')).toBe('1,235원'); // 반올림
  });

  it('소수는 반올림(Math.round)', () => {
    expect(krw(999.4)).toBe('999원');
    expect(krw(999.5)).toBe('1,000원');
  });

  it('음수(위약금 표기 등)도 부호 유지', () => {
    expect(krw(-2500)).toBe('-2,500원');
  });
});

describe('refundErrorMessage — 코드 → 한글', () => {
  it('알려진 코드는 한글 매핑', () => {
    expect(refundErrorMessage('reason_required', 'fallback')).toBe(REFUND_ERROR_LABEL.reason_required);
    expect(refundErrorMessage('membership_not_found', 'fallback')).toBe(
      REFUND_ERROR_LABEL.membership_not_found,
    );
  });

  it('null/undefined/빈문자는 fallback', () => {
    expect(refundErrorMessage(null, '기본메시지')).toBe('기본메시지');
    expect(refundErrorMessage(undefined, '기본메시지')).toBe('기본메시지');
  });

  it('미등록 코드는 코드 원문을 그대로 노출(디버깅 여지)', () => {
    expect(refundErrorMessage('some_unknown_code', 'fallback')).toBe('some_unknown_code');
  });
});

describe('TX 상태 라벨/배지 계약 — 모든 상태 키 매핑 존재', () => {
  const STATUSES = [
    'pending',
    'completed',
    'failed',
    'cancelled',
    'refunded',
    'partial_refunded',
  ] as const;

  for (const s of STATUSES) {
    it(`${s} — 라벨·배지 모두 정의`, () => {
      expect(TX_STATUS_LABEL[s]).toBeTruthy();
      expect(TX_STATUS_BADGE[s]).toBeTruthy();
    });
  }
});
