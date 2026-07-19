// resolvePostLoginRoute 매트릭스 — docs/01-auth §4 요구: role 3 × approval 3 + redirect 조합
import { describe, expect, it } from 'vitest';
import { resolvePostLoginRoute, ROLE_PREFIXES, type RouteProfile } from '@/lib/auth/resolve-route';

const ROLES = ['admin', 'coach', 'member'] as const;
const DASHBOARDS: Record<(typeof ROLES)[number], string> = {
  admin: '/admin/dashboard',
  coach: '/coach/dashboard',
  member: '/apps/home',
};

describe('resolvePostLoginRoute', () => {
  it('프로필 없음 → 재로그인', () => {
    expect(resolvePostLoginRoute(null)).toBe('/auth/login');
  });

  describe('role 3 × approval 3 매트릭스', () => {
    for (const role of ROLES) {
      it(`${role}/pending → pending-approval`, () => {
        expect(resolvePostLoginRoute({ role, approval_status: 'pending' })).toBe('/auth/pending-approval');
      });
      it(`${role}/rejected → rejected`, () => {
        expect(resolvePostLoginRoute({ role, approval_status: 'rejected' })).toBe('/auth/rejected');
      });
      it(`${role}/approved → 역할 대시보드`, () => {
        expect(resolvePostLoginRoute({ role, approval_status: 'approved' })).toBe(DASHBOARDS[role]);
      });
    }
  });

  describe('redirect 파라미터 — 역할 허용 prefix 검증(오픈 리다이렉트 방지)', () => {
    const approved = (role: RouteProfile['role']): RouteProfile => ({ role, approval_status: 'approved' });

    it('본인 영역 redirect는 존중', () => {
      expect(resolvePostLoginRoute(approved('coach'), '/coach/schedule')).toBe('/coach/schedule');
      expect(resolvePostLoginRoute(approved('member'), '/apps/checkin')).toBe('/apps/checkin');
      expect(resolvePostLoginRoute(approved('admin'), '/apps/dashboard')).toBe('/apps/dashboard'); // admin은 전 영역
    });

    it('타 역할 영역 redirect는 무시하고 기본 대시보드', () => {
      expect(resolvePostLoginRoute(approved('member'), '/admin/members')).toBe('/apps/home');
      expect(resolvePostLoginRoute(approved('coach'), '/admin/dashboard')).toBe('/coach/dashboard');
    });

    it('외부/비허용 경로 redirect는 무시', () => {
      expect(resolvePostLoginRoute(approved('member'), 'https://evil.example')).toBe('/apps/home');
      expect(resolvePostLoginRoute(approved('member'), '/auth/login')).toBe('/apps/home');
    });

    it('미승인 상태에서는 redirect 자체를 무시(게이트 우선)', () => {
      expect(resolvePostLoginRoute({ role: 'member', approval_status: 'pending' }, '/apps/dashboard')).toBe(
        '/auth/pending-approval',
      );
    });
  });

  it('ROLE_PREFIXES 계약 — AuthGuard가 참조하는 표', () => {
    expect(ROLE_PREFIXES.admin).toContain('/admin');
    expect(ROLE_PREFIXES.coach).toEqual(['/coach', '/class']);
    expect(ROLE_PREFIXES.member).toEqual(['/apps']);
  });
});
