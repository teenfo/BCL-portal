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
} from '@/features/class-broadcast';
import styles from './coach-race.module.css';

const MODE_OPTS: { value: ConsoleMode; label: string }[] = [
  { value: 'wod', label: 'WOD' },
  { value: 'live', label: 'Live' },
  { value: 'timer', label: '타이머' },
  { value: 'screen', label: '스크린' },
  { value: 'split', label: '수업(2분할)' },
];

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
