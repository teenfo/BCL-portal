'use client';

// 요금제 생성/편집 모달 (02-admin §3.5)
// 생성/수정은 fn_upsert_membership_plan(p_payload) RPC 경유 — 감사(audit_logs) 동반 원자 처리.
// 가격 변경 시 "신규 판매분부터 적용" 인라인 확인 단계(스냅샷 원칙).
import { useState } from 'react';
import { Modal, Button, Input, Select, Card, Checkbox } from '@/components/ui';
import { useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { MembershipPlan, PlanType, PlanKind, RefundTier } from './types';
import styles from './plans.module.css';

// fn_upsert_membership_plan 서버 error 코드 → 한글 메시지
const PLAN_SAVE_ERROR: Record<string, string> = {
  forbidden: '권한이 없습니다.',
  plan_not_found: '요금제를 찾을 수 없습니다.',
};

interface Props {
  open: boolean;
  plan: MembershipPlan | null; // null = 신규
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  type: PlanType;
  plan_kind: PlanKind;
  duration_days: string;
  credit_count: string;
  price: string;
  discount_price: string;
  description: string;
  max_pauses: string;
  facility_sharing: boolean;
  is_active: boolean;
  penalty_rate_cap: string; // % 표기 0~10
  tiers: RefundTier[];
}

const emptyForm: FormState = {
  name: '',
  type: 'period',
  plan_kind: 'standard',
  duration_days: '30',
  credit_count: '',
  price: '0',
  discount_price: '',
  description: '',
  max_pauses: '0',
  facility_sharing: false,
  is_active: true,
  penalty_rate_cap: '10',
  tiers: [],
};

function fromPlan(p: MembershipPlan): FormState {
  return {
    name: p.name,
    type: p.type,
    plan_kind: p.plan_kind,
    duration_days: p.duration_days != null ? String(p.duration_days) : '',
    credit_count: p.credit_count != null ? String(p.credit_count) : '',
    price: String(p.price),
    discount_price: p.discount_price != null ? String(p.discount_price) : '',
    description: p.description ?? '',
    max_pauses: String(p.max_pauses),
    facility_sharing: p.facility_sharing,
    is_active: p.is_active,
    penalty_rate_cap: String(Math.round((p.refund_policy?.penalty_rate_cap ?? 0.1) * 100)),
    tiers: p.refund_policy?.tiers ?? [],
  };
}

export function PlanEditModal({ open, plan, onClose, onSaved }: Props) {
  const toast = useToast();
  // 모달은 열릴 때 key로 리마운트되므로(부모) 초기 상태를 initializer에서 계산 — effect 동기화 불필요.
  const [form, setForm] = useState<FormState>(() => (plan ? fromPlan(plan) : emptyForm));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmPrice, setConfirmPrice] = useState(false);

  const set =<K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addTier = () => set('tiers', [...form.tiers, { max_elapsed_days: 0, refund_rate: 0 }]);
  const updateTier = (i: number, patch: Partial<RefundTier>) =>
    set(
      'tiers',
      form.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    );
  const removeTier = (i: number) =>
    set('tiers', form.tiers.filter((_, idx) => idx !== i));

  const validate = (): string | null => {
    if (!form.name.trim()) return '요금제 이름을 입력하세요.';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return '가격은 0 이상이어야 합니다.';
    if (form.type === 'period') {
      const dd = Number(form.duration_days);
      if (!Number.isFinite(dd) || dd <= 0) return '기간제는 이용 기간(일)이 1 이상이어야 합니다.';
    } else {
      const cc = Number(form.credit_count);
      if (!Number.isFinite(cc) || cc <= 0) return '횟수권은 크레딧 수가 1 이상이어야 합니다.';
    }
    const cap = Number(form.penalty_rate_cap);
    if (!Number.isFinite(cap) || cap < 0 || cap > 10) return '위약금 상한율은 0~10% 범위여야 합니다.';
    return null;
  };

  const doSave = async () => {
    const client = getSupabaseBrowserClient();
    // id를 함께 담아 upsert RPC로 위임 (있으면 update, 없으면 insert). 감사 기록은 서버에서 동반.
    const payload = {
      ...(plan ? { id: plan.id } : {}),
      name: form.name.trim(),
      type: form.type,
      plan_kind: form.plan_kind,
      duration_days: form.type === 'period' ? Number(form.duration_days) : null,
      credit_count: form.type === 'count' ? Number(form.credit_count) : null,
      price: Number(form.price),
      discount_price: form.discount_price.trim() ? Number(form.discount_price) : null,
      description: form.description.trim() || null,
      max_pauses: Number(form.max_pauses) || 0,
      facility_sharing: form.facility_sharing,
      is_active: form.is_active,
      refund_policy: {
        formula: 'statutory_kr',
        penalty_rate_cap: Number(form.penalty_rate_cap) / 100,
        tiers: form.tiers,
      },
    };
    setSaving(true);
    setError(null);
    const res = await rpc<{ plan_id: string; created: boolean }>(
      client,
      'fn_upsert_membership_plan',
      { p_payload: payload },
    );
    setSaving(false);
    if (!res.success) {
      setError(PLAN_SAVE_ERROR[res.error ?? ''] ?? res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success(plan ? '요금제를 수정했습니다.' : '요금제를 생성했습니다.');
    onSaved();
  };

  const onPrimary = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    const priceChanged = plan != null && Number(form.price) !== plan.price;
    if (priceChanged && !confirmPrice) {
      setConfirmPrice(true);
      return;
    }
    void doSave();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={plan ? '요금제 편집' : '새 요금제'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={onPrimary} loading={saving}>
            {confirmPrice ? '변경 적용' : '저장'}
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
        {confirmPrice ? (
          <Card variant="accent">
            가격이 변경됩니다. 기존 판매된 멤버십은 스냅샷 원칙으로 불변이며,{' '}
            <strong>신규 판매분부터</strong> 새 가격이 적용됩니다. 계속하려면 [변경 적용]을 누르세요.
          </Card>
        ) : null}

        <Input
          label="요금제 이름"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />

        <div className={styles.formRow}>
          <Select
            label="유형"
            value={form.type}
            onChange={(v) => set('type', v as PlanType)}
            options={[
              { value: 'period', label: '기간제' },
              { value: 'count', label: '횟수권' },
            ]}
          />
          <Select
            label="구분 (plan_kind)"
            value={form.plan_kind}
            onChange={(v) => set('plan_kind', v as PlanKind)}
            options={[
              { value: 'standard', label: '정규' },
              { value: 'drop_in', label: '드롭인' },
              { value: 'trial', label: '체험' },
            ]}
          />
        </div>

        <div className={styles.formRow}>
          {form.type === 'period' ? (
            <Input
              label="이용 기간 (일)"
              type="number"
              value={form.duration_days}
              onChange={(e) => set('duration_days', e.target.value)}
            />
          ) : (
            <Input
              label="크레딧 수 (회)"
              type="number"
              value={form.credit_count}
              onChange={(e) => set('credit_count', e.target.value)}
            />
          )}
          <Input
            label="최대 홀딩 횟수"
            type="number"
            value={form.max_pauses}
            onChange={(e) => set('max_pauses', e.target.value)}
          />
        </div>

        <div className={styles.formRow}>
          <Input
            label="가격 (원)"
            type="number"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
          />
          <Input
            label="할인가 (원, 선택)"
            type="number"
            value={form.discount_price}
            onChange={(e) => set('discount_price', e.target.value)}
          />
        </div>

        <Input
          label="설명 (선택)"
          multiline
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />

        <Checkbox
          label="지점 간 공유 허용 (facility_sharing)"
          checked={form.facility_sharing}
          onChange={(e) => set('facility_sharing', e.target.checked)}
        />
        <Checkbox
          label="판매 활성 (끄면 숨김)"
          checked={form.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
        />

        {/* 환급 정책 */}
        <div className={styles.tiers}>
          <div className={styles.tiersHead}>
            <span>환급 정책 (refund_policy)</span>
            <Button variant="ghost" size="sm" onClick={addTier}>
              + 구간 추가
            </Button>
          </div>
          <Input
            label="위약금 상한율 (%) — 최대 10"
            type="number"
            value={form.penalty_rate_cap}
            onChange={(e) => set('penalty_rate_cap', e.target.value)}
          />
          {form.tiers.map((t, i) => (
            <div key={i} className={styles.tierRow}>
              <Input
                label="경과일 이하"
                type="number"
                value={String(t.max_elapsed_days)}
                onChange={(e) => updateTier(i, { max_elapsed_days: Number(e.target.value) })}
              />
              <Input
                label="환급률 (%)"
                type="number"
                value={String(Math.round(t.refund_rate * 100))}
                onChange={(e) => updateTier(i, { refund_rate: Number(e.target.value) / 100 })}
              />
              <Button variant="ghost" size="sm" onClick={() => removeTier(i)}>
                삭제
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
