'use client';

// 결과 리더보드·포디움 (docs/15 §5.3) — 소스 race_records(자동 적재분, live_state 사용 금지).
// 다각도 정렬 축 전환(ErgZone 벤치마크) + is_pr 배지. Display-Safe: 이름·기록·PR만.
import { useMemo, useState } from 'react';
import { StatusStrip } from '@/features/class-common';
import { usePolling } from '@/features/class-common';
import { query, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRaceEvent } from './useRaceEvent';
import { themeForEvent, teamColorVar } from './device-theme';
import styles from './race.module.css';

type SortAxis = 'time' | 'distance' | 'max_watts' | 'avg_watts' | 'calories';

interface ResultRow {
  id: string;
  member_id: string | null;
  lane_number: number | null;
  finish_rank: number | null;
  result_time: string | null;
  result_distance: number | null;
  calories_burned: number | null;
  avg_watts: number | null;
  max_watts: number | null;
  is_pr: boolean;
  members: { name: string } | null;
}

const AXES: { key: SortAxis; label: string }[] = [
  { key: 'time', label: '완주시간' },
  { key: 'distance', label: 'Distance' },
  { key: 'max_watts', label: 'Max W' },
  { key: 'avg_watts', label: 'Avg W' },
  { key: 'calories', label: 'Calories' },
];

function fetchResults(eventId: string): Promise<Envelope<ResultRow[]>> {
  // FLAG: members(name) join은 anon RLS 의존 — 미공개 시 이름 표시 실패(§6 화이트리스트상
  //   fn_get_class_race_result(event_id) anon RPC 신설 권장). 축약 필드는 race_records 공개 표면.
  return query<ResultRow[]>(getSupabaseBrowserClient(), 'race_records', (q) =>
    q
      .select(
        'id,member_id,lane_number,finish_rank,result_time,result_distance,calories_burned,avg_watts,max_watts,is_pr,members(name)',
      )
      .eq('event_id', eventId),
  );
}

function sortRows(rows: ResultRow[], axis: SortAxis): ResultRow[] {
  const val = (r: ResultRow): number => {
    switch (axis) {
      case 'distance':
        return -(r.result_distance ?? 0);
      case 'max_watts':
        return -(r.max_watts ?? 0);
      case 'avg_watts':
        return -(r.avg_watts ?? 0);
      case 'calories':
        return -(r.calories_burned ?? 0);
      case 'time':
      default:
        return r.result_time ? timeToSec(r.result_time) : Number.MAX_SAFE_INTEGER;
    }
  };
  return [...rows].sort((a, b) => val(a) - val(b));
}

function timeToSec(t: string): number {
  // INTERVAL 'HH:MM:SS' 또는 'MM:SS'
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(t) || 0;
}

function axisValue(r: ResultRow, axis: SortAxis): string {
  switch (axis) {
    case 'distance':
      return `${r.result_distance ?? 0}m`;
    case 'max_watts':
      return `${r.max_watts ?? 0}W`;
    case 'avg_watts':
      return `${r.avg_watts ?? 0}W`;
    case 'calories':
      return `${r.calories_burned ?? 0}cal`;
    case 'time':
    default:
      return r.result_time ? r.result_time.slice(-5) : '--:--';
  }
}

export function RaceResult({ eventId }: { eventId: string | null }) {
  const event = useRaceEvent(eventId);
  const theme = themeForEvent(event.data?.event_type);
  const [axis, setAxis] = useState<SortAxis>('time');
  const { data, initialLoading } = usePolling<ResultRow[]>(
    () =>
      eventId
        ? fetchResults(eventId)
        : Promise.resolve({ success: true, data: [], error: null }),
    30_000,
    [eventId],
  );

  const rows = useMemo(() => sortRows(data ?? [], axis), [data, axis]);
  const podium = rows.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean); // 2-1-3 무대

  return (
    <div className={styles.resultRoot} data-race-theme={theme}>
      <StatusStrip realtime={undefined} />
      <header className={styles.resultHead}>
        <h1 className={styles.resultTitle}>{event.data?.name ?? 'RESULTS'}</h1>
        <div className={styles.axisTabs}>
          {AXES.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`${styles.axisTab} ${axis === a.key ? styles.axisTabActive : ''}`}
              onClick={() => setAxis(a.key)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </header>

      {initialLoading ? null : (
        <>
          <div className={styles.podium}>
            {podiumOrder.map((r) => {
              const place = rows.indexOf(r) + 1;
              return (
                <div key={r.id} className={styles.podiumCol} data-place={place}>
                  <div className={styles.podiumName}>
                    {r.members?.name ?? `레인 ${r.lane_number ?? '-'}`}
                    {r.is_pr ? <span className={styles.prTag}>PR</span> : null}
                  </div>
                  <div className={styles.podiumValue}>{axisValue(r, axis)}</div>
                  <div className={styles.podiumStand} style={{ background: teamColorVar(place - 1) }}>
                    {place}
                  </div>
                </div>
              );
            })}
          </div>

          <ol className={styles.resultList}>
            {rows.map((r, i) => (
              <li key={r.id} className={styles.resultRow}>
                <span className={styles.resultRank}>{i + 1}</span>
                <span className={styles.resultName}>
                  {r.members?.name ?? `레인 ${r.lane_number ?? '-'}`}
                  {r.is_pr ? <span className={styles.prTag}>PR</span> : null}
                </span>
                <span className={styles.resultValue}>{axisValue(r, axis)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
