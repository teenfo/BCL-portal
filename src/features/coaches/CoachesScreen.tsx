'use client';

// /admin/coaches — 코치 (관리 + 성과) (02-admin §3.7)
// Tabs(manage|performance) — ?tab= URL 쿼리 SSOT(Tabs syncUrl 기본).
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { CoachManageTab } from './CoachManageTab';
import { CoachPerformanceTab } from './CoachPerformanceTab';
import styles from './coaches.module.css';

type TabKey = 'manage' | 'performance';

export function CoachesScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const initial = searchParams?.get('tab') === 'performance' ? 'performance' : 'manage';
  const [tab, setTab] = useState<TabKey>(initial);

  if (!can('coaches', 'view')) {
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
        <div>
          <h1 className={styles.title}>코치</h1>
          <p className={styles.subtitle}>코치 등록·계정 연결·급여 관리와 성과 분석</p>
        </div>
      </header>

      <Tabs
        tabs={[
          { key: 'manage', label: '코치 관리' },
          { key: 'performance', label: '성과 분석' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="코치 탭"
      />

      {tab === 'manage' ? <CoachManageTab /> : <CoachPerformanceTab />}
    </div>
  );
}
