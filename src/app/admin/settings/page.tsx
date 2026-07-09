'use client';

// /admin/settings — 설정 (02-admin §3.14). 진입 가드·권한은 admin/layout에서 처리.
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminSettingsPage() {
  // 설정 진입은 settings 또는 audit 중 하나만 있어도 허용 (SettingsScreen이 탭 노출을 재차 분기)
  return (
    <PermissionGate group={['settings', 'audit']}>
      <SettingsScreen />
    </PermissionGate>
  );
}
