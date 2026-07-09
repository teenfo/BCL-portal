'use client';

// Race Control — /coach/race/control?event_id= (docs/04 §3.4)
// 코치 UX 계약: 표준 진입 = 세션 보드 → "Race 수업 시작". 이벤트 결과/상태 표시 + 종료 처리.
//
// 결과/리더보드: fn_get_race_event_result · 종료: fn_finish_race_event(finish_rank 서버 계산).
// ⚠ FLAG(도메인 위임): 레인 배정/카운트다운→GO/BLE 모니터의 실제 제어 프로토콜은
// 15-race-system.md(정본) + Class Broadcast 계약(05 §4.1)이 소유. 여기선 결과·종료 제어만.
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Badge, Button, EmptyState, Skeleton, useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc, query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useState } from 'react';
import type { PacerConfig } from '@/features/class-race';
import { ScreenControlPanel } from './ScreenControlPanel';
import { PacerPanel } from './PacerPanel';
import styles from './coach-race.module.css';

interface EventResultRow {
  finish_rank: number | null;
  member_name: string | null;
  lane_number: number | null;
  result_distance: number | null;
  result_time_sec: number | null;
  avg_watts: number | null;
  avg_spm: number | null;
  is_pr: boolean;
}

interface EventResult {
  event_id: string;
  name: string;
  status: string;
  results: EventResultRow[];
}

export function RaceControl() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const toast = useToast();
  const eventId = params.get('event_id');
  const [finishing, setFinishing] = useState(false);

  const ev = useQuery<EventResult>(
    () =>
      eventId
        ? rpc<EventResult>(supabase, 'fn_get_race_event_result', { p_event_id: eventId })
        : Promise.resolve({ success: false, data: null, error: 'event_id 누락' }),
    [eventId],
  );

  // 이벤트 메타(지점 — 스크린 제어 채널 · 페이서 설정) — race_events anon/RLS SELECT
  const meta = useQuery<{ facility_id: string | null; pacer_config: PacerConfig | null } | null>(
    () =>
      eventId
        ? query<{ facility_id: string | null; pacer_config: PacerConfig | null }>(
            supabase,
            'race_events',
            (q) => q.select('facility_id,pacer_config').eq('id', eventId).maybeSingle(),
          )
        : Promise.resolve({ success: true, data: null, error: null }),
    [eventId],
  );

  const e = ev.data;
  const isCompleted = e?.status === 'completed';

  const finish = async () => {
    if (!eventId) return;
    setFinishing(true);
    const res = await rpc(supabase, 'fn_finish_race_event', { p_event_id: eventId });
    setFinishing(false);
    if (!res.success) { toast.error(res.error ?? '종료 처리 실패'); return; }
    toast.success('이벤트를 종료했습니다. 순위를 계산했습니다.');
    ev.refetch();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/coach/race')}>← 레이스 허브</Button>
        <h1 className={styles.title}>컨트롤 룸</h1>
      </header>

      {ev.loading ? (
        <Skeleton variant="rect" height={160} />
      ) : ev.error || !e ? (
        <Card>
          <EmptyState variant="error" title="이벤트를 불러오지 못했습니다" description={ev.error ?? '이벤트를 찾을 수 없습니다.'} onRetry={ev.refetch} />
        </Card>
      ) : (
        <>
          <Card title={e.name}>
            <div className={styles.controlMeta}>
              <Badge variant={isCompleted ? 'neutral' : 'success'} size="sm">{e.status}</Badge>
              <Badge variant="info" size="sm">{e.results.length}건 기록</Badge>
            </div>
            <div className={styles.controlActions}>
              <Button variant="danger" loading={finishing} disabled={isCompleted} onClick={finish}>
                {isCompleted ? '종료됨' : '레이스 종료'}
              </Button>
            </div>
            <p className={styles.muted}>
              레인 배정 · 카운트다운→GO · BLE 모니터의 실시간 제어는 Race 시스템(15) / Class Broadcast(05 §4.1)이
              소유합니다. 이 화면은 결과 확인 및 종료 처리를 담당합니다.
            </p>
          </Card>

          <Card title="결과">
            {e.results.length === 0 ? (
              <EmptyState title="기록 없음" description="아직 기록된 결과가 없습니다." />
            ) : (
              <div className={styles.leaderList}>
                {e.results.map((r, i) => (
                  <div key={i} className={styles.leaderRow}>
                    <span className={styles.leaderRank}>{r.finish_rank ?? '-'}</span>
                    <span className={styles.leaderName}>{r.member_name ?? `레인 ${r.lane_number ?? '?'}`}</span>
                    <b>
                      {r.result_distance ? `${Math.round(r.result_distance)}m` : ''}
                      {r.result_time_sec ? ` · ${Math.round(r.result_time_sec)}s` : ''}
                      {r.is_pr ? ' · PR' : ''}
                    </b>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 페이서 설정(§4b.5) + 스크린 원격제어(05 §4) — 이벤트 관리 중 사용 */}
          {/* meta 로드 완료 후 렌더 — PacerPanel 초기 상태를 저장된 config로 초기화(key 재마운트) */}
          {eventId && !meta.loading ? (
            <PacerPanel
              key={`${eventId}:${meta.data?.pacer_config?.enabled ? 'on' : 'off'}:${meta.data?.pacer_config?.split_500m ?? ''}`}
              eventId={eventId}
              initial={meta.data?.pacer_config ?? null}
              onSaved={meta.refetch}
            />
          ) : null}
          {!meta.loading ? (
            <ScreenControlPanel
              facilityId={meta.data?.facility_id ?? null}
              raceEventId={eventId ?? undefined}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
