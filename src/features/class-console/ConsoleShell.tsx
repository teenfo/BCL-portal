'use client';

// 통합 스크린 콘솔 셸 (docs/05 §3) — 공통 시계·상태 배지·모드 전환기·Realtime 명령 수신(§4).
// wod|live|timer|screen|split|flow 모드를 단일 앱에서 크로스페이드 전환. anon 공개 표면(§6).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useConsoleChannel,
  type ConsoleCommandPayload,
  type ConsoleMode,
  type TimerCommand,
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
import { FlowMode, type FlowViewState } from './modes/FlowMode';
import { TimerMode, type TimerModeHandle } from './modes/TimerMode';
import styles from './console.module.css';

const VALID_MODES: ConsoleMode[] = ['wod', 'live', 'timer', 'screen', 'split', 'flow'];
/** TimerMode 슬롯이 표시되는 모드(보류 타이머 명령 재적용 대상) */
const TIMER_VISIBLE_MODES: ConsoleMode[] = ['timer', 'split', 'flow'];

export function ConsoleShell({ initialMode = 'screen' }: { initialMode?: ConsoleMode }) {
  const facilityId = useFacilityContext();
  const consoleId = useConsoleId();
  const [mode, setMode] = useState<ConsoleMode>(initialMode);
  const [identify, setIdentify] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // open_race 명령으로 진입하는 관전 화면. null이면 모드 스택 표시(§4b).
  const [raceEventId, setRaceEventId] = useState<string | null>(null);
  // flow 명령 수신 상태 — 코치가 매 전환마다 전체 플랜을 재전송(멱등)하므로 TV는 최신 수신본만 보관
  const [flow, setFlow] = useState<FlowViewState | null>(null);
  // onCommand(콜백 메모이즈)에서 최신 flow를 읽기 위한 미러 — 의존성 추가 시 채널 재구독되므로 ref 사용
  const flowRef = useRef<FlowViewState | null>(null);

  const timerRef = useRef<TimerModeHandle>(null);
  // timer 명령이 마운트보다 먼저 오면 마운트 후 재적용하기 위한 큐
  //   (configure→start 2연속 발행이 표준 패턴 — 단일 슬롯이면 start만 남아 유실)
  const pendingTimerRef = useRef<TimerCommand[]>([]);

  const applyTimer = useCallback((cmd: TimerCommand) => {
    if (timerRef.current) timerRef.current.apply(cmd);
    else pendingTimerRef.current.push(cmd);
  }, []);

  const onCommand = useCallback(
    (payload: ConsoleCommandPayload) => {
      switch (payload.cmd) {
        case 'set_mode':
          if (payload.mode && VALID_MODES.includes(payload.mode)) {
            // flow는 플랜 상태가 있어야 렌더 가능 — flow 명령 없이 온 set_mode('flow')는 무시(빈 화면 방지)
            if (payload.mode === 'flow' && !flowRef.current) break;
            setRaceEventId(null); // 모드 전환 시 관전 화면 이탈
            setMode(payload.mode);
          }
          break;
        case 'timer':
          if (payload.timer) {
            applyTimer(payload.timer);
            setRaceEventId(null);
            // split·flow 중이면 타이머 페인만 갱신하고 레이아웃 유지, 아니면 타이머 전체화면
            setMode((m) => (m === 'split' || m === 'flow' ? m : 'timer'));
          }
          break;
        case 'flow': {
          const f = payload.flow;
          if (!f) break;
          if (f.action === 'stop') {
            flowRef.current = null;
            setFlow(null);
            // 수업 종료 = 전체 teardown — 숨은 타이머가 screen 모드에서 계속 구동·비프 울리는 것 방지
            applyTimer({ action: 'reset' });
            setRaceEventId(null);
            setMode((m) => (m === 'flow' ? 'screen' : m));
            break;
          }
          const segments = Array.isArray(f.segments) ? f.segments : [];
          if (segments.length === 0) break;
          const index = Math.min(Math.max(f.index ?? 0, 0), segments.length - 1);
          // 동일 세그먼트 재수신(화이트보드 정렬 변경·수업 시작 이중 탭·재동기 재전송)은
          // 타이머를 건드리지 않는다 — 진행 중 워크아웃이 0초로 리셋되는 것 방지.
          // 상태를 잃은 TV(재부팅 — prev=null)는 정상 재적용되어 복구된다.
          const prev = flowRef.current;
          const sameSegment =
            prev != null &&
            prev.index === index &&
            prev.sessionId === (f.session_id ?? null) &&
            JSON.stringify(prev.segments) === JSON.stringify(segments);
          const next: FlowViewState = {
            segments,
            index,
            sessionId: f.session_id ?? null,
            boardSort: f.board_sort ?? 'rank',
          };
          flowRef.current = next;
          setFlow(next);
          setRaceEventId(null);
          setMode('flow');
          if (!sameSegment) {
            // 세그먼트 진입 = 바인딩 타이머 자동 구성(+기본 자동 시작, preSeconds가 전환 여유)
            const seg = segments[index];
            if (seg?.timer) {
              applyTimer({ ...seg.timer, action: 'configure' });
              if (seg.autoStart !== false) applyTimer({ action: 'start' });
            } else {
              // 무타이머 세그먼트(브리핑 등) 진입 = 이전 타이머 정지 — 시계 카드 뒤에서
              // 구동 중이던 엔진의 비프(카운트다운·전환·엔드 차임)가 계속 울리는 것 방지
              applyTimer({ action: 'reset' });
            }
          }
          break;
        }
        case 'open_race':
          if (payload.event_id) setRaceEventId(payload.event_id);
          break;
        case 'refresh': {
          // key 재마운트로 상시 마운트 TimerMode의 엔진 상태가 소실됨 — flow 진행 중이면
          // 셸이 보유한 현재 세그먼트 타이머를 보류 큐로 복원(경과는 TV 무상태 규약상 0부터)
          const seg = flowRef.current?.segments[flowRef.current.index];
          if (seg?.timer) {
            pendingTimerRef.current.push({ ...seg.timer, action: 'configure' });
            if (seg.autoStart !== false) pendingTimerRef.current.push({ action: 'start' });
          }
          setRefreshKey((k) => k + 1);
          break;
        }
        case 'identify':
          setIdentify(true);
          setTimeout(() => setIdentify(false), 5000);
          break;
      }
    },
    [applyTimer],
  );

  const realtime = useConsoleChannel({ facilityId, consoleId, onCommand });

  // 개발 전용 검증 훅 — 외부망(Realtime) 차단 환경에서 명령 주입으로 화면 검증(/verify).
  // NODE_ENV 가드로 프로덕션 번들에서 제거된다. 전송 계층(useConsoleChannel)은 별도 검증.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as { __consoleCmd?: (p: ConsoleCommandPayload) => void }).__consoleCmd =
      onCommand;
  }, [onCommand]);

  // TimerMode 표시 모드 진입/refresh 재마운트 직후 보류 명령 큐 순차 적용
  useEffect(() => {
    if (TIMER_VISIBLE_MODES.includes(mode) && timerRef.current) {
      const queued = pendingTimerRef.current;
      pendingTimerRef.current = [];
      for (const cmd of queued) timerRef.current.apply(cmd);
    }
  }, [mode, refreshKey]);

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
        {/* flow 모드: 세그먼트 스트립+좌측 WOD/화이트보드. 우측은 timerSlot(flow 슬롯) */}
        <ModeLayer active={mode === 'flow'}>
          {mode === 'flow' && flow ? <FlowMode facilityId={facilityId} flow={flow} /> : null}
        </ModeLayer>

        {/*
          TimerMode는 단일 인스턴스로 상시 마운트(rAF 엔진 연속성).
          timer=전체화면, split=우측 페인, flow=스트립 아래 우측 페인, 그 외=숨김
          — DOM 재마운트 없이 위치만 전환.
        */}
        <div
          className={styles.timerSlot}
          data-slot={
            mode === 'timer'
              ? 'full'
              : mode === 'split'
                ? 'split'
                : mode === 'flow' && flow?.segments[flow.index]?.timer
                  ? 'flow'
                  : 'hidden'
          }
          aria-hidden={!TIMER_VISIBLE_MODES.includes(mode)}
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
