'use client';

// /auth/pending-approval — 관리자 승인 대기 랜딩 (docs/01 §2.4)
// 폴링 없음: 수동 새로고침(refreshProfile) + 재진입 시 확인. approved 진입 시 즉시 리다이렉트.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { resolvePostLoginRoute, type RouteProfile } from '@/lib/auth/resolve-route';
import { normalizeAuthResult } from '@/lib/auth/normalize';
import { Button, Card } from '@/components/ui';
import styles from '../auth.module.css';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile } = useAuth();

  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // 비로그인 → login, pending 외 상태 → 각자 목적지 (단일 함수 경유 — F-6)
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    const p = profile as RouteProfile | null;
    if (p && p.approval_status !== 'pending') {
      router.replace(resolvePostLoginRoute(p));
    }
  }, [loading, user, profile, router]);

  async function handleRefresh() {
    if (checking) return;
    setNotice(null);
    setFormError(null);
    setChecking(true);
    try {
      const refreshed = normalizeAuthResult(await refreshProfile());
      const next = refreshed.profile ?? (profile as RouteProfile | null);
      if (next && next.approval_status !== 'pending') {
        router.replace(resolvePostLoginRoute(next));
        return;
      }
      setNotice('아직 승인 대기 중입니다. 승인이 완료되면 이용할 수 있습니다.');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : '상태 확인에 실패했습니다. 다시 시도해주세요.',
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleLogout() {
    router.replace('/auth/logout');
  }

  return (
    <Card>
      <div className={styles.stack}>
        <h1 className={styles.title}>가입 승인 대기 중</h1>
        <p className={styles.subtitle}>
          가입 신청이 접수되었습니다. 관리자 승인 후 서비스를 이용할 수 있습니다. 승인은 보통 영업일
          기준 1일 이내에 처리됩니다.
        </p>
        {/* ⏳ 가입 지점/신청 일시 표시 — profiles 확장 필드 조회 연결 후 */}

        {formError ? (
          <p className={styles.errorBanner} role="alert">
            {formError}
          </p>
        ) : null}
        {notice ? (
          <p className={styles.infoBanner} role="status">
            {notice}
          </p>
        ) : null}

        <Button variant="primary" block loading={checking} onClick={handleRefresh}>
          승인 상태 새로고침
        </Button>
        <Button variant="ghost" block onClick={handleLogout}>
          로그아웃
        </Button>

        <p className={`${styles.caption} ${styles.centered}`}>
          문의: 방문하신 지점 데스크 또는 안내된 연락처로 문의해주세요.
        </p>
      </div>
    </Card>
  );
}
