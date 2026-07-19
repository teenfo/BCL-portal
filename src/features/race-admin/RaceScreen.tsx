'use client';

// /admin/race — Race 운영 (02-admin §3.9). Tabs(events|devices|records) — ?tab= URL 쿼리 SSOT.
// Admin=이벤트/기기 관리 담당. BLE 제어·진행은 Coach/Class 소관(여기선 조회·관리 위주).
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { RaceEventsTab } from './RaceEventsTab';
import { RaceDevicesTab } from './RaceDevicesTab';
import { RaceRecordsTab } from './RaceRecordsTab';
import { RaceSimulatorTab } from './RaceSimulatorTab';
import styles from './race-admin.module.css';

type TabKey = 'events' | 'devices' | 'records' | 'simulate';

const TABS: TabKey[] = ['events', 'devices', 'records', 'simulate'];

export function RaceScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const q = searchParams?.get('tab');
  const initial: TabKey = TABS.includes(q as TabKey) ? (q as TabKey) : 'events';
  const [tab, setTab] = useState<TabKey>(initial);

  if (!can('race', 'view')) {
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
        <h1 className={styles.title}>Race 운영</h1>
      </header>

      <Tabs
        tabs={[
          { key: 'events', label: '이벤트' },
          { key: 'devices', label: 'PM5 기기' },
          { key: 'records', label: '기록 통계' },
          { key: 'simulate', label: '시뮬레이션' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="Race 탭"
      />

      {tab === 'events' ? <RaceEventsTab /> : null}
      {tab === 'devices' ? <RaceDevicesTab /> : null}
      {tab === 'records' ? <RaceRecordsTab /> : null}
      {tab === 'simulate' ? <RaceSimulatorTab /> : null}
    </div>
  );
}
