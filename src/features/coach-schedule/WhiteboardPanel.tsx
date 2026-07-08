'use client';

// 세션 보드 — 세션 화이트보드 (docs/04 §3.2(b-2), G-1·G-2)
// fn_get_session_wod_whiteboard: Rx+→Rx→Scaled 계층 + score_type 방향 정렬(서버 계산).
// 미기록 인원(체크인 대비)은 하단 별도 그룹. 코치 화면에는 note까지 표시(공개 표면 전달은 Class RPC 경유만).
//
// ⚠ FLAG(RPC 갭): docs §3.2(b-2)는 코치가 회원 대신 입력 시 fn_record_session_wod_result에
// 대상 member_id를 지정한다고 명세하나, 실제 RPC(sql/09 I2.1)는 current_member_id() 기반이라
// p_member_id 파라미터가 없다 → 코치 대리 입력(S-24) 구현 불가. 대리 입력 CTA는 비활성 처리.
import { useMemo } from 'react';
import { Card, Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { BoardAttendee } from './types';
import styles from './session-board.module.css';

interface WhiteboardResult {
  rank: number;
  member_id: string;
  member_name: string;
  avatar_url: string | null;
  score: number;
  score_type: string;
  rx_status: 'rx_plus' | 'rx' | 'scaled';
  note: string | null;
}

interface Whiteboard {
  wod_title: string;
  format: string | null;
  results: WhiteboardResult[];
}

const RX_LABEL: Record<string, string> = { rx_plus: 'Rx+', rx: 'Rx', scaled: 'Scaled' };

function fmtScore(score: number, type: string): string {
  if (type === 'time') {
    const m = Math.floor(score / 60);
    const s = Math.round(score % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${score}`;
}

export function WhiteboardPanel({
  sessionId,
  attendees,
}: {
  sessionId: string;
  attendees: BoardAttendee[];
}) {
  const supabase = getSupabaseBrowserClient();
  const board = useQuery<Whiteboard>(
    () => rpc<Whiteboard>(supabase, 'fn_get_session_wod_whiteboard', { p_session_id: sessionId }),
    [sessionId],
  );
  const wb = board.data;

  const missing = useMemo(() => {
    if (!wb) return [];
    const recorded = new Set(wb.results.map((r) => r.member_id));
    return attendees
      .filter((a) => a.checked_in || a.attendance_outcome === 'walk_in')
      .filter((a) => !recorded.has(a.member_id));
  }, [wb, attendees]);

  if (board.loading) return <Skeleton variant="rect" height={160} />;
  if (board.error || !wb) {
    return (
      <EmptyState
        variant="error"
        title="화이트보드"
        description={board.error ?? 'WOD가 게시되지 않았거나 화이트보드를 불러오지 못했습니다.'}
        onRetry={board.refetch}
      />
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.wbHead}>
        <span className={styles.wbTitle}>{wb.wod_title}</span>
        {wb.format ? <Badge variant="info" size="sm">{wb.format}</Badge> : null}
      </div>

      {wb.results.length === 0 ? (
        <EmptyState title="기록 없음" description="아직 입력된 점수가 없습니다." />
      ) : (
        <div className={styles.wbList}>
          {wb.results.map((r) => (
            <Card key={r.member_id}>
              <div className={styles.wbRow}>
                <span className={styles.wbRank}>{r.rank}</span>
                <div className={styles.wbInfo}>
                  <div className={styles.wbNameRow}>
                    <span className={styles.attendeeName}>{r.member_name}</span>
                    <Badge variant={r.rx_status === 'scaled' ? 'neutral' : 'success'} size="sm">
                      {RX_LABEL[r.rx_status]}
                    </Badge>
                  </div>
                  {r.note ? <span className={styles.wbNote}>{r.note}</span> : null}
                </div>
                <span className={styles.wbScore}>{fmtScore(r.score, r.score_type)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 미기록 인원 */}
      {missing.length > 0 ? (
        <section className={styles.attendeeSection}>
          <h3 className={styles.groupTitle}>미기록 인원 ({missing.length})</h3>
          <p className={styles.hint}>
            코치 대리 입력은 현재 RPC 미지원(fn_record_session_wod_result에 대상 member_id 파라미터 없음).
            회원 본인 앱에서 입력해야 합니다.
          </p>
          <div className={styles.missingList}>
            {missing.map((a) => (
              <div key={a.member_id} className={styles.missingRow}>
                <span className={styles.attendeeName}>{a.member_name}</span>
                <Button variant="ghost" size="sm" disabled>
                  대리 입력(미지원)
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
