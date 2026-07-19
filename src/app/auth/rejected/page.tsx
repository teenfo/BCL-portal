'use client';

// /auth/rejected — 가입 거부 안내 (docs/01 §2.5)
// rejected 외 상태가 진입하면 각자 목적지로 리다이렉트. 재신청은 지점 문의 경로로만.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { resolvePostLoginRoute, type RouteProfile } from '@/lib/auth/resolve-route';
import { Button, Card } from '@/components/ui';
import styles from '../auth.module.css';

export default function RejectedPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    const p = profile as RouteProfile | null;
    if (p && p.approval_status !== 'rejected') {
      router.replace(resolvePostLoginRoute(p)); // approved/pending은 각자 목적지로 (F-6)
    }
  }, [loading, user, profile, router]);

  // profiles.rejection_reason (🔄 to-be 필드) — 없으면 일반 안내
  const reason =
    (profile as (RouteProfile & { rejection_reason?: string | null }) | null)?.rejection_reason ??
    null;

  return (
    <Card>
      <div className={styles.stack}>
        <h1 className={styles.title}>가입이 승인되지 않았습니다</h1>

        {reason ? (
          <div className={styles.stackSm}>
            <p className={styles.caption}>거부 사유</p>
            <p className={styles.errorBanner}>{reason}</p>
          </div>
        ) : (
          <p className={styles.subtitle}>
            관리자 검토 결과 가입이 승인되지 않았습니다. 자세한 내용은 지점으로 문의해주세요.
          </p>
        )}

        <p className={styles.caption}>
          재신청은 지점 문의를 통해서만 가능합니다. 방문하신 지점 데스크 또는 안내된 연락처로
          문의해주세요.
        </p>

        <Button variant="ghost" block onClick={() => router.replace('/auth/logout')}>
          로그아웃
        </Button>
      </div>
    </Card>
  );
}
