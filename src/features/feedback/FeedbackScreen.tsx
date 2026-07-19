'use client';

// /admin/feedback — 피드백 (분석 + 응대) (02-admin §3.12)
// Tabs(analytics|inbox) — ?tab= URL 쿼리 SSOT. analytics 저평점 클릭 → inbox 해당 건 점프(?tab=inbox&id=).
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { FeedbackAnalytics } from './FeedbackAnalytics';
import { FeedbackInbox } from './FeedbackInbox';
import styles from './feedback.module.css';

type TabKey = 'analytics' | 'inbox';

export function FeedbackScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const initial: TabKey = searchParams?.get('tab') === 'inbox' ? 'inbox' : 'analytics';
  const [tab, setTab] = useState<TabKey>(initial);
  // analytics → inbox 점프 시 대상 피드백 id (딥링크 ?id= 도 초기값으로 반영)
  const [focusId, setFocusId] = useState<string | null>(searchParams?.get('id') ?? null);

  const jumpToInbox = (id: string) => {
    setFocusId(id);
    setTab('inbox');
  };

  if (!can('feedback', 'view')) {
    return (
      <div className={styles.page}>
        <Card>
          <p>이 화면에 접근할 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>피드백</h1>
      </header>

      <Tabs
        tabs={[
          { key: 'analytics', label: '분석' },
          { key: 'inbox', label: '응대' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="피드백 탭"
      />

      {tab === 'analytics' ? (
        <FeedbackAnalytics onJumpToInbox={jumpToInbox} />
      ) : (
        <FeedbackInbox focusId={focusId} onConsumeFocus={() => setFocusId(null)} />
      )}
    </div>
  );
}
