// 비밀번호 정책 — src/lib/auth/password.ts (docs/01-auth §1)
// 8자 이상 + 영문 대/소/숫자/특수 중 3종 이상. signup·reset가 공유하는 유일 판정 소스.
import { describe, expect, it } from 'vitest';
import { validatePassword } from '@/lib/auth/password';

describe('validatePassword', () => {
  it('8자 미만은 길이 사유 반환', () => {
    expect(validatePassword('Ab1!')).toMatch(/8자/);
    expect(validatePassword('')).toMatch(/8자/);
  });

  it('길이 충족했으나 조합 2종 이하는 조합 사유', () => {
    expect(validatePassword('abcdefgh')).toMatch(/3종/); // 소문자만
    expect(validatePassword('abcdefgh12')).toMatch(/3종/); // 소문자+숫자 = 2종
    expect(validatePassword('ABCDEFGH12')).toMatch(/3종/); // 대문자+숫자 = 2종
  });

  it('3종 조합 + 8자 이상은 통과(null)', () => {
    expect(validatePassword('Abcdef12')).toBeNull(); // 대+소+숫자
    expect(validatePassword('abcdef1!')).toBeNull(); // 소+숫자+특수
    expect(validatePassword('ABCdef!@')).toBeNull(); // 대+소+특수
  });

  it('4종 전부 조합도 통과', () => {
    expect(validatePassword('Abc123!@')).toBeNull();
  });

  it('정확히 8자 경계 통과', () => {
    expect(validatePassword('Abcdefg1')).toBeNull();
    expect(validatePassword('Abcdef1')).toMatch(/8자/); // 7자
  });
});
