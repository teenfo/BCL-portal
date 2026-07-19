'use client';

// /admin/badges — 배지 (02-admin §3.11). Tabs(definitions|awards) — ?tab= URL 쿼리 SSOT.
// 자동 판정은 fn_evaluate_badges(트리거 경유). 관리 화면은 정의 CRUD + 수여 조회/수동 부여·회수.
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { BadgeDefinitionsTab } from './BadgeDefinitionsTab';
import { BadgeAwardsTab } from './BadgeAwardsTab';
import styles from './badges.module.css';

type TabKey = 'definitions' | 'awards';

export function BadgesScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const initial: TabKey = searchParams?.get('tab') === 'awards' ? 'awards' : 'definitions';
  const [tab, setTab] = useState<TabKey>(initial);

  if (!can('badges', 'view')) {
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
        <h1 className={styles.title}>배지</h1>
      </header>

      <Tabs
        tabs={[
          { key: 'definitions', label: '배지 정의' },
          { key: 'awards', label: '수여 현황' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="배지 탭"
      />

      {tab === 'definitions' ? <BadgeDefinitionsTab /> : <BadgeAwardsTab />}
    </div>
  );
}
