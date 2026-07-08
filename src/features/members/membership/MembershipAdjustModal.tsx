'use client';

// 멤버십 조정 모달 (02-admin §3.2 membership)
// action: extend | hold | resume | credit_adjust — 사유 필수
// fn_admin_adjust_membership(p_membership_id, p_action, p_payload)
// (cancel은 상위에서 2단계 ConfirmModal 처리)
import { useState } from 'react';
import { Modal, Button, Input, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type Membership, rpcError } from '../types';
import styles from '../detail.module.css';

export type AdjustAction = 'extend' | 'hold' | 'resume' | 'credit_adjust';

const TITLE: Record<AdjustAction, string> = {
  extend: '멤버십 연장',
  hold: '홀딩 (일시정지)',
  resume: '재개',
  credit_adjust: '크레딧 조정',
};

interface Props {
  membership: Membership;
  action: AdjustAction;
  onClose: () => void;
  onDone: () => void;
}

export function MembershipAdjustModal({ membership, action, onClose, onDone }: Props) {
  const toast = useToast();
  const [days, setDays] = useState('');
  const [credits, setCredits] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const maxPauses = membership.membership_plans?.max_pauses ?? 0;
  const pausesLeft = Math.max(0, maxPauses - membership.pause_count);

  const submit = async () => {
    if (!reason.trim()) {
      setError('사유를 입력하세요.');
      return;
    }
    const payload: Record<string, unknown> = { reason: reason.trim() };
    if (action === 'extend') {
      if (!days.trim() && !credits.trim()) {
        setError('연장할 기간(일) 또는 크레딧을 입력하세요.');
        return;
      }
      if (days.trim()) payload.days = Number(days);
      if (credits.trim()) payload.credits = Number(credits);
    } else if (action === 'credit_adjust') {
      if (!delta.trim() || Number.isNaN(Number(delta))) {
        setError('조정할 크레딧 수(±)를 입력하세요.');
        return;
      }
      payload.delta = Number(delta);
    }

    setBusy(true);
    setError(null);
    const res = await rpc(getSupabaseBrowserClient(), 'fn_admin_adjust_membership', {
      p_membership_id: membership.id,
      p_action: action,
      p_payload: payload,
    });
    setBusy(false);
    if (!res.success) {
      setError(rpcError(res.error));
      return;
    }
    toast.success(`${TITLE[action]} 처리했습니다.`);
    onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={TITLE[action]}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            확정
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <Card variant="accent">
            <span className={styles.errorText}>{error}</span>
          </Card>
        ) : null}

        {action === 'extend' ? (
          <>
            <Input
              label="연장 기간 (일, 선택)"
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
            <Input
              label="추가 크레딧 (회, 선택)"
              type="number"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
            />
            <p className={styles.hint}>기간 또는 크레딧 중 하나 이상 입력하세요.</p>
          </>
        ) : null}

        {action === 'hold' ? (
          <p className={styles.hint}>
            홀딩 잔여 횟수: <strong>{pausesLeft}</strong> / {maxPauses}회. 재개 시 홀딩 일수만큼 종료일이
            자동 이월됩니다.
          </p>
        ) : null}

        {action === 'resume' ? (
          <p className={styles.hint}>홀딩 일수만큼 종료일이 이월되어 재개됩니다.</p>
        ) : null}

        {action === 'credit_adjust' ? (
          <>
            <Input
              label="크레딧 증감 (±)"
              type="number"
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              helper={`현재 잔여 ${membership.remaining_credits ?? 0}회 · 음수 잔여 불가`}
            />
          </>
        ) : null}

        <Input
          label="사유"
          multiline
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
    </Modal>
  );
}
