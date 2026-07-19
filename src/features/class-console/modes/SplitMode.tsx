'use client';

// split 모드 — 수업 2분할 (docs/05 §3.2 확장). 좌측 = 오늘의 WOD 보드, 우측 = 타이머.
// 우측 타이머는 ConsoleShell이 상시 마운트한 단일 TimerMode 인스턴스를 우측 페인에
// 슬롯 배치한다(rAF 연속성) — SplitMode는 좌측 페인만 렌더한다.
//
// 좌측 하단: 현재 WOD의 session_id에 배정된 race_events가 있으면 "레이스 배정됨" 패널.
// 실제 관전 진입은 코치 리모컨 open_race 명령(§4b) — TV는 DB 쓰기 없음(anon SELECT만).
import { usePolling } from '@/features/class-common';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { fetchDisplayWod } from '../data';
import { WodBoard } from './WodBoard';
import styles from '../console.module.css';

interface AssignedRace {
  id: string;
  name: string | null;
}

/** 세션에 배정된 레이스 이벤트 조회 — race_events anon SELECT(§6.1). 최신 1건. */
function fetchAssignedRace(sessionId: string): Promise<Envelope<AssignedRace[]>> {
  return query<AssignedRace[]>(getSupabaseBrowserClient(), 'race_events', (q) =>
    q
      .select('id,name')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1),
  );
}

export function SplitMode({ facilityId }: { facilityId: string }) {
  const { data: wod, initialLoading } = usePolling(
    () => fetchDisplayWod(facilityId),
    60_000,
    [facilityId],
  );

  const sessionId = wod?.session_id ?? null;

  const { data: races } = usePolling(
    () =>
      sessionId
        ? fetchAssignedRace(sessionId)
        : Promise.resolve<Envelope<AssignedRace[]>>({ success: true, data: [], error: null }),
    30_000,
    [sessionId],
  );

  const assignedRace = races && races.length > 0 ? races[0] : null;

  return (
    <div className={styles.splitLeft}>
      {initialLoading ? (
        <div className={styles.splitWodPane} />
      ) : wod ? (
        <WodBoard data={wod} className={styles.splitWodPane} />
      ) : (
        <div className={styles.splitWodPane}>
          <div className={styles.wodEmptyTitle}>오늘 등록된 WOD가 없습니다</div>
        </div>
      )}

      {assignedRace ? (
        <div className={styles.splitRacePanel}>
          <span className={styles.splitRaceTag}>레이스 배정됨</span>
          <span className={styles.splitRaceName}>{assignedRace.name ?? '레이스'}</span>
          <span className={styles.splitRaceHint}>
            코치 리모컨에서 &lsquo;레이스 시작&rsquo;으로 관전 화면을 엽니다
          </span>
        </div>
      ) : null}
    </div>
  );
}
