'use client';

// 회원 앱 셸 — 하단탭(탭 라우트 한정) + 전역 Realtime 알림 구독(앱 레이아웃 레벨, docs/03 §3.8)
// 이 구독은 특정 화면이 아닌 셸에 상주한다. realtime 채널은 DB from()/rpc() 접근이 아니므로 헬퍼 예외.
import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { BottomNav, MEMBER_TABS } from './BottomNav';
import { BrandHeader } from './BrandHeader';
import styles from './MemberShell.module.css';

export function MemberShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });

  const isTab = MEMBER_TABS.some(
    (t) => pathname === t.href || pathname.startsWith(`${t.href}/`),
  );

  // 전역 Realtime — notifications INSERT(본인) → 토스트. action_url 있으면 이동 액션 제공.
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`member-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as { title?: string; action_url?: string | null };
          toastRef.current.info(
            n.title ?? '새 알림',
            n.action_url
              ? { label: '보기', onClick: () => router.push(n.action_url as string) }
              : undefined,
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, router]);

  return (
    <div className={styles.shell}>
      {isTab ? <BrandHeader /> : null}
      <main className={`${styles.main} ${isTab ? styles.withNav : ''}`}>{children}</main>
      {isTab ? <InstallPrompt app="apps" navOffset /> : null}
      {isTab ? <BottomNav /> : null}
    </div>
  );
}
