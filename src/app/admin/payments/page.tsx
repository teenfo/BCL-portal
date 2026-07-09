'use client';

// /admin/payments — 결제 (거래·환불 + 환불 이력) (02-admin §3.4). 진입=payments.view.
import { PaymentsScreen } from '@/features/payments/PaymentsScreen';
import { PermissionGate } from '@/features/permissions';

export default function AdminPaymentsPage() {
  return (
    <PermissionGate group="payments">
      <PaymentsScreen />
    </PermissionGate>
  );
}
