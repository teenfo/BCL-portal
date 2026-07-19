'use client';

// 락커 생성/편집 모달 (02-admin §3.10) — 메타(번호/크기/요금/상태/메모).
// 배정(occupied)은 LockerAssignModal 경로. 전용 RPC 부재 → 직접 쓰기(admin RLS). ⏳ audit 미기록.
import { useEffect, useState } from 'react';
import { Modal, Button, Input, Select, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type Locker, type LockerSize, type LockerStatus, writeError } from './types';
import styles from './lockers.module.css';

interface Props {
  locker: Locker | null; // null = 신규
  onClose: () => void;
  onSaved: () => void;
}

interface FacilityRow {
  id: string;
  name: string;
}

export function LockerEditModal({ locker, onClose, onSaved }: Props) {
  const toast = useToast();
  const client = getSupabaseBrowserClient();
  const isEdit = locker != null;
  const isOccupied = locker?.status === 'occupied';

  const [facilityId, setFacilityId] = useState<string | null>(locker?.facility_id ?? null);
  const [number, setNumber] = useState(locker?.locker_number ?? '');
  const [size, setSize] = useState<LockerSize>(locker?.size ?? 'M');
  const [fee, setFee] = useState(String(locker?.monthly_fee ?? 0));
  // 배정 중 락커는 상태 변경 불가(해제 후에만). 미배정만 available/maintenance/disabled 전환.
  const [status, setStatus] = useState<LockerStatus>(locker?.status ?? 'available');
  const [memo, setMemo] = useState(locker?.memo ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  useEffect(() => {
    let alive = true;
    void query<FacilityRow[]>(client, 'facilities', (q) =>
      q.select('id, name').eq('is_active', true).order('name'),
    ).then((res) => {
      if (!alive || !res.success || !res.data) return;
      setFacilities(res.data);
      if (!isEdit) setFacilityId((cur) => cur ?? res.data?.[0]?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, [client, isEdit]);

  const doSave = async () => {
    if (!facilityId) {
      setError('지점을 선택하세요.');
      return;
    }
    if (!number.trim()) {
      setError('락커 번호를 입력하세요.');
      return;
    }
    const feeNum = Number(fee);
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      setError('월 요금은 0 이상이어야 합니다.');
      return;
    }
    // 배정 중이면 상태는 그대로 occupied 유지(회원 정보 보존). 그 외에만 status 변경.
    const base = {
      facility_id: facilityId,
      locker_number: number.trim(),
      size,
      monthly_fee: feeNum,
      memo: memo.trim() || null,
    };
    const payload = isOccupied ? base : { ...base, status };

    setSaving(true);
    setError(null);
    const res = isEdit
      ? await query(client, 'lockers', (q) => q.update(payload).eq('id', locker.id))
      : await query(client, 'lockers', (q) => q.insert(payload));
    setSaving(false);
    if (!res.success) {
      setError(writeError(res.error));
      return;
    }
    toast.success(isEdit ? '락커를 수정했습니다.' : '락커를 등록했습니다.');
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? '락커 편집' : '새 락커'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button variant="primary" onClick={doSave} loading={saving}>
            저장
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

        <div className={styles.formRow}>
          <Select
            label="지점"
            value={facilityId}
            onChange={(v) => setFacilityId(v)}
            placeholder={facilities.length === 0 ? '지점 불러오는 중…' : '지점 선택'}
            options={facilities.map((f) => ({ value: f.id, label: f.name }))}
          />
          <Input label="락커 번호" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>

        <div className={styles.formRow}>
          <Select
            label="크기"
            value={size}
            onChange={(v) => setSize(v as LockerSize)}
            options={[
              { value: 'S', label: '소' },
              { value: 'M', label: '중' },
              { value: 'L', label: '대' },
            ]}
          />
          <Input
            label="월 요금 (원)"
            type="number"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
          />
        </div>

        {isOccupied ? (
          <p className={styles.note}>
            배정 중인 락커입니다. 상태 변경은 [해제] 후에 가능합니다.
          </p>
        ) : (
          <Select
            label="상태"
            value={status}
            onChange={(v) => setStatus(v as LockerStatus)}
            options={[
              { value: 'available', label: '가용' },
              { value: 'maintenance', label: '점검' },
              { value: 'disabled', label: '비활성' },
            ]}
          />
        )}

        <Input label="메모 (선택)" multiline value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
    </Modal>
  );
}
