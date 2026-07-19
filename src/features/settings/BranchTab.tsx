'use client';

// 설정 · 지점 탭 (02-admin §3.14 branch)
// 지점 정보(facilities) + 약관/개인정보/환불정책 원문 + 예약 정책(booking_policy JSONB, G-4·G-5).
// 쓰기 = facilities 직접 UPDATE(admin RLS). ⏳ audit: 전용 RPC 부재 — 후속 audit 대상.
// booking_policy는 예약 정책 단일 소스(계약 §6b) — 집행은 fn_book_with_credit 내부, 여기선 값만 편집.
import { useMemo, useState } from 'react';
import { Card, Button, Input, Checkbox, ConfirmModal, EmptyState, useToast } from '@/components/ui';
import { useMyPermissions } from '@/features/permissions';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type Facility, type BookingPolicy, DEFAULT_BOOKING_POLICY } from './types';
import styles from './settings.module.css';

export function BranchTab() {
  const toast = useToast();
  const { can } = useMyPermissions();
  const canEdit = can('settings', 'edit');

  const facility = useQuery<Facility>(
    () =>
      query<Facility>(getSupabaseBrowserClient(), 'facilities', (q) =>
        q
          .select(
            'id,name,address,phone,operating_hours,terms_of_service,privacy_policy,refund_policy,booking_policy,is_active',
          )
          .order('created_at', { ascending: true })
          .limit(1)
          .single(),
      ),
    [],
  );

  const f = facility.data;

  if (facility.loading) {
    return (
      <div className={styles.tabPanel}>
        <Card>
          <p className={styles.note}>불러오는 중…</p>
        </Card>
      </div>
    );
  }
  if (facility.error || !f) {
    return (
      <div className={styles.tabPanel}>
        <Card>
          <EmptyState
            variant="error"
            title="지점 정보를 불러오지 못했습니다"
            description={facility.error ?? '지점이 등록되어 있지 않습니다.'}
            onRetry={facility.refetch}
          />
        </Card>
      </div>
    );
  }

  return <BranchForm facility={f} canEdit={canEdit} onSaved={facility.refetch} toast={toast} />;
}

