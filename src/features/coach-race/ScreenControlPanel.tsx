'use client';

// 코치 스크린 원격제어 발행부 (docs/05 §4.1·§4.2) — class-console:{facility} Broadcast 발행.
// createConsolePublisher(계약 SSOT)로 모드 전환/수업 플로우/타이머/새로고침/식별 명령을 발행하고,
// Class TV의 ConsoleShell(useConsoleChannel 구독)이 소비한다. DB 미경유(Broadcast 전용).
//
// 수업 플로우(flow): 저장된 세그먼트 플랜(session_wods.segments) 우선, 없으면 포맷 기반
// 자동 제안(deriveFlowSegments). 매 전환마다 전체 플랜+인덱스를 재전송(멱등 — TV 무상태 수신).
import { useEffect, useRef, useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import {
  createConsolePublisher,
  type ConsolePublisher,
  type ConsoleMode,
  type FlowCommand,
  type FlowSegment,
  type TimerCommand,
} from '@/features/class-broadcast';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { deriveFlowSegments, describeSegmentTimer, wodTimerConfig, type WodTimerMeta } from './flow-plan';
import styles from './coach-race.module.css';

const MODE_OPTS: { value: ConsoleMode; label: string }[] = [
  { value: 'wod', label: 'WOD' },
  { value: 'live', label: 'Live' },
  { value: 'timer', label: '타이머' },
  { value: 'screen', label: '스크린' },
  { value: 'split', label: '수업(2분할)' },
];

/** fn_get_session_wod 반환(session_wods 행 + template 중첩) 중 패널이 쓰는 필드.
 *  코치 인증 RPC라 draft 플랜도 조회됨 — Draft만 저장한 세그먼트 플랜이 조용히
 *  자동 제안으로 폴백되던 결함 방지(적대적 리뷰 확정). 행 없음 = publish_state 'none'. */
interface SessionWodRow {
  publish_state?: 'none' | 'draft' | 'published' | 'archived';
  title_override?: string | null;
  format_override?: string | null;
  time_cap_override?: number | null;
  /** 코치 저장 세그먼트 플랜(session_wods.segments) — 빈 배열=미설정(자동 제안 폴백) */
  segments?: FlowSegment[] | null;
  template?: {
    title?: string | null;
    format_type?: string | null;
    time_cap_minutes?: number | null;
    rounds?: number | null;
  } | null;
}

/** sessionStorage에 영속된 플로우 진행 인덱스 읽기(storage 불가 환경은 null) */
function readStoredFlowIndex(key: string | null): number | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const v = sessionStorage.getItem(key);
    const n = v == null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * 시설 콘솔(TV) 원격제어 발행 UI. facilityId가 없으면 안내만 표시.
 * 발행은 인증 클라이언트(코치)에서만 — 계약 §4.1 송신 주체 규칙.
 */
/**
 * @param facilityId  콘솔 제어 채널 대상 시설
 * @param raceEventId 현재 세션에 배정된 레이스 이벤트 id — 있으면 "레이스 시작"(open_race) 노출
 * @param sessionId   배정 세션 — WOD 타이머 프리셋·수업 플로우·화이트보드 조회 대상
 */
export function ScreenControlPanel({
  facilityId,
  raceEventId = null,
  sessionId = null,
}: {
  facilityId: string | null;
  raceEventId?: string | null;
  sessionId?: string | null;
}) {
  const pubRef = useRef<ConsolePublisher | null>(null);
  const [active, setActive] = useState<ConsoleMode | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // 수업 플로우 진행 상태(코치 패널이 SSOT — TV는 수신 렌더만). null=미시작.
  // 세션 보드 탭 전환이 이 패널을 언마운트하므로 sessionStorage에 세션 단위로 영속 —
  // 재진입 시 '수업 시작'으로 오인해 index 0 재전송(TV 되감기)하는 사고 방지.
  const flowStoreKey = sessionId ? `bcl.flow-index:${sessionId}` : null;
  const [flowSync, setFlowSync] = useState<{ key: string | null; index: number | null }>(() => ({
    key: flowStoreKey,
    index: readStoredFlowIndex(flowStoreKey),
  }));
  // 마운트 유지 중 세션 변경 → 렌더 중 재적재(derived-state 패턴 — effect 경유 setState 금지 규칙)
  if (flowSync.key !== flowStoreKey) {
    setFlowSync({ key: flowStoreKey, index: readStoredFlowIndex(flowStoreKey) });
  }
  const flowIndex = flowSync.index;
  const setFlowIndex = (v: number | null) => {
    setFlowSync({ key: flowStoreKey, index: v });
    try {
      if (!flowStoreKey) return;
      if (v == null) sessionStorage.removeItem(flowStoreKey);
      else sessionStorage.setItem(flowStoreKey, String(v));
    } catch {
      /* storage 불가 환경 — 로컬 상태만 유지 */
    }
  };
  // 라이브 화이트보드 정렬(2-1 경쟁 강도 옵션 — 짐 문화에 맞게 선택)
  const [boardSort, setBoardSort] = useState<NonNullable<FlowCommand['board_sort']>>('rank');

  useEffect(() => {
    if (!facilityId) return;
    const pub = createConsolePublisher(facilityId, 'coach');
    pubRef.current = pub;
    return () => {
      pub.close();
      pubRef.current = null;
    };
  }, [facilityId]);

  const notify = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash((cur) => (cur === msg ? null : cur)), 1500);
  };

  const setMode = async (mode: ConsoleMode) => {
    if (!pubRef.current) return;
    await pubRef.current.setMode(mode);
    setActive(mode);
    notify(`${mode} 모드 전환 명령을 보냈습니다.`);
  };
  const refresh = async () => {
    if (!pubRef.current) return;
    await pubRef.current.refresh();
    notify('화면 새로고침 명령을 보냈습니다.');
  };
  const identify = async () => {
    if (!pubRef.current) return;
    await pubRef.current.identify();
    notify('화면 식별 명령을 보냈습니다.');
  };
  const openRace = async () => {
    if (!pubRef.current || !raceEventId) return;
    await pubRef.current.openRace(raceEventId);
    notify('레이스 관전 화면을 열었습니다.');
  };

  // 세션 WOD(draft 포함 — 코치 인증 fn_get_session_wod). 세션 컨텍스트에서만 조회
  const wodQ = useQuery<SessionWodRow | null>(
    () =>
      sessionId
        ? rpc<SessionWodRow | null>(getSupabaseBrowserClient(), 'fn_get_session_wod', {
            p_session_id: sessionId,
          })
        : Promise.resolve({ success: true, data: null, error: null }),
    [sessionId],
  );
  const wodRow = wodQ.data ?? null;
  const wodState = wodRow?.publish_state ?? 'none';
  // archived(폐기)는 none과 동일 취급 — 종전 published-only 조회의 제외 의미론 유지
  const wod: WodTimerMeta | null =
    wodRow && (wodState === 'draft' || wodState === 'published')
      ? {
          title: wodRow.title_override ?? wodRow.template?.title ?? null,
          format: wodRow.format_override ?? wodRow.template?.format_type ?? null,
          time_cap_minutes: wodRow.time_cap_override ?? wodRow.template?.time_cap_minutes ?? null,
          rounds: wodRow.template?.rounds ?? null,
        }
      : null;
  const wodTimer = wod ? wodTimerConfig(wod) : null;

  // 플로우 플랜 — 저장분(draft 포함, archived 제외) 우선, 없으면 자동 제안. 세션 없으면 플로우 비노출
  const savedSegments = wod ? wodRow?.segments : null;
  const segments: FlowSegment[] =
    Array.isArray(savedSegments) && savedSegments.length > 0
      ? savedSegments
      : deriveFlowSegments(wod);
  const flowAvailable = Boolean(sessionId);

  const sendFlow = async (index: number, action: 'start' | 'set' = 'set', sort = boardSort) => {
    if (!pubRef.current || !sessionId) return;
    await pubRef.current.flow({ action, segments, index, session_id: sessionId, board_sort: sort });
    setFlowIndex(index);
    setActive('flow');
  };
  const startFlow = async () => {
    await sendFlow(0, 'start');
    notify('수업 플로우를 시작했습니다.');
  };
  const stepFlow = async (delta: number) => {
    const next = Math.min(Math.max((flowIndex ?? 0) + delta, 0), segments.length - 1);
    if (next === flowIndex) return;
    await sendFlow(next);
    notify(`세그먼트: ${segments[next]?.name ?? next + 1}`);
  };
  // 상태를 잃은 TV(전원 순단·재부팅) 재동기 — 현재 세그먼트 전체 플랜 재전송.
  // 계약상 수신 TV는 세그먼트 타이머를 0부터 재시작하므로 복구 용도로만 사용.
  const resyncFlow = async () => {
    if (flowIndex == null) return;
    await sendFlow(flowIndex);
    notify('현재 세그먼트를 TV에 재전송했습니다 (타이머 재시작).');
  };
  const changeBoardSort = async (sort: NonNullable<FlowCommand['board_sort']>) => {
    setBoardSort(sort);
    if (flowIndex != null) await sendFlow(flowIndex, 'set', sort); // 진행 중이면 즉시 재전송
  };
  const stopFlow = async () => {
    if (!pubRef.current) return;
    await pubRef.current.flow({ action: 'stop' });
    setFlowIndex(null);
    setActive(null);
    notify('수업 플로우를 종료했습니다.');
  };

  const sendTimer = async (cmd: TimerCommand, msg: string) => {
    if (!pubRef.current) return;
    await pubRef.current.timer(cmd);
    if (msg) notify(msg);
  };
  const startWodTimer = async () => {
    if (!pubRef.current || !wodTimer) return;
    // configure → start 순차 발행: TV는 timer(2분할·flow면 우측 유지) 화면으로 전환 후 즉시 구동
    await pubRef.current.timer(wodTimer.cmd);
    await pubRef.current.timer({ action: 'start' });
    notify(`WOD 타이머 시작 — ${wodTimer.label}`);
  };
  const startCountdown = async (minutes: number) => {
    if (!pubRef.current) return;
    await pubRef.current.timer({ action: 'configure', mode: 'countdown', seconds: minutes * 60 });
    await pubRef.current.timer({ action: 'start' });
    notify(`${minutes}분 카운트다운 시작`);
  };

  return (
    <Card title="스크린 제어">
      {!facilityId ? (
        <p className={styles.muted}>
          지점 정보가 없어 스크린 제어를 사용할 수 없습니다. 이벤트에 지점을 지정하세요.
        </p>
      ) : (
        <div className={styles.screenControl}>
          <p className={styles.muted}>
            시설 내 모든 TV 콘솔에 화면 모드 전환 명령을 보냅니다. (특정 TV 지정은 향후 지원)
          </p>
          <div className={styles.modeRow}>
            {MODE_OPTS.map((m) => (
              <Button
                key={m.value}
                variant={active === m.value ? 'primary' : 'soft'}
                size="sm"
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </Button>
            ))}
          </div>

          {/* 수업 플로우 — 세그먼트 타임라인 원격 진행(저장 플랜 우선, 미설정 시 자동 제안) */}
          {flowAvailable ? (
            <div className={styles.timerControl}>
              <p className={styles.muted}>수업 플로우</p>
              {wodState === 'draft' ? (
                <p className={styles.muted}>
                  Draft 플랜 사용 중 — TV의 WOD 카드는 게시(Publish) 후 표시됩니다.
                </p>
              ) : null}
              <div className={styles.flowChips}>
                {segments.map((s, i) => (
                  <span
                    key={`${i}-${s.name}`}
                    className={styles.flowChip}
                    data-state={
                      flowIndex == null ? 'idle' : i === flowIndex ? 'active' : i < flowIndex ? 'done' : 'idle'
                    }
                  >
                    {i + 1}. {s.name}
                    <em>{describeSegmentTimer(s)}</em>
                  </span>
                ))}
              </div>
              <div className={styles.controlActions}>
                <span className={styles.muted}>화이트보드 정렬</span>
                {(
                  [
                    { v: 'rank', label: '점수순' },
                    { v: 'recent', label: '기록순' },
                    { v: 'name', label: '이름순' },
                  ] as const
                ).map((o) => (
                  <Button
                    key={o.v}
                    variant={boardSort === o.v ? 'soft' : 'ghost'}
                    size="sm"
                    onClick={() => changeBoardSort(o.v)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
              <div className={styles.controlActions}>
                {flowIndex == null ? (
                  <Button variant="primary" size="sm" onClick={startFlow}>
                    ▶ 수업 시작
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => stepFlow(-1)}>
                      ◀ 이전
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => stepFlow(1)}>
                      다음 세그먼트 ▶
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resyncFlow} title="상태를 잃은 TV 복구 — 현재 세그먼트 재전송(타이머 재시작)">
                      TV 재동기
                    </Button>
                    <Button variant="ghost" size="sm" onClick={stopFlow}>
                      종료
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : null}

          {/* 타이머 제어 — 게시 WOD 포맷 연동 프리셋 + 수동 제어 */}
          <div className={styles.timerControl}>
            <p className={styles.muted}>타이머</p>
            <div className={styles.controlActions}>
              {wodTimer ? (
                <Button variant="primary" size="sm" onClick={startWodTimer}>
                  ▶ WOD 타이머 시작 · {wodTimer.label}
                </Button>
              ) : sessionId ? (
                <span className={styles.muted}>게시된 WOD가 없어 포맷 타이머를 준비할 수 없습니다.</span>
              ) : null}
            </div>
            <div className={styles.controlActions}>
              {[10, 15, 20].map((m) => (
                <Button key={m} variant="soft" size="sm" onClick={() => startCountdown(m)}>
                  {m}분
                </Button>
              ))}
              <Button
                variant="soft"
                size="sm"
                onClick={() =>
                  void (async () => {
                    await sendTimer({ action: 'configure', mode: 'countup' }, '');
                    await sendTimer({ action: 'start' }, '카운트업 시작');
                  })()
                }
              >
                카운트업
              </Button>
              <Button variant="ghost" size="sm" onClick={() => sendTimer({ action: 'pause' }, '타이머 일시정지')}>
                일시정지
              </Button>
              <Button variant="ghost" size="sm" onClick={() => sendTimer({ action: 'start' }, '타이머 재개')}>
                재개
              </Button>
              <Button variant="ghost" size="sm" onClick={() => sendTimer({ action: 'reset' }, '타이머 리셋')}>
                리셋
              </Button>
            </div>
          </div>

          {raceEventId ? (
            <div className={styles.controlActions}>
              <Button
                variant="primary"
                size="sm"
                onClick={openRace}
                title={sessionId ? `세션 ${sessionId}` : undefined}
              >
                레이스 시작
              </Button>
            </div>
          ) : null}
          <div className={styles.controlActions}>
            <Button variant="ghost" size="sm" onClick={refresh}>
              화면 새로고침
            </Button>
            <Button variant="ghost" size="sm" onClick={identify}>
              화면 식별
            </Button>
          </div>
          {flash ? (
            <Badge variant="success" size="sm">
              {flash}
            </Badge>
          ) : null}
        </div>
      )}
    </Card>
  );
}
