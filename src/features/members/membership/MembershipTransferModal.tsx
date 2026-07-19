'use client';

// 멤버십 양도 모달 (02-admin §3.2 membership)
// 대상 회원 검색 → 이관 미리보기 → 양측 회원명 confirm(되돌리기 불가)
// fn_admin_transfer_membership(p_membership_id, p_target_member_id, p_reason)
import { useEffect, useState } from 'react';
import { Modal, Button, Input, Card, ConfirmModal } from '@/components/ui';
import { useToast } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { query, rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type Membership, fmtDate, rpcError } from '../types';
import styles from '../detail.module.css';

interface TargetMember {
  id: string;
  name: string;
  phone: string | null;
}

interface Props {
  membership: Membership;
  sourceMemberName: string;
  onClose: () => void;
  onDone: () => void;
}

export function MembershipTransferModal({
  membership,
  sourceMemberName,
  onClose,
  onDone,
}: Props) {
  const toast = useToast();
  const client = getSupabaseBrowserClient();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [target, setTarget] = useState<TargetMember | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  const search = useQuery<TargetMember[]>(
    () => {
      if (!debounced) return Promise.resolve({ success: true, data: [], error: null });
      const esc = debounced.replace(/[%,()]/g, ' ');
      return query<TargetMember[]>(client, 'members', (q) =>
        q
          .select('id,name,phone')
          .neq('id', membership.member_id)
          .or(`name.ilike.%${esc}%,phone.ilike.%${esc}%`)
          .limit(8),
      );
    },
    [debounced, membership.member_id],
  );
  const results = search.data ?? [];

  const doTransfer = async () => {
    if (!target) return;
    if (!reason.trim()) {
      setError('사유를 입력하세요.');
      setConfirmOpen(false);
      return;
    }
    setBusy(true);
    const res = await rpc(client, 'fn_admin_transfer_membership', {
      p_membership_id: membership.id,
      p_target_member_id: target.id,
      p_reason: reason.trim(),
    });
    setBusy(false);
    setConfirmOpen(false);
    if (!res.success) {
      setError(rpcError(res.error));
      return;
    }
    toast.success('멤버십을 양도했습니다.');
    onDone();
  };

  return (
    <>
      <Modal
        open={!confirmOpen}
        onClose={onClose}
        title="멤버십 양도"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!reason.trim()) {
                  setError('사유를 입력하세요.');
                  return;
                }
                setError(null);
                setConfirmOpen(true);
              }}
              disabled={!target || !reason.trim()}
            >
              양도 진행
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
            label="대상 회원 검색 (이름·전화)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="이관 받을 회원"
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
            <div className={styles.preview}>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>양도자 → 대상</span>
                <span className={styles.previewValue}>
                  {sourceMemberName} → {target.name}
                </span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>이관 종료일</span>
                <span className={styles.previewValue}>{fmtDate(membership.end_date)}</span>
              </div>
              <div className={styles.previewRow}>
                <span className={styles.previewLabel}>이관 크레딧</span>
                <span className={styles.previewValue}>
                  {membership.remaining_credits != null
                    ? `${membership.remaining_credits}회`
                    : '해당 없음'}
                </span>
              </div>
            </div>
          ) : (
            <p className={styles.hint}>대상 회원을 검색해 선택하세요.</p>
          )}

          <Input
            label="양도 사유"
            multiline
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        title="멤버십 양도 확인"
        variant="danger"
        confirmLabel="양도"
        loading={busy}
        message={
          <>
            <strong>{sourceMemberName}</strong>님의 멤버십을 <strong>{target?.name}</strong>님에게
            양도합니다. 원본 멤버십은 취소되며 <strong>되돌릴 수 없습니다.</strong>
          </>
        }
        onConfirm={doTransfer}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
