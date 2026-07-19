'use client';

// 멤버십 발급 모달 (02-admin §3.2 membership)
// 요금제 선택 → 시작일 → 미리보기(종료일/크레딧 자동 계산) → 확정
// fn_admin_create_membership(p_member_id, p_plan_id, p_start_date)
import { useMemo, useState } from 'react';
import { Modal, Button, Select, Input, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { rpcError } from '../types';
import styles from '../detail.module.css';

export interface PlanOption {
  id: string;
  name: string;
  type: 'period' | 'count';
  duration_days: number | null;
  credit_count: number | null;
  price: number;
}

interface Props {
  memberId: string;
  plans: PlanOption[];
  onClose: () => void;
  onDone: () => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('ko-KR');
}

export function MembershipCreateModal({ memberId, plans, onClose, onDone }: Props) {
  const toast = useToast();
  const today = new Date().toISOString().slice(0, 10);
  const [planId, setPlanId] = useState<string>('');
  const [startDate, setStartDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const plan = useMemo(() => plans.find((p) => p.id === planId) ?? null, [plans, planId]);

  const preview = useMemo(() => {
    if (!plan) return null;
    if (plan.type === 'period') {
      return {
        end: plan.duration_days ? addDays(startDate, plan.duration_days) : '-',
        credits: '해당 없음',
      };
    }
    return { end: '무기한(횟수제)', credits: `${plan.credit_count ?? 0}회` };
  }, [plan, startDate]);

  const submit = async () => {
    if (!planId) {
      setError('요금제를 선택하세요.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await rpc(getSupabaseBrowserClient(), 'fn_admin_create_membership', {
      p_member_id: memberId,
      p_plan_id: planId,
      p_start_date: startDate,
    });
    setBusy(false);
    if (!res.success) {
      setError(rpcError(res.error));
      return;
    }
    toast.success('멤버십을 발급했습니다.');
    onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="멤버십 발급"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant="primary" onClick={submit} loading={busy} disabled={!planId}>
            발급
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
        <Select
          label="요금제"
          value={planId || null}
          onChange={setPlanId}
          placeholder="요금제 선택"
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} (${Math.round(p.price).toLocaleString('ko-KR')}원)`,
          }))}
        />
        <Input
          label="시작일"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        {preview ? (
          <div className={styles.preview}>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>종료일</span>
              <span className={styles.previewValue}>{preview.end}</span>
            </div>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>크레딧</span>
              <span className={styles.previewValue}>{preview.credits}</span>
            </div>
          </div>
        ) : (
          <p className={styles.hint}>요금제를 선택하면 종료일·크레딧 미리보기가 표시됩니다.</p>
        )}
        <p className={styles.hint}>
          현장 결제 연결은 결제 화면(/admin/payments)에서 거래 생성 후 진행하세요.
        </p>
      </div>
    </Modal>
  );
}
