'use client';
import { Suspense } from 'react';
import { PurchaseResultScreen } from '@/features/member-purchase';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PurchaseResultScreen result="success" />
    </Suspense>
  );
}
