'use client';

// 운영 화면 차단 시 안내 화면 (docs/04 §4.2) — 빈 화면/무한 스피너 금지.
// 상태별 안내문 + profile 링크 + 재판정(refetch) 버튼.
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import type { CoachContextStatus } from './CoachContext';
import styles from './coach-context.module.css';

const COPY: Record<
  CoachContextStatus,
  { badge: string; badgeVariant: 'neutral' | 'warning' | 'info'; title: string; body: string }
> = {
  unlinked: {
    badge: '미연결',
    badgeVariant: 'neutral',
    title: '계정이 아직 연결되지 않았습니다',
    body: '관리자에게 코치 계정 연결을 요청하세요. 연결이 완료되면 운영 화면을 사용할 수 있습니다.',
  },
  linked_unassigned: {
    badge: '배정 대기',
    badgeVariant: 'info',
    title: '배정된 수업이 없습니다',
    body: '계정은 연결되었지만 아직 배정된 세션이 없습니다. 관리자가 세션을 배정하면 자동으로 운영 화면이 열립니다.',
  },
  on_leave: {
    badge: '휴직',
    badgeVariant: 'warning',
    title: '휴직 상태입니다',
    body: '현재 휴직 처리되어 운영 화면 접근이 제한됩니다. 복직 처리는 관리자에게 문의하세요.',
  },
  linked_active: {
    badge: '활동 중',
    badgeVariant: 'info',
    title: '',
    body: '',
  },
};

export function CoachStateScreen({
  status,
  onRefresh,
}: {
  status: CoachContextStatus;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const copy = COPY[status];

  return (
    <div className={styles.gateWrap}>
      <Card>
        <div className={styles.gateInner}>
          <Badge variant={copy.badgeVariant}>{copy.badge}</Badge>
          <h1 className={styles.gateTitle}>{copy.title}</h1>
          <p className={styles.gateBody}>{copy.body}</p>
          <div className={styles.gateActions}>
            <Button variant="primary" onClick={() => router.replace('/coach/profile')}>
              내 프로필로 이동
            </Button>
            <Button variant="ghost" onClick={onRefresh}>
              상태 다시 확인
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
