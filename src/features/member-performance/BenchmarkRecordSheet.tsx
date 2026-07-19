'use client';

// §1 벤치마크 자가 기록 — 본인 기록(fn_record_my_benchmark_result, member 스코프).
// admin/coach 게이트인 fn_record_member_benchmark_result 와 달리 식별자 미전달(current_member_id).
import { useMemo, useState } from 'react';
import { Button, Input, Select, Skeleton, EmptyState, useToast } from '@/components/ui';
import { BottomSheet } from '@/features/member-shell';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from './performance.module.css';

interface BenchmarkDef {
  id: string;
  name: string;
  metric_type: string;
  unit: string | null;
}

const RX = [
  { value: 'rx_plus', label: 'Rx+' },
  { value: 'rx', label: 'Rx' },
  { value: 'scaled', label: 'Scaled' },
];

const RECORD_ERROR_KO: Record<string, string> = {
  member_not_found: '회원 정보를 찾을 수 없습니다.',
  benchmark_not_found: '벤치마크를 찾을 수 없습니다.',
  invalid_result_value: '기록값을 올바르게 입력해주세요.',
  invalid_rx_status: 'Rx 구분이 올바르지 않습니다.',
  not_session_participant: '해당 세션 참가자만 기록할 수 있습니다.',
};

export function BenchmarkRecordSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [benchId, setBenchId] = useState<string | null>(null);
  const [rxStatus, setRxStatus] = useState('rx');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const defs = useQuery<BenchmarkDef[]>(
    () => rpc<BenchmarkDef[]>(getSupabaseBrowserClient(), 'fn_list_benchmark_definitions'),
    [],
  );

  const selected = useMemo(
    () => (defs.data ?? []).find((d) => d.id === benchId) ?? null,
    [defs.data, benchId],
  );
  const isTime = selected?.metric_type === 'time';

  const computeValue = (): number | null => {
    if (isTime) {
      const total = parseInt(minutes || '0', 10) * 60 + parseInt(seconds || '0', 10);
      return total > 0 ? total : null;
    }
    const v = parseFloat(value);
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const submit = async () => {
    if (!benchId) {
      toast.error('벤치마크 종목을 선택해주세요.');
      return;
    }
    const resultValue = computeValue();
    if (resultValue == null) {
      toast.error('기록값을 올바르게 입력해주세요.');
      return;
    }
    setBusy(true);
    const res = await rpc<{ is_pr: boolean; previous_best: number | null }>(
      getSupabaseBrowserClient(),
      'fn_record_my_benchmark_result',
      { p_benchmark_id: benchId, p_result_value: resultValue, p_rx_status: rxStatus },
    );
    setBusy(false);
    if (!res.success) {
      toast.error(RECORD_ERROR_KO[res.error ?? ''] ?? res.error ?? '기록 저장에 실패했습니다.');
      return;
    }
    if (res.data?.is_pr) toast.success('🎉 PR 달성! 새 기록이 저장되었습니다.');
    else toast.success('벤치마크 기록이 저장되었습니다.');
    onSaved();
    onClose();
  };

  return (
    <BottomSheet
      variant="auto"
      title="벤치마크 기록"
      onClose={onClose}
      footer={
        <Button variant="primary" block loading={busy} onClick={submit} disabled={defs.loading || !!defs.error}>
          저장
        </Button>
      }
    >
      {defs.loading ? (
        <Skeleton variant="rect" height={120} />
      ) : defs.error ? (
        <EmptyState variant="error" title="종목을 불러오지 못했습니다" description={defs.error} onRetry={defs.refetch} />
      ) : (
        <>
          <Select
            label="벤치마크 종목"
            native
            placeholder="종목 선택"
            value={benchId}
            onChange={setBenchId}
            options={(defs.data ?? []).map((b) => ({
              value: b.id,
              label: b.unit ? `${b.name} (${b.unit})` : b.name,
            }))}
          />

          {isTime ? (
            <div className={styles.segRow}>
              <Input label="분" type="number" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <Input label="초" type="number" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
            </div>
          ) : (
            <Input
              label="기록"
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              helper={selected?.unit ? `단위: ${selected.unit}` : undefined}
            />
          )}

          <Select label="Rx 구분" native options={RX} value={rxStatus} onChange={setRxStatus} />
        </>
      )}
    </BottomSheet>
  );
}
