'use client';

// /class/rotation-hud — 스테이션 서킷 6분할 HUD (docs/05 §5.2). ?session={id}
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RotationHud } from '@/features/class-rotation';

function HudEntry() {
  const params = useSearchParams();
  return <RotationHud sessionId={params?.get('session') ?? null} />;
}

export default function RotationHudPage() {
  return (
    <Suspense fallback={null}>
      <HudEntry />
    </Suspense>
  );
}
