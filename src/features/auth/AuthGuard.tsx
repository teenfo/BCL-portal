'use client';

// AuthGuard — 보호 경로 상시 게이트 (docs/01-auth §5.4 표준 표 순서 그대로)
// 경로 결정은 resolvePostLoginRoute 1곳에만 위임 (F-6) · 모든 대기 상태는 유한 (F-5)
// 각 앱 layout('/admin'|'/coach'|'/apps')에 1곳씩만 배치한다.

import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { resolvePostLoginRoute } from '@/lib/auth/resolve-route';
import { useAuth } from './useAuth';
import type { AuthError } from './AuthContext';

export type AuthGuardPrefix = '/admin' | '/coach' | '/apps';

export interface AuthGuardProps {
  requiredPrefix: AuthGuardPrefix;
  children: ReactNode;
}

export function AuthGuard({ requiredPrefix, children }: AuthGuardProps) {
  const { user, profile, loading, authError, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // §5.4 표 3행 이후 판정 — 리다이렉트 목적지는 전부 resolvePostLoginRoute가 결정 (F-6)
  const redirectTarget = useMemo<string | null>(() => {
    if (loading || authError) return null; // 1·2행(스켈레톤/에러 카드)은 렌더에서 처리
    if (!user) return `/auth/login?redirect=${encodeURIComponent(pathname)}`;

    // ⏳ 필수 문서 미서명 게이트 (G-6, docs/01 §3b) — 승인 게이트보다 선행 렌더 예정.
    //    Phase 1은 서명을 signup 플로우(Step4)에서 처리 —
    //    fn_get_pending_agreements 판정 + 전면 서명 게이트 컴포넌트는 Phase 2에서 이 지점에 삽입.

    if (!profile) return null; // 프로필 부재는 authError(PROFILE_LOAD_FAILED)로 이미 표면화됨

    // pending → /auth/pending-approval · rejected → /auth/rejected ·
    // role이 현재 prefix 밖(ROLE_PREFIXES) → 역할 기본 대시보드 — 단일 함수가 전부 결정
    const desired = pathname.startsWith(requiredPrefix) ? pathname : requiredPrefix;
    const target = resolvePostLoginRoute(profile, desired);
    return target === desired ? null : target;
  }, [loading, authError, user, profile, pathname, requiredPrefix]);

  useEffect(() => {
    if (redirectTarget) router.replace(redirectTarget);
  }, [redirectTarget, router]);

  const handleRetry = () => {
    if (user) {
      void refreshProfile();
    } else {
      // INIT_TIMEOUT 등 세션 자체가 없는 실패 — 초기화 재시도는 전체 리로드로만 가능
      window.location.reload();
    }
  };

  const handleSignOut = () => {
    void signOut().then(() => router.replace('/auth/login'));
  };

  if (loading) return <GuardSkeleton />; // 최대 4s — AuthContext safety timeout이 유한성 보장
  if (authError) {
    return <GuardErrorCard error={authError} onRetry={handleRetry} onSignOut={handleSignOut} />;
  }
  if (redirectTarget || !user || !profile) return <GuardSkeleton />; // 리다이렉트/판정 진행 중

  return <>{children}</>;
}

// ---- 내부 표시 컴포넌트 (토큰만 사용 — HEX·수동 유틸 클래스 금지) ----------
// TODO(Phase 1 후속): components/ui 표준 Button/EmptyState 착지 시 그 컴포넌트로 교체

const fullPageStyle: CSSProperties = {
  minHeight: '100dvh',
  backgroundColor: 'var(--bcl-bg)',
  padding: 'var(--bcl-pad-page)',
};

const skeletonWrapStyle: CSSProperties = {
  ...fullPageStyle,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--bcl-space-3)',
};

const skeletonBarStyle: CSSProperties = {
  height: 'var(--bcl-control-h)',
  borderRadius: 'var(--bcl-radius-md)',
  backgroundColor: 'var(--bcl-surface-raised)',
  opacity: 0.7,
};

function GuardSkeleton() {
  return (
    <div style={skeletonWrapStyle} role="status" aria-label="인증 확인 중">
      <div style={{ ...skeletonBarStyle, width: '40%' }} />
      <div style={{ ...skeletonBarStyle, width: '100%' }} />
      <div style={{ ...skeletonBarStyle, width: '100%' }} />
      <div style={{ ...skeletonBarStyle, width: '70%' }} />
    </div>
  );
}

const errorWrapStyle: CSSProperties = {
  ...fullPageStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const errorCardStyle: CSSProperties = {
  width: '100%',
  maxWidth: '360px',
  padding: 'var(--bcl-pad-card)',
  backgroundColor: 'var(--bcl-surface)',
  border: '1px solid var(--bcl-border)',
  borderRadius: 'var(--bcl-radius-lg)',
  boxShadow: 'var(--bcl-shadow-md)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--bcl-space-3)',
};

const errorTitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--bcl-text)',
  fontWeight: 600,
};

const errorMessageStyle: CSSProperties = {
  margin: 0,
  color: 'var(--bcl-text-muted)',
};

const buttonRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--bcl-space-2)',
  marginTop: 'var(--bcl-space-2)',
};

const buttonBaseStyle: CSSProperties = {
  flex: 1,
  height: 'var(--bcl-control-h)',
  minHeight: 'var(--bcl-hit-min)',
  padding: '0 var(--bcl-space-4)',
  borderRadius: 'var(--bcl-radius-md)',
  fontFamily: 'var(--bcl-font)',
  cursor: 'pointer',
};

const retryButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: 'var(--bcl-accent-soft)',
  border: '1px solid var(--bcl-accent-border)',
  color: 'var(--bcl-accent-ink)',
};

const signOutButtonStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: 'transparent',
  border: '1px solid var(--bcl-border)',
  color: 'var(--bcl-text-muted)',
};

// §5.6 에러 표면화 3원칙: 사용자 언어 메시지 + 탈출구([다시 시도]·[로그아웃]) 필수
function GuardErrorCard({
  error,
  onRetry,
  onSignOut,
}: {
  error: AuthError;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div style={errorWrapStyle}>
      <div style={errorCardStyle} role="alert">
        <p style={errorTitleStyle}>로그인 정보를 확인하지 못했습니다</p>
        <p style={errorMessageStyle}>{error.message}</p>
        <div style={buttonRowStyle}>
          <button type="button" style={retryButtonStyle} onClick={onRetry}>
            다시 시도
          </button>
          <button type="button" style={signOutButtonStyle} onClick={onSignOut}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}
