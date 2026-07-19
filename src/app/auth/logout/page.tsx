'use client';

// /auth/logout — 진입 즉시 로그아웃 (docs/01 §2.8)
// AuthContext.signOut이 로컬 상태 선초기화 + best-effort 네트워크(5s 타임아웃)를 담당 (F-10).
// 성공/실패 무관하게 반드시 /auth/login 으로 이탈 — 무한 대기 금지.
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth';
import { Card, Skeleton } from '@/components/ui';
import styles from '../auth.module.css';

export default function LogoutPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const startedRef = useRef(false); // StrictMode 이중 실행 방지

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        await signOut();
      } catch {
        /* signOut 실패해도 login 이동 (F-10) */
      } finally {
        router.replace('/auth/login');
      }
    })();
  }, [router, signOut]);

  return (
    <Card>
      <div className={styles.stack} aria-busy="true">
        <h1 className={styles.title}>로그아웃 중…</h1>
        <Skeleton variant="rect" height="var(--bcl-control-h)" />
      </div>
    </Card>
  );
}
