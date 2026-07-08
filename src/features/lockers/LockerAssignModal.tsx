'use client';

// 락커 배정/변경 모달 (02-admin §3.10) — 회원 검색 → 이용 기간 설정 → occupied 전환.
// 전용 RPC 부재 → lockers 직접 update(admin RLS). ⏳ audit: 배정 audit_logs 미기록.
import { useEffect, useState } from 'react';
import { Modal, Button, Input, Card } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type Locker, writeError } from './types';
import styles from './lockers.module.css';

interface Props {
  locker: Locker;
  onClose: () => void;
  onDone: () => void;
}

interface MemberHit {
  id: string;
  name: string;
  phone: string | null;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function LockerAssignModal({ locker, onClose, onDone }: Props) {
  const toast = useToast();
  const client = getSupabaseBrowserClient();
  const isReassign = locker.status === 'occupied';

  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [target, setTarget] = useState<MemberHit | null>(
    isReassign && locker.assigned_member_id && locker.members
      ? { id: locker.assigned_member_id, name: locker.members.name, phone: locker.members.phone }
      : null,
  );
  const [startDate, setStartDate] = useState(locker.assigned_start_date ?? today());
  const [endDate, setEndDate] = useState(locker.assigned_end_date ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const search = useQuery<MemberHit[]>(
    () => {
      if (!debounced) return Promise.resolve({ success: true, data: [], error: null });
      const esc = debounced.replace(/[%,()]/g, ' ');
      return query<MemberHit[]>(client, 'members', (q) =>
        q.select('id,name,phone').or(`name.ilike.%${esc}%,phone.ilike.%${esc}%`).limit(8),
      );
    },
    [debounced],
  );
  const results = search.data ?? [];

  const doAssign = async () => {
    if (!target) {
      setError('배정할 회원을 선택하세요.');
      return;
    }
    if (!startDate) {
      setError('시작일을 선택하세요.');
      return;
    }
    if (endDate && endDate < startDate) {
      setError('종료일은 시작일보다 늦어야 합니다.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await query(client, 'lockers', (q) =>
      q
        .update({
          status: 'occupied',
          assigned_member_id: target.id,
          assigned_start_date: startDate,
          assigned_end_date: endDate || null,
        })
        .eq('id', locker.id),
    );
    setBusy(false);
    if (!res.success) {
      setError(writeError(res.error));
      return;
    }
    toast.success(isReassign ? '락커 배정을 변경했습니다.' : '락커를 배정했습니다.');
    onDone();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`${locker.locker_number}번 락커 ${isReassign ? '배정 변경' : '배정'}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant="primary" onClick={doAssign} loading={busy} disabled={!target}>
            {isReassign ? '변경' : '배정'}
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

        <Input
          label="회원 검색 (이름·전화)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="배정할 회원"
        />
        {results.length > 0 ? (
          <div className={styles.searchResults}>
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`${styles.searchItem}${target?.id === r.id ? ` ${styles.searchItemActive}` : ''}`}
                onClick={() => setTarget(r)}
              >
                <span>{r.name}</span>
                <span className={styles.hint}>{r.phone ?? '-'}</span>
              </button>
            ))}
          </div>
        ) : null}

        {target ? (
          <p className={styles.note}>
            선택된 회원: <strong>{target.name}</strong> ({target.phone ?? '-'})
          </p>
        ) : (
          <p className={styles.hint}>회원을 검색해 선택하세요.</p>
        )}

        <div className={styles.formRow}>
          <Input
            label="시작일"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="종료일 (선택)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
