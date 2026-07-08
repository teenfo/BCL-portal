'use client';

// /admin/settings — 설정 (지점·시스템·사이트·권한·감사 5탭) (02-admin §3.14)
// Tabs(branch|system|site|roles|audit) — ?tab= URL 쿼리 SSOT(Tabs syncUrl 기본).
// 진입=settings.view. roles 탭 편집=super_admin 전용, audit 탭=audit.view 별도 그룹(각 탭 내부 게이트).
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { BranchTab } from './BranchTab';
import { SystemTab } from './SystemTab';
import { SiteTab } from './SiteTab';
import { RolesTab } from './RolesTab';
import { AuditTab } from './AuditTab';
import styles from './settings.module.css';

const TAB_KEYS = ['branch', 'system', 'site', 'roles', 'audit'] as const;
type TabKey = (typeof TAB_KEYS)[number];

export function SettingsScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const initial = searchParams?.get('tab');
  const [tab, setTab] = useState<TabKey>(
    TAB_KEYS.includes(initial as TabKey) ? (initial as TabKey) : 'branch',
  );

  // 진입 가드: settings.view 또는 audit.view(감사 탭 전용 접근) 중 하나라도 있어야 노출
  if (!can('settings', 'view') && !can('audit', 'view')) {
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
          <h1 className={styles.title}>설정</h1>
          <p className={styles.subtitle}>지점·시스템·사이트·권한·감사 설정</p>
        </div>
      </header>

      <Tabs
        tabs={[
          { key: 'branch', label: '지점' },
          { key: 'system', label: '시스템' },
          { key: 'site', label: '사이트' },
          { key: 'roles', label: '권한' },
          { key: 'audit', label: '감사' },
        ]}
        value={tab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="설정 탭"
      />

      {tab === 'branch' ? <BranchTab /> : null}
      {tab === 'system' ? <SystemTab /> : null}
      {tab === 'site' ? <SiteTab /> : null}
      {tab === 'roles' ? <RolesTab /> : null}
      {tab === 'audit' ? <AuditTab /> : null}
    </div>
  );
}
