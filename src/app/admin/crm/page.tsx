'use client';

// /admin/crm — CRM (02-admin §3.13). 진입 가드·권한은 admin/layout에서 처리.
import { CrmScreen } from '@/features/crm/CrmScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminCrmPage() {
  return (
    <PermissionGate group="crm">
      <CrmScreen />
    </PermissionGate>
  );
}
