// 리다이렉트 결정의 유일한 소스 (docs/01-auth §4 — F-6)
// 이 함수 외부에서 role/approval_status 기반 경로 분기를 작성하는 것 자체를 금지 (리뷰 반려 사유)

export interface RouteProfile {
  role: 'admin' | 'coach' | 'member';
  approval_status: 'pending' | 'approved' | 'rejected';
}

// 역할별 접근 가능 prefix — AuthGuard도 이 표만 참조
export const ROLE_PREFIXES: Record<RouteProfile['role'], string[]> = {
  admin: ['/admin', '/coach', '/apps', '/class', '/kiosk'], // admin은 전 영역 열람 가능
  coach: ['/coach', '/class'],
  member: ['/apps'],
};

function isAllowedForRole(path: string, role: RouteProfile['role']): boolean {
  return ROLE_PREFIXES[role].some((p) => path.startsWith(p));
}

export function resolvePostLoginRoute(
  profile: RouteProfile | null,
  redirectParam?: string | null,
): string {
  if (!profile) return '/auth/login'; // 프로필 로드 실패 → 재로그인
  if (profile.approval_status === 'pending') return '/auth/pending-approval';
  if (profile.approval_status === 'rejected') return '/auth/rejected';

  // 승인 완료 — redirect 파라미터가 본인 역할 영역이면 우선 존중 (오픈 리다이렉트 방지)
  if (redirectParam && isAllowedForRole(redirectParam, profile.role)) return redirectParam;

  switch (profile.role) {
    case 'admin':
      return '/admin/dashboard';
    case 'coach':
      return '/coach/dashboard';
    case 'member':
      return '/apps/home';
    default:
      return '/auth/login'; // 알 수 없는 role은 안전 실패
  }
}
