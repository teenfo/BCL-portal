'use client';

// 코치 스크린 원격제어 발행부 (docs/05 §4.1·§4.2) — class-console:{facility} Broadcast 발행.
// createConsolePublisher(계약 SSOT)로 모드 전환/새로고침/식별 명령을 발행하고,
// Class TV의 ConsoleShell(useConsoleChannel 구독)이 소비한다. DB 미경유(Broadcast 전용).
import { useEffect, useRef, useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import {
  createConsolePublisher,
  type ConsolePublisher,
  type ConsoleMode,
  type TimerCommand,
} from '@/features/class-broadcast';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './coach-race.module.css';

const MODE_OPTS: { value: ConsoleMode; label: string }[] = [
  { value: 'wod', label: 'WOD' },
  { value: 'live', label: 'Live' },
  { value: 'timer', label: '타이머' },
  { value: 'screen', label: '스크린' },
  { value: 'split', label: '수업(2분할)' },
];

interface PublishedWodMeta {
  title: string | null;
  format: string | null;
  time_cap_minutes: number | null;
  rounds: number | null;
}

/** 게시 WOD 포맷 → TV 타이머 구성(docs/05 §4.1 TimerCommand). 포맷별 기본값 포함 */
function wodTimerConfig(wod: PublishedWodMeta): { cmd: TimerCommand; label: string } {
  const cap = wod.time_cap_minutes ?? null;
  switch (wod.format) {
    case 'emom': {
      const rounds = wod.rounds ?? cap ?? 10;
      return {
        cmd: { action: 'configure', mode: 'emom', intervalSeconds: 60, totalRounds: rounds },
        label: `EMOM ${rounds}R`,
      };
    }
    case 'tabata': {
      const sets = wod.rounds ?? 8;
      return {
        cmd: { action: 'configure', mode: 'tabata', workSeconds: 20, restSeconds: 10, totalSets: sets },
        label: `TABATA 20/10 ×${sets}`,
      };
    }
    case 'amrap': {
      const min = cap ?? 20;
      return {
        cmd: { action: 'configure', mode: 'countdown', seconds: min * 60 },
        label: `AMRAP ${min}분`,
      };
    }
    default:
      // for_time·chipper·strength·custom — 타임캡 있으면 카운트다운, 없으면 카운트업
      return cap
        ? {
            cmd: { action: 'configure', mode: 'countdown', seconds: cap * 60 },
            label: `${(wod.format ?? 'WOD').toUpperCase()} ${cap}분`,
          }
        : { cmd: { action: 'configure', mode: 'countup' }, label: '카운트업' };
  }
}

/**
 * 시설 콘솔(TV) 원격제어 발행 UI. facilityId가 없으면 안내만 표시.
 * 발행은 인증 클라이언트(코치)에서만 — 계약 §4.1 송신 주체 규칙.
 */
/**
 * @param facilityId  콘솔 제어 채널 대상 시설
 * @param raceEventId 현재 세션에 배정된 레이스 이벤트 id — 있으면 "레이스 시작"(open_race) 노출
 * @param sessionId   (참고용) 배정 레이스가 속한 세션 — 표시/디버그용
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

  // 게시된 WOD 메타(포맷·타임캡) — 포맷 연동 타이머 프리셋용. 세션 컨텍스트에서만 조회
  const wodQ = useQuery<PublishedWodMeta | null>(
    () =>
      sessionId
        ? rpc<PublishedWodMeta | null>(getSupabaseBrowserClient(), 'fn_get_class_display_wod', {
            p_session_id: sessionId,
          })
        : Promise.resolve({ success: true, data: null, error: null }),
    [sessionId],
  );
  const wod = wodQ.data ?? null;
  const wodTimer = wod ? wodTimerConfig(wod) : null;

  const sendTimer = async (cmd: TimerCommand, msg: string) => {
    if (!pubRef.current) return;
    await pubRef.current.timer(cmd);
    notify(msg);
  };
  const startWodTimer = async () => {
    if (!pubRef.current || !wodTimer) return;
    // configure → start 순차 발행: TV는 timer(2분할이면 우측 유지) 화면으로 전환 후 즉시 구동
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
