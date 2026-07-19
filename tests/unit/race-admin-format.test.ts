// Race Admin 에러 매핑·날짜 표기 순수 헬퍼 — src/features/race-admin/types.ts
import { describe, expect, it } from 'vitest';
import { writeError, fmtDate } from '@/features/race-admin/types';

describe('writeError — RPC 엔벨로프 에러코드 → 한글', () => {
  it('null 코드는 기본 실패 메시지', () => {
    expect(writeError(null)).toBe('요청에 실패했습니다.');
  });

  it('알려진 코드 매핑', () => {
    expect(writeError('serial_duplicate')).toMatch(/이미 존재/);
    expect(writeError('device_racing')).toMatch(/레이싱 중/);
    expect(writeError('serial_required')).toMatch(/시리얼/);
  });

  it('중복/unique 패턴은 휴리스틱 매핑', () => {
    expect(writeError('duplicate key value')).toMatch(/중복/);
    expect(writeError('unique constraint')).toMatch(/중복/);
  });

  it('RLS/권한 패턴은 권한 메시지', () => {
    expect(writeError('row-level security policy')).toBe('권한이 없습니다.');
    expect(writeError('permission denied')).toBe('권한이 없습니다.');
  });

  it('미매칭 코드는 원문 노출', () => {
    expect(writeError('some_raw_code')).toBe('some_raw_code');
  });
});

describe('fmtDate — ko-KR 날짜 표기', () => {
  it('null/undefined/빈문자는 대시', () => {
    expect(fmtDate(null)).toBe('-');
    expect(fmtDate(undefined)).toBe('-');
    expect(fmtDate('')).toBe('-');
  });

  it('유효하지 않은 날짜는 대시', () => {
    expect(fmtDate('not-a-date')).toBe('-');
  });

  it('유효한 ISO는 로컬 날짜 문자열(대시 아님)', () => {
    const out = fmtDate('2026-07-09T10:00:00Z');
    expect(out).not.toBe('-');
    expect(out).toContain('2026');
  });
});
