'use client';

// /auth/callback — OAuth/매직링크 세션 확립 지점 (docs/01 §2.7)
// 모든 실패는 /auth/login?error=auth_callback_failed 로 표면화 — 무한 대기 금지.
// ⏳ Phase2: 소셜 로그인 팝업 컨텍스트(window.opener) 처리 — 소셜 활성화와 함께 구현.
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { query } from '@/lib/supabase/query';
import { resolvePostLoginRoute, type RouteProfile } from '@/lib/auth/resolve-route';
import { Card, Skeleton } from '@/components/ui';
import styles from '../auth.module.css';

export default function CallbackPage() {
  const router = useRouter();
  const startedRef = useRef(false); // StrictMode 이중 실행 방지

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const client = getSupabaseBrowserClient();
        const params = new URLSearchParams(window.location.search);

        // ① PKCE ?code= → exchangeCodeForSession
        const code = params.get('code');
        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // ② Implicit(#access_token)은 detectSessionInUrl이 처리 — 세션 확인
        const {
          data: { session },
          error: sessionError,
        } = await client.auth.getSession();
        if (sessionError || !session) throw sessionError ?? new Error('no session');

        // ③ profiles 조회 → 승인 상태 분기 = resolvePostLoginRoute 단일 함수 (F-6)
        const profileRes = await query<RouteProfile>(client, 'profiles', (q) =>
          q.select('role, approval_status').eq('id', session.user.id).single(),
        );
        if (!profileRes.success || !profileRes.data) {
          throw new Error(profileRes.error ?? 'profile load failed');
        }

        const redirectParam = params.get('redirect');
        router.replace(resolvePostLoginRoute(profileRes.data, redirectParam));
      } catch {
        router.replace('/auth/login?error=auth_callback_failed');
      }
    })();
  }, [router]);

  // 처리 대기는 유한하다 — 위 로직이 성공/실패 어느 쪽이든 반드시 이탈시킨다
  return (
    <Card>
      <div className={styles.stack} aria-busy="true">
        <h1 className={styles.title}>로그인 처리 중…</h1>
        <p className={styles.subtitle}>잠시만 기다려주세요.</p>
        <Skeleton variant="rect" height="var(--bcl-control-h)" />
      </div>
    </Card>
  );
}
