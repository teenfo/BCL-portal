'use client';

// 세션 보드 — 출결 패널 (docs/04 §3.2(a))
// 사실/판정 분리(원칙 ③): 코치는 checkins 사실을 수정 못하고 attendance_outcome 판정만 변경.
// fn_mark_attendance 단일 RPC(단건=items 1개, 일괄=다건). 부분 성공 반영. 일괄은 확인 다이얼로그 필수.
import { useMemo, useState } from 'react';
import { Card, Badge, Button, ConfirmModal, EmptyState, useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { flagTypeLabel } from '@/features/coach-home/format';
import {
  OUTCOME_LABEL,
  type SessionBoardData,
  type BoardAttendee,
  type MarkAction,
} from './types';
import styles from './session-board.module.css';

interface MarkResultItem {
  member_id: string;
  action: string;
  success: boolean;
  error: string | null;
}
interface MarkResponse {
  success_count: number;
  failure_count: number;
  results: MarkResultItem[];
}

const ACTIONS: { action: MarkAction; label: string; variant: 'soft' | 'danger' | 'ghost' }[] = [
  { action: 'checked_in', label: '체크인', variant: 'soft' },
  { action: 'no_show', label: '노쇼', variant: 'danger' },
  { action: 'late_cancel', label: '지각취소', variant: 'ghost' },
  { action: 'coach_excused', label: '사유결석', variant: 'ghost' },
];

function outcomeBadge(o: BoardAttendee['attendance_outcome']) {
  const v =
    o === 'checked_in' || o === 'walk_in'
      ? 'success'
      : o === 'no_show'
        ? 'danger'
        : o === 'late_cancel' || o === 'coach_excused'
          ? 'warning'
          : 'neutral';
  return <Badge variant={v} size="sm">{OUTCOME_LABEL[o]}</Badge>;
}

export function AttendancePanel({
  sessionId,
  board,
  onChanged,
}: {
  sessionId: string;
  board: SessionBoardData;
  onChanged: () => void;
}) {
  const toast = useToast();
  const supabase = getSupabaseBrowserClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const s = board.summary;
  const confirmed = board.attendees.filter((a) => a.booking_status === 'confirmed');
  const waitlist = board.attendees.filter((a) => a.booking_status === 'waitlisted');
  const pendingConfirmed = useMemo(
    () => confirmed.filter((a) => a.attendance_outcome === 'pending'),
    [confirmed],
  );

  const mark = async (items: { member_id: string; action: MarkAction }[]) => {
    const res = await rpc<MarkResponse>(supabase, 'fn_mark_attendance', {
      p_session_id: sessionId,
      p_items: items,
    });
    // 부분 성공: envelope.success=false여도 data에 결과가 있으면 표시
    const data = res.data;
    if (data && Array.isArray(data.results)) {
      if (data.failure_count > 0) {
        const failed = data.results.filter((r) => !r.success);
        toast.warning(`${data.success_count}건 처리 · ${data.failure_count}건 실패`);
        // 실패 사유 대표 1건 노출
        if (failed[0]) toast.error(`실패: ${failed[0].error ?? '알 수 없음'}`);
      } else {
        toast.success(`${data.success_count}건 처리했습니다.`);
      }
      onChanged();
      return;
    }
    toast.error(res.error ?? '출결 처리에 실패했습니다.');
  };

  const markOne = async (memberId: string, action: MarkAction) => {
    setBusy(`${memberId}:${action}`);
    await mark([{ member_id: memberId, action }]);
    setBusy(null);
  };

  const bulkNoShow = async () => {
    setBulkBusy(true);
    await mark(pendingConfirmed.map((a) => ({ member_id: a.member_id, action: 'no_show' as const })));
    setBulkBusy(false);
    setConfirmBulk(false);
  };

  const statTiles: { label: string; value: number; tone?: 'danger' | 'warning' }[] = [
    { label: '예약', value: s.confirmed },
    { label: '체크인', value: s.checked_in },
    { label: '대기', value: s.waitlisted, tone: 'warning' },
    { label: '미판정', value: s.pending, tone: 'warning' },
    { label: '노쇼', value: s.no_show, tone: 'danger' },
    { label: '지각취소', value: s.late_cancel },
    { label: '사유/현장', value: s.coach_excused + s.walk_in },
  ];

  return (
    <div className={styles.panel}>
      {/* 7통계 그리드 */}
      <div className={styles.statGrid}>
        {statTiles.map((t) => (
          <div key={t.label} className={styles.statTile}>
            <span className={styles.statValue}>{t.value}</span>
            <span className={styles.statLabel}>{t.label}</span>
          </div>
        ))}
      </div>

      {pendingConfirmed.length > 0 ? (
        <Button variant="danger" size="sm" onClick={() => setConfirmBulk(true)}>
          남은 미판정 {pendingConfirmed.length}명 전원 노쇼
        </Button>
      ) : null}

      {/* 예약자 명단 */}
      <section className={styles.attendeeSection}>
        <h3 className={styles.groupTitle}>예약자 ({confirmed.length})</h3>
        {confirmed.length === 0 ? (
          <EmptyState title="예약자가 없습니다" description="이 세션에는 확정 예약이 없습니다." />
        ) : (
          <div className={styles.attendeeList}>
            {confirmed.map((a) => (
              <Card key={a.booking_id}>
                <div className={styles.attendeeRow}>
                  <div className={styles.attendeeInfo}>
                    <div className={styles.attendeeTop}>
                      <span className={styles.attendeeName}>{a.member_name}</span>
                      {outcomeBadge(a.attendance_outcome)}
                      {a.checked_in ? <Badge variant="info" size="sm">사실:입장</Badge> : null}
                    </div>
                    {a.active_flags.length > 0 ? (
                      <div className={styles.flagLine}>
                        {a.active_flags.map((f, i) => (
                          <Badge
                            key={`${f.flag_type}-${i}`}
                            variant={f.severity === 'critical' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {flagTypeLabel(f.flag_type)}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.actionRow}>
                    {ACTIONS.map((act) => (
                      <Button
                        key={act.action}
                        variant={a.attendance_outcome === act.action ? 'primary' : act.variant}
                        size="sm"
                        loading={busy === `${a.member_id}:${act.action}`}
                        onClick={() => markOne(a.member_id, act.action)}
                      >
                        {act.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 대기열 */}
      {waitlist.length > 0 ? (
        <section className={styles.attendeeSection}>
          <h3 className={styles.groupTitle}>대기열 ({waitlist.length})</h3>
          <p className={styles.hint}>승격은 서버 자동 처리(공석 발생 시). 코치 수동 승격 없음.</p>
          <div className={styles.attendeeList}>
            {waitlist.map((a) => (
              <Card key={a.booking_id}>
                <div className={styles.attendeeRow}>
                  <span className={styles.attendeeName}>{a.member_name}</span>
                  <Badge variant="warning" size="sm">대기</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <ConfirmModal
        open={confirmBulk}
        title="전원 노쇼 처리"
        message={`미판정 ${pendingConfirmed.length}명을 모두 노쇼로 처리합니다. 정산 근거에 영향을 줄 수 있습니다.`}
        confirmLabel="전원 노쇼"
        variant="danger"
        loading={bulkBusy}
        onConfirm={bulkNoShow}
        onClose={() => setConfirmBulk(false)}
      />
    </div>
  );
}
