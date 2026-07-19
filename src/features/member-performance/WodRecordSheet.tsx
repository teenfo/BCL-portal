'use client';

// §1b 오늘의 WOD 기록 입력 — 본인 기록(fn_record_session_wod_result). score_type별 폼 + rx_status.
import { useState } from 'react';
import { Button, Input, Select, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './performance.module.css';

const SCORE_TYPES = [
  { value: 'time', label: '시간 (For Time)' },
  { value: 'rounds_reps', label: '라운드+횟수 (AMRAP)' },
  { value: 'reps', label: '횟수 (Reps)' },
  { value: 'weight', label: '중량 (kg)' },
  { value: 'distance', label: '거리 (m)' },
  { value: 'calories', label: '칼로리 (cal)' },
];
const RX = [
  { value: 'rx_plus', label: 'Rx+' },
  { value: 'rx', label: 'Rx' },
  { value: 'scaled', label: 'Scaled' },
];

export function WodRecordSheet({
  sessionId,
  onClose,
  onSaved,
}: {
  sessionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [scoreType, setScoreType] = useState('time');
  const [rxStatus, setRxStatus] = useState('rx');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const computeScore = (): number | null => {
    if (scoreType === 'time') {
      const m = parseInt(minutes || '0', 10);
      const s = parseInt(seconds || '0', 10);
      const total = m * 60 + s;
      return total > 0 ? total : null;
    }
    if (scoreType === 'rounds_reps') {
      const r = parseInt(rounds || '0', 10);
      const rp = parseInt(reps || '0', 10);
      if (r <= 0 && rp <= 0) return null;
      return r + Math.min(99, rp) / 100; // rounds.reps 인코딩(reps 2자리)
    }
    const v = parseFloat(value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const submit = async () => {
    const score = computeScore();
    if (score == null) {
      setErr('점수를 올바르게 입력해주세요.');
      return;
    }
    setErr(null);
    setBusy(true);
    const res = await rpc(getSupabaseBrowserClient(), 'fn_record_session_wod_result', {
      p_session_id: sessionId,
      p_score: score,
      p_score_type: scoreType,
      p_rx_status: rxStatus,
      p_note: note || null,
    });
    setBusy(false);
    if (!res.success) {
      const map: Record<string, string> = {
        session_wod_not_published: '아직 게시된 WOD가 없습니다.',
        not_session_participant: '이 세션 참가자만 기록할 수 있습니다.',
        member_not_found: '회원 정보를 찾을 수 없습니다.',
      };
      toast.error(map[res.error ?? ''] ?? res.error ?? '기록 저장에 실패했습니다.');
      return;
    }
    toast.success('오늘의 WOD 기록이 저장되었습니다.');
    onSaved();
    onClose();
  };

  return (
    <BottomSheet
      variant="auto"
      title="오늘의 WOD 기록"
      onClose={onClose}
      footer={
        <Button variant="primary" block loading={busy} onClick={submit}>
          저장
        </Button>
      }
    >
      <Select label="기록 방식" native options={SCORE_TYPES} value={scoreType} onChange={setScoreType} />

      {scoreType === 'time' ? (
        <div className={styles.segRow}>
          <Input label="분" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <Input label="초" type="number" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
        </div>
      ) : scoreType === 'rounds_reps' ? (
        <div className={styles.segRow}>
          <Input label="라운드" type="number" inputMode="numeric" value={rounds} onChange={(e) => setRounds(e.target.value)} />
          <Input label="추가 횟수" type="number" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </div>
      ) : (
        <Input
          label="기록"
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={err}
        />
      )}

      <Select label="Rx 구분" native options={RX} value={rxStatus} onChange={setRxStatus} />
      <Input label="메모 (스케일 내용 등)" value={note} onChange={(e) => setNote(e.target.value)} helper="선택 입력" />
      {err && (scoreType === 'time' || scoreType === 'rounds_reps') ? (
        <p className={styles.errText}>{err}</p>
      ) : null}
    </BottomSheet>
  );
}
