'use client';

// /admin/dashboard — Phase 1 스텁 (역할별 리다이렉트 검증용 최소 셸)
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { Button, Card } from '@/components/ui';
import styles from '../../_shared/dashboard.module.css';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const role = (profile as { role?: string } | null)?.role ?? '—';

  // Phase 2 기반 스텁 — 실제 KPI 대시보드는 screen 단계에서 교체 (셸의 <main> 내부이므로 div)
  return (
    <div className={styles.page}>
      <Card
        title="관리자 대시보드"
        action={
          <Button variant="ghost" size="sm" onClick={() => router.replace('/auth/logout')}>
            로그아웃
          </Button>
        }
      >
        <p className={styles.welcome}>환영합니다. BCL Portal 관리자 화면입니다.</p>
        <p className={styles.meta}>현재 역할: {role}</p>
      </Card>
    </div>
  );
}
