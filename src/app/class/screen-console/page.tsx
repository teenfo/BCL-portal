'use client';

// /class/screen-console — 통합 스크린 콘솔 (docs/05 §3). ?mode=wod|live|timer|screen|split&facility={id}
// flow 모드는 URL 진입 대상이 아님 — 세그먼트 플랜이 코치 flow 명령으로만 전달되므로(§4.1)
// URL 단독 진입은 빈 화면이 된다. 원격 set_mode/flow 명령으로만 진입.
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ConsoleShell, type ConsoleMode } from '@/features/class-console';

const VALID: ConsoleMode[] = ['wod', 'live', 'timer', 'screen', 'split'];

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
