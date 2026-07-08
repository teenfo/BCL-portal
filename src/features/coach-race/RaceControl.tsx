'use client';

// Race Control — /coach/race/control?event_id= (docs/04 §3.4)
// 코치 UX 계약: 표준 진입 = 세션 보드 → "Race 수업 시작". 이벤트 정보/상태 표시.
//
// ⚠ FLAG(도메인 위임): 레인 배정/카운트다운→GO→종료/BLE 모니터의 실제 제어 프로토콜은
// 15-race-system.md(정본) + Class Broadcast 계약(05 §4.1)이 소유. 코치용 제어 RPC/채널이
// 확정되면 이 화면의 제어부를 연결한다. 현재는 이벤트 컨텍스트 조회 + 진입점만 제공.
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './coach-race.module.css';

interface RaceEventDetail {
  id: string;
  name: string;
  event_date: string;
  race_format: string;
  status: string;
  lobby_status: string;
  session_id: string | null;
  target_distance_m: number | null;
  duration_minutes: number | null;
  group_target_m: number | null;
  heat_no: number;
}

export function RaceControl() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const eventId = params.get('event_id');

  const ev = useQuery<RaceEventDetail>(
    () =>
      eventId
        ? query<RaceEventDetail>(supabase, 'race_events', (q) =>
            q
              .select('id,name,event_date,race_format,status,lobby_status,session_id,target_distance_m,duration_minutes,group_target_m,heat_no')
              .eq('id', eventId)
              .maybeSingle(),
          )
        : Promise.resolve({ success: false, data: null, error: 'event_id 누락' }),
    [eventId],
  );

  const e = ev.data;

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
              <Badge variant="accent" size="sm">{e.race_format}</Badge>
              <Badge variant="info" size="sm">{e.lobby_status}</Badge>
              <Badge variant="neutral" size="sm">{e.status}</Badge>
              {e.heat_no > 1 ? <Badge variant="warning" size="sm">Heat {e.heat_no}</Badge> : null}
            </div>
            <div className={styles.controlGrid}>
              {e.target_distance_m ? <div><span>목표 거리</span><b>{e.target_distance_m}m</b></div> : null}
              {e.duration_minutes ? <div><span>제한 시간</span><b>{e.duration_minutes}분</b></div> : null}
              {e.group_target_m ? <div><span>공동 목표</span><b>{e.group_target_m}m</b></div> : null}
              {e.session_id ? <div><span>연동</span><b>세션</b></div> : <div><span>연동</span><b>미연동</b></div>}
            </div>
          </Card>

          <Card title="레이스 제어">
            <p className={styles.muted}>
              레인 배정 · 카운트다운→GO→종료 · BLE 모니터의 실제 제어는 Race 시스템(15) /
              Class Broadcast 계약(05 §4.1)에서 확정됩니다. 코치 제어부는 계약 확정 후 연결됩니다.
            </p>
            <div className={styles.controlActions}>
              <Button variant="soft" disabled>레인 자동 배정</Button>
              <Button variant="primary" disabled>카운트다운 시작</Button>
              <Button variant="danger" disabled>레이스 종료</Button>
            </div>
            {e.session_id ? (
              <Button variant="ghost" onClick={() => router.push(`/coach/schedule?session_id=${e.session_id}`)}>
                연동 세션 보드로
              </Button>
            ) : null}
          </Card>
        </>
      )}
    </div>
  );
}