function BranchForm({
  facility,
  canEdit,
  onSaved,
  toast,
}: {
  facility: Facility;
  canEdit: boolean;
  onSaved: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [name, setName] = useState(facility.name);
  const [address, setAddress] = useState(facility.address ?? '');
  const [phone, setPhone] = useState(facility.phone ?? '');
  const [terms, setTerms] = useState(facility.terms_of_service ?? '');
  const [privacy, setPrivacy] = useState(facility.privacy_policy ?? '');
  const [refund, setRefund] = useState(facility.refund_policy ?? '');

  const bp: BookingPolicy = useMemo(
    () => facility.booking_policy ?? DEFAULT_BOOKING_POLICY,
    [facility.booking_policy],
  );
  const [openDays, setOpenDays] = useState(String(bp.booking_open_days));
  const [cancelHours, setCancelHours] = useState(String(bp.cancel_deadline_hours));
  const [weeklyCap, setWeeklyCap] = useState(bp.weekly_booking_cap != null ? String(bp.weekly_booking_cap) : '');
  const [creditForfeit, setCreditForfeit] = useState(bp.noshow_penalty.credit_forfeit);
  const [monthlyThreshold, setMonthlyThreshold] = useState(String(bp.noshow_penalty.monthly_threshold));
  const [restrictDays, setRestrictDays] = useState(String(bp.noshow_penalty.restrict_days));

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildPolicy = (): BookingPolicy => ({
    booking_open_days: Number(openDays) || 0,
    cancel_deadline_hours: Number(cancelHours) || 0,
    weekly_booking_cap: weeklyCap.trim() ? Number(weeklyCap) : null,
    noshow_penalty: {
      credit_forfeit: creditForfeit,
      monthly_threshold: Number(monthlyThreshold) || 0,
      restrict_days: Number(restrictDays) || 0,
    },
  });

  const doSave = async () => {
    if (!name.trim()) {
      setError('지점 이름을 입력하세요.');
      setConfirmOpen(false);
      return;
    }
    setSaving(true);
    setError(null);
    const res = await query(getSupabaseBrowserClient(), 'facilities', (q) =>
      q
        .update({
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          terms_of_service: terms.trim() || null,
          privacy_policy: privacy.trim() || null,
          refund_policy: refund.trim() || null,
          booking_policy: buildPolicy(),
        })
        .eq('id', facility.id),
    );
    setSaving(false);
    setConfirmOpen(false);
    if (!res.success) {
      setError(res.error ?? '저장에 실패했습니다.');
      return;
    }
    toast.success('지점 설정을 저장했습니다.');
    onSaved();
  };

  return (
    <div className={styles.tabPanel}>
      {error ? (
        <Card variant="accent">
          <span className={styles.errorText}>{error}</span>
        </Card>
      ) : null}

      <Card title="지점 정보">
        <div className={styles.form}>
          <Input label="지점 이름" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          <div className={styles.formRow}>
            <Input label="주소" value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canEdit} />
            <Input label="전화" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} />
          </div>
        </div>
      </Card>

      <Card title="약관 · 정책 문서">
        <div className={styles.form}>
          <Input label="이용약관" multiline value={terms} onChange={(e) => setTerms(e.target.value)} disabled={!canEdit} />
          <Input label="개인정보 처리방침" multiline value={privacy} onChange={(e) => setPrivacy(e.target.value)} disabled={!canEdit} />
          <Input label="환불정책" multiline value={refund} onChange={(e) => setRefund(e.target.value)} disabled={!canEdit} />
        </div>
      </Card>

      <Card title="예약 정책 (booking_policy)">
        <div className={styles.form}>
          <p className={styles.note}>
            예약 정책 단일 소스입니다(계약 §6b). 집행은 예약/취소 RPC 내부에서 이 값을 참조하며,
            변경은 신규 예약부터 적용됩니다. 집행 현황 열람은 출석 화면 리포트 탭에서 확인하세요.
          </p>
          <div className={styles.formRow}>
            <Input
              label="예약 오픈 일수 (D-n)"
              type="number"
              value={openDays}
              onChange={(e) => setOpenDays(e.target.value)}
              disabled={!canEdit}
            />
            <Input
              label="취소 마감 (시간 전)"
              type="number"
              value={cancelHours}
              onChange={(e) => setCancelHours(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <Input
            label="주간 예약 상한 (비우면 무제한)"
            type="number"
            value={weeklyCap}
            onChange={(e) => setWeeklyCap(e.target.value)}
            disabled={!canEdit}
          />
          <h4 className={styles.sectionTitle}>노쇼 페널티</h4>
          <Checkbox
            label="노쇼 시 크레딧 몰수"
            checked={creditForfeit}
            onChange={(e) => setCreditForfeit(e.target.checked)}
            disabled={!canEdit}
          />
          <div className={styles.formRow}>
            <Input
              label="월 노쇼 임계 횟수"
              type="number"
              value={monthlyThreshold}
              onChange={(e) => setMonthlyThreshold(e.target.value)}
              disabled={!canEdit}
            />
            <Input
              label="초과 시 예약 제한 (일)"
              type="number"
              value={restrictDays}
              onChange={(e) => setRestrictDays(e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </Card>

      {canEdit ? (
        <div className={styles.formActions}>
          <Button variant="primary" onClick={() => setConfirmOpen(true)} loading={saving}>
            저장
          </Button>
        </div>
      ) : null}

      <ConfirmModal
        open={confirmOpen}
        title="지점 설정 저장"
        variant="primary"
        confirmLabel="저장"
        loading={saving}
        message="지점 정보와 예약 정책을 저장합니다. 예약 정책 변경은 신규 예약부터 적용됩니다."
        onConfirm={doSave}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
