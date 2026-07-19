'use client';

// /admin/settings — 설정 (지점·시스템·사이트·권한·감사 5탭) (02-admin §3.14)
// Tabs(branch|system|site|roles|audit) — ?tab= URL 쿼리 SSOT(Tabs syncUrl 기본).
// 탭 목록 자체를 권한으로 게이트: branch/system/site/roles=settings.view, audit=audit.view.
// audit.view만 있는 사용자는 감사 탭만 보이고(기본 탭) settings 정보(PG키 유무·지점정보) 비노출.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tabs, Card } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { BranchTab } from './BranchTab';
import { SystemTab } from './SystemTab';
import { SiteTab } from './SiteTab';
import { RolesTab } from './RolesTab';
import { AuditTab } from './AuditTab';
import { IntegrationsTab } from './IntegrationsTab';
import styles from './settings.module.css';

type TabKey = 'branch' | 'system' | 'site' | 'integrations' | 'roles' | 'audit';

export function SettingsScreen() {
  const { can } = useMyPermissions();
  const searchParams = useSearchParams();
  const canSettings = can('settings', 'view');
  const canAudit = can('audit', 'view');

  // 권한별 노출 탭 — settings.view 그룹(branch/system/site/roles) + audit.view(audit)
  const visibleTabs = useMemo(() => {
    const list: { key: TabKey; label: string }[] = [];
    if (canSettings) {
      list.push(
        { key: 'branch', label: '지점' },
        { key: 'system', label: '시스템' },
        { key: 'site', label: '사이트' },
        { key: 'integrations', label: '연동' },
        { key: 'roles', label: '권한' },
      );
    }
    if (canAudit) list.push({ key: 'audit', label: '감사' });
    return list;
  }, [canSettings, canAudit]);

  const allowed = useMemo(() => new Set(visibleTabs.map((t) => t.key)), [visibleTabs]);
  const firstKey: TabKey = visibleTabs[0]?.key ?? 'branch';
  const initial = searchParams?.get('tab');
  const [tab, setTab] = useState<TabKey>(
    initial && allowed.has(initial as TabKey) ? (initial as TabKey) : firstKey,
  );

  // 진입 가드: 노출 가능한 탭이 하나도 없으면 접근 불가
  if (visibleTabs.length === 0) {
    return (
      <div className={styles.page}>
        <Card>
          <p>이 화면에 접근할 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  // 방어: 현재 선택 탭이 허용 목록에 없으면(권한 없는 ?tab= 직접 접근 등) 첫 노출 탭으로
  const activeTab: TabKey = allowed.has(tab) ? tab : firstKey;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>설정</h1>
          <p className={styles.subtitle}>지점·시스템·사이트·권한·감사 설정</p>
        </div>
      </header>

      <Tabs
        tabs={visibleTabs}
        value={activeTab}
        onChange={(k) => setTab(k as TabKey)}
        aria-label="설정 탭"
      />

      {activeTab === 'branch' && canSettings ? <BranchTab /> : null}
      {activeTab === 'system' && canSettings ? <SystemTab /> : null}
      {activeTab === 'site' && canSettings ? <SiteTab /> : null}
      {activeTab === 'integrations' && canSettings ? <IntegrationsTab /> : null}
      {activeTab === 'roles' && canSettings ? <RolesTab /> : null}
      {activeTab === 'audit' && canAudit ? <AuditTab /> : null}
    </div>
  );
}
