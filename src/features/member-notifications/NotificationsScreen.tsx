'use client';

// 비탭 notifications (/apps/notifications) — docs/03 §3.8
// 히스토리(카테고리 필터, 읽음 처리) + action_url 딥링크. 전역 Realtime 토스트는 셸(MemberShell)에 상주.
// 알림 읽음 처리는 RLS "notifications own update" 정책으로 본인 행만 갱신(query 헬퍼 경유).
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { relativeTime } from '@/features/member-shell';
import { StackHeader } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './notifications.module.css';

interface Notif {
  id: string;
  title: string;
  content: string;
  category: string;
  type: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

const CATEGORIES = [
  { key: 'all', label: '전체' },
  { key: 'class_reminder', label: '수업' },
  { key: 'waitlist_vacancy', label: '대기' },
  { key: 'membership_expiry', label: '멤버십' },
  { key: 'badge', label: '배지' },
  { key: 'system', label: '시스템' },
];

const PAGE = 30;

export function NotificationsScreen() {
  const router = useRouter();
  const [category, setCategory] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const list = useQuery<Notif[]>(
    () =>
      query<Notif[]>(getSupabaseBrowserClient(), 'notifications', (q) => {
        let b = q
          .select('id, title, content, category, type, action_url, is_read, created_at')
          .order('created_at', { ascending: false })
          .limit(limit);
        if (category !== 'all') b = b.eq('category', category);
        return b;
      }),
    [category, limit],
  );

  const markRead = useCallback(async (id: string) => {
    await query(getSupabaseBrowserClient(), 'notifications', (q) =>
      q.update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id),
    );
  }, []);

  const onOpen = async (n: Notif) => {
    if (!n.is_read) await markRead(n.id);
    if (n.action_url) router.push(n.action_url);
    else list.refetch();
  };

  const markAll = async () => {
    await query(getSupabaseBrowserClient(), 'notifications', (q) =>
      q.update({ is_read: true, read_at: new Date().toISOString() }).eq('is_read', false),
    );
    list.refetch();
  };

  const rows = list.data ?? [];
  const hasMore = rows.length >= limit;

  return (
    <>
      <StackHeader
        title="알림"
        action={
          <Button variant="ghost" size="sm" onClick={markAll}>
            모두 읽음
          </Button>
        }
      />
      <div className={screen.page}>
        <div className={screen.chipRow}>
          {CATEGORIES.map((c) => (
            <Button
              key={c.key}
              variant={category === c.key ? 'soft' : 'ghost'}
              size="sm"
              onClick={() => {
                setCategory(c.key);
                setLimit(PAGE);
              }}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {list.error ? (
          <Card>
            <EmptyState variant="error" title="알림을 불러오지 못했습니다" description={list.error} onRetry={list.refetch} />
          </Card>
        ) : list.loading && !list.data ? (
          <>
            <Skeleton variant="rect" height={72} />
            <Skeleton variant="rect" height={72} />
          </>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState title="알림이 없습니다" description="새로운 소식이 오면 여기에 표시됩니다." />
          </Card>
        ) : (
          <div className={screen.list}>
            {rows.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`${styles.item} ${n.is_read ? '' : styles.unread}`}
                onClick={() => onOpen(n)}
              >
                <span className={`${styles.dot} ${n.is_read ? styles.dotRead : ''}`} aria-hidden="true" />
                <span className={styles.itemMain}>
                  <span className={screen.metaRow}>
                    {n.type === 'urgent' ? <Badge variant="danger" size="sm">긴급</Badge> : null}
                    <span className={styles.itemTitle}>{n.title}</span>
                  </span>
                  <span className={styles.itemBody}>{n.content}</span>
                  <span className={styles.itemTime}>{relativeTime(n.created_at)}</span>
                </span>
              </button>
            ))}
            {hasMore ? (
              <Button variant="ghost" block onClick={() => setLimit((l) => l + PAGE)}>
                더 보기
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
