'use client';

// /admin/crm — CRM (공지·배너 + 알림 + 지원) (02-admin §3.13)
// Tabs(content|notifications|support) — ?tab= URL 쿼리 SSOT.
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { CrmContent } from './CrmContent';
import { CrmNotifications } from './CrmNotifications';
import { CrmSupport } from './CrmSupport';
import styles from './crm.module.css';

type TabKey = 'content' | 'notifications' | 'support';
const TAB_KEYS: TabKey[] = ['content', 'notifications', 'support'];

export function CrmScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const param = searchParams?.get('tab');
  const initial: TabKey = TAB_KEYS.includes(param as TabKey) ? (param as TabKey) : 'content';
  const [tab, setTab] = useState<TabKey>(initial);

  if (!can('crm', 'view')) {
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
        <h1 className={styles.title}>CRM</h1>
      </header>

      <Tabs
        tabs={[
          { key: 'content', label: '공지·배너' },
          { key: 'notifications', label: '알림' },
          { key: 'support', label: '지원' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="CRM 탭"
      />

      {tab === 'content' ? <CrmContent /> : tab === 'notifications' ? <CrmNotifications /> : <CrmSupport />}
    </div>
  );
}
