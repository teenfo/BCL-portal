// 비밀번호 정책 검증 — 8자 이상 · 영문 대/소문자·숫자·특수문자 중 3종 조합 (docs/01-auth §1)
// signup Step1 · reset-password Step3가 공유하는 유일한 판정 소스.

const KINDS = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];

/** 정책 위반 사유를 반환, 통과 시 null */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  const kindCount = KINDS.filter((re) => re.test(password)).length;
  if (kindCount < 3) return '영문 대문자·소문자·숫자·특수문자 중 3종 이상을 조합해주세요.';
  return null;
}
