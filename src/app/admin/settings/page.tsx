'use client';

// /admin/settings — 설정 (02-admin §3.14). 진입 가드·권한은 admin/layout에서 처리.
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export default function AdminSettingsPage() {
  return <SettingsScreen />;
}
