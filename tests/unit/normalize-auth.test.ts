// AuthContext 반환값 정규화 — src/lib/auth/normalize.ts (docs/01 §5.4)
// role/approvalStatus 표기 변형을 흡수해 { profile, error, hasSession } 1형으로 통일.
import { describe, expect, it } from 'vitest';
import { normalizeAuthResult } from '@/lib/auth/normalize';

describe('normalizeAuthResult', () => {
  it('null/undefined 입력은 안전 기본값(hasSession=true)', () => {
    expect(normalizeAuthResult(null)).toEqual({ profile: null, error: null, hasSession: true });
    expect(normalizeAuthResult(undefined)).toEqual({ profile: null, error: null, hasSession: true });
  });

  it('flat role + approvalStatus(camel)에서 프로필 구성', () => {
    const res = normalizeAuthResult({ role: 'coach', approvalStatus: 'approved' });
    expect(res.profile).toEqual({ role: 'coach', approval_status: 'approved' });
    expect(res.error).toBeNull();
  });

  it('snake_case approval_status 변형도 흡수', () => {
    const res = normalizeAuthResult({ role: 'member', approval_status: 'pending' });
    expect(res.profile).toEqual({ role: 'member', approval_status: 'pending' });
  });

  it('중첩 profile 형태에서 role/approval 추출', () => {
    const res = normalizeAuthResult({ profile: { role: 'admin', approval_status: 'approved' } });
    expect(res.profile).toEqual({ role: 'admin', approval_status: 'approved' });
  });

  it('빈 문자열 error는 null로 정규화, 실제 메시지는 보존', () => {
    expect(normalizeAuthResult({ error: '' }).error).toBeNull();
    expect(normalizeAuthResult({ error: 'invalid' }).error).toBe('invalid');
  });

  it('role/approval 불완전(한쪽만)이면 profile=null', () => {
    expect(normalizeAuthResult({ role: 'member' }).profile).toBeNull();
    expect(normalizeAuthResult({ approvalStatus: 'approved' }).profile).toBeNull();
  });

  it('session 필드 존재 시 값으로 hasSession 판정 (Confirm email 오적용 감지)', () => {
    expect(normalizeAuthResult({ session: null }).hasSession).toBe(false);
    expect(normalizeAuthResult({ session: { access_token: 'x' } }).hasSession).toBe(true);
  });

  it('session 필드 부재 시 hasSession=true(기존 흐름 보존)', () => {
    expect(normalizeAuthResult({ role: 'member', approvalStatus: 'approved' }).hasSession).toBe(true);
  });
});
