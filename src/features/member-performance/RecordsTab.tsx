'use client';

// §1 내 기록 + §1b 오늘의 WOD 기록/화이트보드 (docs/03 §3.4)
import { useState } from 'react';
import { Card, Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc, type Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatScore, formatDate, secToClock, RX_LABEL } from '@/features/member-shell';
import screen from '@/features/member-shell/screen.module.css';
import styles from './performance.module.css';
import { WodRecordSheet } from './WodRecordSheet';

interface BenchmarkBest {
  benchmark_id: string;
  name: string;
  metric_type: string;
  unit: string | null;
  best_value: number;
  attempt_count: number;
}
interface WodTimelineItem {
  id: string;
  session_date: string | null;
  wod_title: string | null;
  score: number;
  score_type: string;
  rx_status: string;
}
interface RaceRecord {
  id: string;
  event_name: string;
  event_date: string;
  result_time_sec: number | null;
  finish_rank: number | null;
  avg_watts: number | null;
  is_pr: boolean;
}
interface PerfProfile {
  benchmark_bests: BenchmarkBest[];
  wod_timeline: WodTimelineItem[];
  race_records: RaceRecord[];
  benchmark_pr_count: number;
}

interface WbResult {
  rank: number;
  member_id: string;
  member_name: string;
  score: number;
  score_type: string;
  rx_status: string;
  note: string | null;
}
interface Whiteboard {
  session_id: string;
  session_title: string;
  wod_title: string | null;
  results: WbResult[];
}
interface TodayWod {
  sessionId: string;
  whiteboard: Whiteboard | null;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function loadTodayWod(memberId: string): Promise<Envelope<TodayWod | null>> {
  const sb = getSupabaseBrowserClient();
  const iso = todayIso();
  const bookingsRes = await query<{ session_id: string }[]>(sb, 'bookings', (q) =>
    q
      .select('session_id, sessions!inner(session_date)')
      .eq('member_id', memberId)
      .or('status.eq.confirmed,attendance_outcome.eq.walk_in')
      .eq('sessions.session_date', iso)
      .limit(1),
  );
  const sessionId = bookingsRes.data?.[0]?.session_id;
  if (!sessionId) return { success: true, data: null, error: null };

  const wbRes = await rpc<Whiteboard>(sb, 'fn_get_session_wod_whiteboard', { p_session_id: sessionId });
  return {
    success: true,
    data: { sessionId, whiteboard: wbRes.success ? wbRes.data : null },
    error: null,
  };
}

export function RecordsTab({ memberId }: { memberId: string | null }) {
  const [sheet, setSheet] = useState(false);

  const perf = useQuery<PerfProfile>(
    () =>
      memberId
        ? rpc(getSupabaseBrowserClient(), 'fn_get_member_performance_profile', { p_member_id: memberId })
        : Promise.resolve<Envelope<PerfProfile>>({ success: false, data: null, error: '회원 정보가 없습니다.' }),
    [memberId],
  );

  const today = useQuery<TodayWod | null>(
    () =>
      memberId
        ? loadTodayWod(memberId)
        : Promise.resolve<Envelope<TodayWod | null>>({ success: true, data: null, error: null }),
    [memberId],
  );

  const wb = today.data?.whiteboard ?? null;
  const myResult = wb?.results.find((r) => r.member_id === memberId) ?? null;

  return (
    <>
      {/* §1b 오늘의 WOD 기록 카드 */}
      {today.data ? (
        <Card
          variant="accent"
          title="오늘의 WOD"
          action={
            <Button variant="soft" size="sm" onClick={() => setSheet(true)}>
              {myResult ? '기록 수정' : '기록 입력'}
            </Button>
          }
        >
          {wb ? (
            <>
              {wb.wod_title ? <p className={screen.strong}>{wb.wod_title}</p> : null}
              {myResult ? (
                <p className={screen.muted}>
                  내 기록 {formatScore(myResult.score, myResult.score_type)} · {RX_LABEL[myResult.rx_status]}
                </p>
              ) : (
                <p className={screen.muted}>아직 기록하지 않았어요. 오늘의 점수를 남겨보세요.</p>
              )}

              {/* 화이트보드 (Rx+→Rx→Scaled 계층 정렬) */}
              {wb.results.length > 0 ? (
                <div className={screen.section}>
                  <span className={styles.fieldLabel}>화이트보드</span>
                  {wb.results.map((r) => (
                    <div
                      key={r.member_id}
                      className={`${styles.wbRow} ${r.member_id === memberId ? styles.rankMe : ''}`}
                    >
                      <span className={styles.wbRank}>{r.rank}</span>
                      <span className={styles.wbName}>{r.member_name}</span>
                      <Badge variant="neutral" size="sm">{RX_LABEL[r.rx_status] ?? r.rx_status}</Badge>
                      <strong className={styles.recordValue}>{formatScore(r.score, r.score_type)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className={screen.muted}>오늘 세션에 아직 게시된 WOD가 없습니다.</p>
          )}
        </Card>
      ) : null}

      {perf.error ? (
        <Card>
          <EmptyState variant="error" title="기록을 불러오지 못했습니다" description={perf.error} onRetry={perf.refetch} />
        </Card>
      ) : perf.loading && !perf.data ? (
        <>
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={120} />
        </>
      ) : perf.data ? (
        <>
          {/* 벤치마크 베스트 */}
          <section className={screen.section}>
            <div className={screen.rowBetween}>
              <h2 className={screen.sectionTitle}>벤치마크 기록</h2>
              <Badge variant="accent">PR {perf.data.benchmark_pr_count}</Badge>
            </div>
            <Card>
              {perf.data.benchmark_bests.length === 0 ? (
                <EmptyState
                  title="아직 기록이 없습니다"
                  description="수업에서 벤치마크 WOD를 완료하면 여기에 베스트 기록이 쌓입니다."
                />
              ) : (
                perf.data.benchmark_bests.map((b) => (
                  <div key={b.benchmark_id} className={styles.recordRow}>
                    <div>
                      <p className={styles.recordName}>{b.name}</p>
                      <p className={screen.muted}>{b.attempt_count}회 시도</p>
                    </div>
                    <span className={styles.recordValue}>{formatScore(b.best_value, b.metric_type, b.unit)}</span>
                  </div>
                ))
              )}
            </Card>
          </section>

          {/* WOD 타임라인 */}
          {perf.data.wod_timeline.length > 0 ? (
            <section className={screen.section}>
              <h2 className={screen.sectionTitle}>최근 WOD 기록</h2>
              <Card>
                {perf.data.wod_timeline.map((w) => (
                  <div key={w.id} className={styles.recordRow}>
                    <div>
                      <p className={styles.recordName}>{w.wod_title ?? '데일리 WOD'}</p>
                      <p className={screen.muted}>
                        {formatDate(w.session_date)} · {RX_LABEL[w.rx_status] ?? w.rx_status}
                      </p>
                    </div>
                    <span className={styles.recordValue}>{formatScore(w.score, w.score_type)}</span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}

          {/* 레이스 기록 */}
          {perf.data.race_records.length > 0 ? (
            <section className={screen.section}>
              <h2 className={screen.sectionTitle}>레이스 기록</h2>
              <Card>
                {perf.data.race_records.map((r) => (
                  <div key={r.id} className={styles.recordRow}>
                    <div>
                      <p className={styles.recordName}>{r.event_name}</p>
                      <p className={screen.muted}>
                        {formatDate(r.event_date)}
                        {r.finish_rank ? ` · ${r.finish_rank}위` : ''}
                        {r.avg_watts ? ` · ${Math.round(r.avg_watts)}W` : ''}
                      </p>
                    </div>
                    <span className={styles.recordValue}>
                      {r.result_time_sec != null ? secToClock(r.result_time_sec) : '-'}
                      {r.is_pr ? ' ' : ''}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}
        </>
      ) : null}

      {sheet && today.data ? (
        <WodRecordSheet
          sessionId={today.data.sessionId}
          onClose={() => setSheet(false)}
          onSaved={() => {
            today.refetch();
            perf.refetch();
          }}
        />
      ) : null}
    </>
  );
}
