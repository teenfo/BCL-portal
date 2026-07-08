'use client';

// /admin/lockers — 락커 (02-admin §3.10). 진입 가드·권한은 admin/layout에서 처리.
import { LockersScreen } from '@/features/lockers/LockersScreen';

export default function AdminLockersPage() {
  return <LockersScreen />;
}
