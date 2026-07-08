'use client';

// 통합 스크린 콘솔 셸 (docs/05 §3) — 공통 시계·상태 배지·모드 전환기·Realtime 명령 수신(§4).
// wod|live|timer|screen 4모드를 단일 앱에서 크로스페이드 전환. anon 공개 표면(§6).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useConsoleChannel,
  type ConsoleCommandPayload,
  type ConsoleMode,
} from '@/features/class-broadcast';
import {
  StatusStrip,
  IdentifyOverlay,
  SetupNotice,
  useConsoleId,
  useFacilityContext,
} from '@/features/class-common';
import { WodMode } from './modes/WodMode';
import { LiveMode } from './modes/LiveMode';
import { ScreenMode } from './modes/ScreenMode';
import { TimerMode, type TimerModeHandle } from './modes/TimerMode';
import styles from './console.module.css';

const VALID_MODES: ConsoleMode[] = ['wod', 'live', 'timer', 'screen'];

export function ConsoleShell({ initialMode = 'screen' }: { initialMode?: ConsoleMode }) {
  const facilityId = useFacilityContext();
  const consoleId = useConsoleId();
  const [mode, setMode] = useState<ConsoleMode>(initialMode);
  const [identify, setIdentify] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const timerRef = useRef<TimerModeHandle>(null);
  // timer 명령이 mode 전환보다 먼저 오면 마운트 후 재적용하기 위해 버퍼
  const pendingTimerRef = useRef<ConsoleCommandPayload['timer'] | null>(null);

  const onCommand = useCallback((payload: ConsoleCommandPayload) => {
    switch (payload.cmd) {
      case 'set_mode':
        if (payload.mode && VALID_MODES.includes(payload.mode)) setMode(payload.mode);
        break;
      case 'timer':
        if (payload.timer) {
          if (timerRef.current) timerRef.current.apply(payload.timer);
          else pendingTimerRef.current = payload.timer; // TimerMode 미마운트 시 보류
          setMode('timer');
        }
        break;
      case 'refresh':
        setRefreshKey((k) => k + 1);
        break;
      case 'identify':
        setIdentify(true);
        setTimeout(() => setIdentify(false), 5000);
        break;
    }
  }, []);

  const realtime = useConsoleChannel({ facilityId, consoleId, onCommand });

  // TimerMode 마운트 직후 보류 명령 적용
  useEffect(() => {
    if (mode === 'timer' && pendingTimerRef.current && timerRef.current) {
      timerRef.current.apply(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, [mode]);

  if (!facilityId) {
    return (
      <div className={styles.consoleRoot}>
        <SetupNotice />
      </div>
    );
  }

  return (
    <div className={styles.consoleRoot}>
      <StatusStrip facilityLabel={null} realtime={realtime} />

      {/* 크로스페이드: 각 모드는 절대배치 레이어, 활성만 opacity 1 (전환 400ms) */}
      <div className={styles.modeStack} key={refreshKey}>
        <ModeLayer active={mode === 'wod'}>
          {mode === 'wod' ? <WodMode facilityId={facilityId} /> : null}
        </ModeLayer>
        <ModeLayer active={mode === 'live'}>
          {mode === 'live' ? <LiveMode facilityId={facilityId} /> : null}
        </ModeLayer>
        <ModeLayer active={mode === 'screen'}>
          {mode === 'screen' ? <ScreenMode facilityId={facilityId} /> : null}
        </ModeLayer>
        <ModeLayer active={mode === 'timer'}>
          {/* TimerMode는 상시 마운트(rAF 엔진 연속성) */}
          <TimerMode ref={timerRef} />
        </ModeLayer>
      </div>

      {identify ? <IdentifyOverlay consoleId={consoleId} /> : null}
    </div>
  );
}

function ModeLayer({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className={`${styles.modeLayer} ${active ? styles.modeActive : ''}`} aria-hidden={!active}>
      {children}
    </div>
  );
}
