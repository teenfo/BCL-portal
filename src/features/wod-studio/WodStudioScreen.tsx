'use client';

// /admin/wod-studio — WOD 스튜디오 (02-admin §3.8)
// Tabs(templates | library) — ?tab= URL 동기. 진입 가드는 admin/layout, 화면 권한은 wod:view.
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Tabs } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { TemplatesTab } from './TemplatesTab';
import { LibraryTab } from './LibraryTab';
import styles from './wod-studio.module.css';

type TabKey = 'templates' | 'library';

const TABS = [
  { key: 'templates', label: 'WOD 템플릿' },
  { key: 'library', label: '동작 라이브러리' },
];

export function WodStudioScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const initial = searchParams?.get('tab') === 'library' ? 'library' : 'templates';
  const [tab, setTab] = useState<TabKey>(initial);

  if (!can('wod_studio', 'view')) {
    return (
      <div className={styles.page}>
        <Card>
          <p className={styles.noAccess}>이 화면에 접근할 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>WOD 스튜디오</h1>
      </header>

      <Tabs
        tabs={TABS}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="WOD 스튜디오 탭"
      />

      {tab === 'templates' ? <TemplatesTab /> : <LibraryTab />}
    </div>
  );
}
