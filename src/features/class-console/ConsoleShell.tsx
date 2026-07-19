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
import { RaceView } from '@/features/class-race';
import { WodMode } from './modes/WodMode';
import { LiveMode } from './modes/LiveMode';
import { ScreenMode } from './modes/ScreenMode';
import { SplitMode } from './modes/SplitMode';
import { TimerMode, type TimerModeHandle } from './modes/TimerMode';
import styles from './console.module.css';

const VALID_MODES: ConsoleMode[] = ['wod', 'live', 'timer', 'screen', 'split'];

export function ConsoleShell({ initialMode = 'screen' }: { initialMode?: ConsoleMode }) {
  const facilityId = useFacilityContext();
  const consoleId = useConsoleId();
  const [mode, setMode] = useState<ConsoleMode>(initialMode);
  const [identify, setIdentify] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // open_race 명령으로 진입하는 관전 화면. null이면 모드 스택 표시(§4b).
  const [raceEventId, setRaceEventId] = useState<string | null>(null);

  const timerRef = useRef<TimerModeHandle>(null);
  // timer 명령이 마운트보다 먼저 오면 마운트 후 재적용하기 위해 버퍼
  const pendingTimerRef = useRef<ConsoleCommandPayload['timer'] | null>(null);

  const onCommand = useCallback((payload: ConsoleCommandPayload) => {
    switch (payload.cmd) {
      case 'set_mode':
        if (payload.mode && VALID_MODES.includes(payload.mode)) {
          setRaceEventId(null); // 모드 전환 시 관전 화면 이탈
          setMode(payload.mode);
        }
        break;
      case 'timer':
        if (payload.timer) {
          if (timerRef.current) timerRef.current.apply(payload.timer);
          else pendingTimerRef.current = payload.timer; // ref 준비 전 보류
          setRaceEventId(null);
          // split 중이면 우측 타이머만 갱신하고 2분할 유지, 아니면 타이머 전체화면
          setMode((m) => (m === 'split' ? m : 'timer'));
        }
        break;
      case 'open_race':
        if (payload.event_id) setRaceEventId(payload.event_id);
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

  // TimerMode 표시(전체/2분할) 직후 보류 명령 적용
  useEffect(() => {
    if ((mode === 'timer' || mode === 'split') && pendingTimerRef.current && timerRef.current) {
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
        {/* split 모드: 좌측 = WOD 보드(+레이스 배정 패널). 우측은 아래 timerSlot이 채운다 */}
        <ModeLayer active={mode === 'split'}>
          {mode === 'split' ? <SplitMode facilityId={facilityId} /> : null}
        </ModeLayer>

        {/*
          TimerMode는 단일 인스턴스로 상시 마운트(rAF 엔진 연속성).
          timer=전체화면, split=우측 페인, 그 외=숨김 — DOM 재마운트 없이 위치만 전환.
        */}
        <div
          className={styles.timerSlot}
          data-slot={mode === 'timer' ? 'full' : mode === 'split' ? 'split' : 'hidden'}
          aria-hidden={mode !== 'timer' && mode !== 'split'}
        >
          <TimerMode ref={timerRef} />
        </div>
      </div>

      {/* open_race: 관전 화면으로 전환(full-bleed, anon·쓰기 없음) */}
      {raceEventId ? <RaceView eventId={raceEventId} /> : null}

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
