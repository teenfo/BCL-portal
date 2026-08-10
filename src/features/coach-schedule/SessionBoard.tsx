'use client';

// 세션 운영 보드 (docs/04 §3.2) — 전면 전환. 출결/WOD/런시트/화이트보드 + 빠른 액션(고정 푸터).
// 단일 데이터 소스 fn_get_coach_session_board. Display-Safe: 코치 전용 화면(부상 플래그 인라인 허용).
import { useState } from 'react';
import { Tabs, Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { hhmm } from '@/features/coach-home/format';
import { ScreenControlPanel } from '@/features/coach-race';
import { AttendancePanel } from './AttendancePanel';
import { WodPanel } from './WodPanel';
import { RunbookPanel } from './RunbookPanel';
import { WhiteboardPanel } from './WhiteboardPanel';
import { QuickActions } from './QuickActions';
import type { SessionBoardData } from './types';
import styles from './session-board.module.css';

const TAB_ITEMS = [
  { key: 'attendance', label: '출결' },
  { key: 'wod', label: 'WOD' },
  { key: 'tv', label: 'TV 화면' },
  { key: 'runbook', label: '런시트' },
  { key: 'whiteboard', label: '화이트보드' },
];

export function SessionBoard({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const supabase = getSupabaseBrowserClient();
  const [tab, setTab] = useState('attendance');

  const board = useQuery<SessionBoardData>(
    () => rpc<SessionBoardData>(supabase, 'fn_get_coach_session_board', { p_session_id: sessionId }),
    [sessionId],
  );

  const data = board.data;

  return (
    <div className={styles.boardOverlay} role="dialog" aria-label="세션 운영 보드">
      <header className={styles.boardHeader}>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="닫기">← 목록</Button>
        <div className={styles.boardTitleWrap}>
          {data ? (
            <>
              <span className={styles.boardTitle}>{data.session.title}</span>
              <span className={styles.boardMeta}>
                {hhmm(data.session.start_time)}–{hhmm(data.session.end_time)}
                {data.session.race_linked ? ' · Race 연동' : ''}
              </span>
            </>
          ) : (
            <span className={styles.boardTitle}>세션 보드</span>
          )}
        </div>
        {data?.session.status === 'in_progress' ? <Badge variant="success">진행 중</Badge> : null}
      </header>

      <div className={styles.boardTabs}>
        <Tabs syncUrl={false} tabs={TAB_ITEMS} value={tab} onChange={setTab} aria-label="세션 보드 탭" />
      </div>

      <div className={styles.boardBody}>
        {board.loading ? (
          <Skeleton variant="rect" height={240} />
        ) : board.error || !data ? (
          <EmptyState
            variant="error"
            title="세션 보드를 불러오지 못했습니다"
            description={board.error ?? '배정된 세션이 아니거나 접근 권한이 없습니다.'}
            onRetry={board.refetch}
          />
        ) : (
          <>
            {tab === 'attendance' ? (
              <AttendancePanel sessionId={sessionId} board={data} onChanged={board.refetch} />
            ) : null}
            {tab === 'wod' ? <WodPanel sessionId={sessionId} /> : null}
            {tab === 'tv' ? (
              <TvControlTab sessionId={sessionId} facilityId={data.session.facility_id} />
            ) : null}
            {tab === 'runbook' ? (
              <RunbookPanel sessionId={sessionId} header={data.session} attendees={data.attendees} />
            ) : null}
            {tab === 'whiteboard' ? (
              <WhiteboardPanel sessionId={sessionId} attendees={data.attendees} />
            ) : null}
          </>
        )}
      </div>

      {data ? (
        <footer className={styles.boardFooter}>
          <QuickActions sessionId={sessionId} attendees={data.attendees} />
        </footer>
      ) : null}
    </div>
  );
}

// TV 화면 탭 — 스크린 원격제어(docs/05 §4.1)를 세션 보드에 상주(레이스 없는 일반 WOD 수업이
// 주 사용처). 세션에 배정된 미종료 레이스가 있으면 "레이스 시작"(open_race)도 함께 노출.
function TvControlTab({ sessionId, facilityId }: { sessionId: string; facilityId: string | null }) {
  const supabase = getSupabaseBrowserClient();
  const raceEvent = useQuery<{ id: string } | null>(
    () =>
      query<{ id: string }>(supabase, 'race_events', (q) =>
        q
          .select('id')
          .eq('session_id', sessionId)
          .not('status', 'in', '(completed,cancelled)')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ),
    [sessionId],
  );
  return (
    <ScreenControlPanel
      facilityId={facilityId}
      raceEventId={raceEvent.data?.id ?? null}
      sessionId={sessionId}
    />
  );
}
