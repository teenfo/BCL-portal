'use client';

// /class/screen-console — 통합 스크린 콘솔 (docs/05 §3). ?mode=wod|live|timer|screen&facility={id}
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConsoleShell, type ConsoleMode } from '@/features/class-console';

const VALID: ConsoleMode[] = ['wod', 'live', 'timer', 'screen'];

function ConsoleEntry() {
  const params = useSearchParams();
  const q = params?.get('mode');
  const initial: ConsoleMode = VALID.includes(q as ConsoleMode) ? (q as ConsoleMode) : 'screen';
  return <ConsoleShell initialMode={initial} />;
}

export default function ScreenConsolePage() {
  return (
    <Suspense fallback={null}>
      <ConsoleEntry />
    </Suspense>
  );
}
