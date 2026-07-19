'use client';

// 결과 리더보드·포디움 (docs/15 §5.3) — 소스 fn_get_class_race_result(anon, Display-Safe).
//   실명 join(members)이 anon RLS에 의존하던 문제 해소 — RPC가 실명+거리/시간+순위만 반환.
//   생체지표(HR)·정산·개인정보 미포함. Watts/Calories 는 Display-Safe RPC 표면 밖(축 미제공).
import { useMemo, useState } from 'react';
import { StatusStrip } from '@/features/class-common';
import { usePolling } from '@/features/class-common';
import { rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRaceEvent } from './useRaceEvent';
import { themeForEvent, teamColorVar } from './device-theme';
import styles from './race.module.css';

type SortAxis = 'time' | 'distance' | 'spm';

/** fn_get_class_race_result.results[] 항목 (Display-Safe) */
interface ResultRow {
  finish_rank: number | null;
  member_name: string | null;
  lane_number: number | null;
  result_distance: number | null;
  result_time_sec: number | null;
  avg_spm: number | null;
  is_pr: boolean;
}

interface RaceResultData {
  event_id: string;
  name: string;
  race_format: string;
  status: string;
  results: ResultRow[];
}

const AXES: { key: SortAxis; label: string }[] = [
  { key: 'time', label: '완주시간' },
  { key: 'distance', label: 'Distance' },
  { key: 'spm', label: 'SPM' },
];

function fetchResults(eventId: string): Promise<Envelope<RaceResultData>> {
  return rpc<RaceResultData>(getSupabaseBrowserClient(), 'fn_get_class_race_result', {
    p_event_id: eventId,
  });
}

function sortRows(rows: ResultRow[], axis: SortAxis): ResultRow[] {
  const val = (r: ResultRow): number => {
    switch (axis) {
      case 'distance':
        return -(r.result_distance ?? 0);
      case 'spm':
        return -(r.avg_spm ?? 0);
      case 'time':
      default:
        return r.result_time_sec != null ? r.result_time_sec : Number.MAX_SAFE_INTEGER;
    }
  };
  return [...rows].sort((a, b) => val(a) - val(b));
}

function secToClock(sec: number | null): string {
  if (sec == null || sec <= 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}

function axisValue(r: ResultRow, axis: SortAxis): string {
  switch (axis) {
    case 'distance':
      return `${Math.round(r.result_distance ?? 0)}m`;
    case 'spm':
      return `${Math.round(r.avg_spm ?? 0)} SPM`;
    case 'time':
    default:
      return secToClock(r.result_time_sec);
  }
}

function rowKey(r: ResultRow, i: number): string {
  return `${r.lane_number ?? 'x'}-${r.finish_rank ?? 'x'}-${i}`;
}

export function RaceResult({ eventId }: { eventId: string | null }) {
  const event = useRaceEvent(eventId);
  const theme = themeForEvent(event.data?.event_type);
  const [axis, setAxis] = useState<SortAxis>('time');
  const { data, initialLoading } = usePolling<RaceResultData>(
    () =>
      eventId
        ? fetchResults(eventId)
        : Promise.resolve({ success: true, data: null, error: null }),
    30_000,
    [eventId],
  );

  const rows = useMemo(() => sortRows(data?.results ?? [], axis), [data, axis]);
  const podium = rows.slice(0, 3);
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean); // 2-1-3 무대

  return (
    <div className={styles.resultRoot} data-race-theme={theme}>
      <StatusStrip realtime={undefined} />
      <header className={styles.resultHead}>
        <h1 className={styles.resultTitle}>{event.data?.name ?? data?.name ?? 'RESULTS'}</h1>
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
                <div key={rowKey(r, place)} className={styles.podiumCol} data-place={place}>
                  <div className={styles.podiumName}>
                    {r.member_name ?? `레인 ${r.lane_number ?? '-'}`}
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
              <li key={rowKey(r, i)} className={styles.resultRow}>
                <span className={styles.resultRank}>{i + 1}</span>
                <span className={styles.resultName}>
                  {r.member_name ?? `레인 ${r.lane_number ?? '-'}`}
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
