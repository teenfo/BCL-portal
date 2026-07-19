'use client';

// /admin/attendance — 출석 (실시간 로그 + 리포트) (02-admin §3.3)
// Tabs(live|report) — ?tab= URL 쿼리 SSOT(Tabs syncUrl 기본).
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { AttendanceLive } from './AttendanceLive';
import { AttendanceReport } from './AttendanceReport';
import styles from './attendance.module.css';

type TabKey = 'live' | 'report';

export function AttendanceScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const initial = searchParams?.get('tab') === 'report' ? 'report' : 'live';
  const [tab, setTab] = useState<TabKey>(initial);

  if (!can('attendance', 'view')) {
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
        <h1 className={styles.title}>출석</h1>
      </header>

      <Tabs
        tabs={[
          { key: 'live', label: '실시간 로그' },
          { key: 'report', label: '리포트' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="출석 탭"
      />

      {tab === 'live' ? <AttendanceLive /> : <AttendanceReport />}
    </div>
  );
}
