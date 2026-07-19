'use client';

// 세션 보드 — 세션 화이트보드 (docs/04 §3.2(b-2), G-1·G-2)
// fn_get_session_wod_whiteboard: Rx+→Rx→Scaled 계층 + score_type 방향 정렬(서버 계산).
// 미기록 인원(체크인 대비)은 하단 별도 그룹. 코치 화면에는 note까지 표시(공개 표면 전달은 Class RPC 경유만).
//
// 코치 대리 입력(S-24): fn_record_session_wod_result(p_member_id) — 배정 코치/admin 게이트로 서버 검증.
// 미기록 체크인 인원에 대해 코치가 점수를 대신 입력한다(published WOD + 참가자 서버 재검증).
import { useMemo, useState } from 'react';
import { Card, Badge, Button, Input, Select, Modal, EmptyState, Skeleton, useToast } from '@/components/ui';
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

const SCORE_TYPE_OPTS = [
  { value: 'time', label: '시간(초)' },
  { value: 'reps', label: '횟수' },
  { value: 'rounds_reps', label: '라운드+횟수' },
  { value: 'weight', label: '중량' },
  { value: 'distance', label: '거리' },
  { value: 'calories', label: '칼로리' },
];
const RX_OPTS = [
  { value: 'rx_plus', label: 'Rx+' },
  { value: 'rx', label: 'Rx' },
  { value: 'scaled', label: 'Scaled' },
];

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
  const toast = useToast();
  const board = useQuery<Whiteboard>(
    () => rpc<Whiteboard>(supabase, 'fn_get_session_wod_whiteboard', { p_session_id: sessionId }),
    [sessionId],
  );
  const wb = board.data;

  // 대리 입력 대상(미기록 체크인 인원)
  const [proxyTarget, setProxyTarget] = useState<BoardAttendee | null>(null);
  const [scoreType, setScoreType] = useState('time');
  const [score, setScore] = useState('');
  const [rx, setRx] = useState('rx');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const missing = useMemo(() => {
    if (!wb) return [];
    const recorded = new Set(wb.results.map((r) => r.member_id));
    return attendees
      .filter((a) => a.checked_in || a.attendance_outcome === 'walk_in')
      .filter((a) => !recorded.has(a.member_id));
  }, [wb, attendees]);

  const openProxy = (a: BoardAttendee) => {
    setProxyTarget(a);
    setScoreType('time');
    setScore('');
    setRx('rx');
    setNote('');
  };

  const submitProxy = async () => {
    if (!proxyTarget) return;
    const numeric = Number(score);
    if (!score || Number.isNaN(numeric) || numeric <= 0) {
      toast.error('유효한 점수를 입력하세요.');
      return;
    }
    setBusy(true);
    const res = await rpc(supabase, 'fn_record_session_wod_result', {
      p_session_id: sessionId,
      p_score: numeric,
      p_score_type: scoreType,
      p_rx_status: rx,
      p_note: note || null,
      p_member_id: proxyTarget.member_id,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.error ?? '대리 입력에 실패했습니다.');
      return;
    }
    toast.success(`${proxyTarget.member_name} 기록을 입력했습니다.`);
    setProxyTarget(null);
    board.refetch();
  };

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

      {/* 미기록 인원 — 코치 대리 입력 */}
      {missing.length > 0 ? (
        <section className={styles.attendeeSection}>
          <h3 className={styles.groupTitle}>미기록 인원 ({missing.length})</h3>
          <p className={styles.hint}>체크인했지만 아직 점수가 없는 회원입니다. 코치가 대신 입력할 수 있습니다.</p>
          <div className={styles.missingList}>
            {missing.map((a) => (
              <div key={a.member_id} className={styles.missingRow}>
                <span className={styles.attendeeName}>{a.member_name}</span>
                <Button variant="soft" size="sm" onClick={() => openProxy(a)}>
                  대리 입력
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Modal
        open={proxyTarget !== null}
        onClose={() => setProxyTarget(null)}
        title={proxyTarget ? `${proxyTarget.member_name} 대리 입력` : '대리 입력'}
        size="sm"
      >
        <div className={styles.proxyForm}>
          <Select label="점수 유형" native value={scoreType} onChange={setScoreType} options={SCORE_TYPE_OPTS} />
          <Input
            label="점수"
            type="number"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            helper="시간형은 초 단위로 입력"
          />
          <Select label="Rx 구분" native value={rx} onChange={setRx} options={RX_OPTS} />
          <Input label="메모(선택)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className={styles.proxyActions}>
            <Button variant="ghost" size="sm" onClick={() => setProxyTarget(null)}>취소</Button>
            <Button variant="primary" size="sm" loading={busy} onClick={submitProxy}>기록 저장</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
