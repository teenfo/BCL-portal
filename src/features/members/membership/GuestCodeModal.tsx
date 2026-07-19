'use client';

// 게스트(드롭인/체험) 데스크 체크인 코드 발권 모달 (G-7)
// fn_admin_issue_guest_code(p_payload {member_id, membership_id?, expires_at?}) → 6자리 코드 1회 표시(당일 만료)
import { useState } from 'react';
import { Modal, Button, Select, Input, Card, useToast } from '@/components/ui';
import { rpc } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { type Membership, MEMBERSHIP_STATUS_LABEL, fmtDateTime, rpcError } from '../types';
import styles from '../detail.module.css';

interface IssuedGuestCode {
  id: string;
  code: string;
  member_name: string;
  expires_at: string | null;
}

interface Props {
  memberId: string;
  memberName: string;
  /** 연결 가능한 현재 멤버십(선택) */
  memberships: Membership[];
  onClose: () => void;
}

export function GuestCodeModal({ memberId, memberName, memberships, onClose }: Props) {
  const toast = useToast();
  const [membershipId, setMembershipId] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedGuestCode | null>(null);

  const copyCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('클립보드에 복사했습니다.');
    } catch {
      toast.error('복사에 실패했습니다. 코드를 직접 선택해 복사하세요.');
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = { member_id: memberId };
    if (membershipId) payload.membership_id = membershipId;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime())) {
        setBusy(false);
        setError('만료 시각 형식이 올바르지 않습니다.');
        return;
      }
      payload.expires_at = d.toISOString();
    }
    const res = await rpc<IssuedGuestCode>(getSupabaseBrowserClient(), 'fn_admin_issue_guest_code', {
      p_payload: payload,
    });
    setBusy(false);
    if (!res.success || !res.data) {
      setError(rpcError(res.error));
      return;
    }
    setIssued(res.data);
  };

  // 발급 완료 — 6자리 코드 1회 표시
  if (issued) {
    return (
      <Modal
        open
        onClose={onClose}
        title="게스트 체크인 코드"
        size="sm"
        footer={
          <>
            <Button variant="soft" onClick={() => copyCode(issued.code)}>
              코드 복사
            </Button>
            <Button variant="primary" onClick={onClose}>
              확인
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <p className={styles.hint}>
            <strong>{issued.member_name}</strong>님이 데스크/키오스크에서 아래 코드를 입력해 체크인합니다.
          </p>
          <div className={styles.guestCodeBox}>
            <span className={styles.guestCode}>{issued.code}</span>
          </div>
          <div className={styles.preview}>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>만료</span>
              <span className={styles.previewValue}>{fmtDateTime(issued.expires_at)}</span>
            </div>
          </div>
          <p className={styles.errorText}>
            이 코드는 다시 표시되지 않으며 당일만 유효합니다. 지금 회원에게 전달하세요.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="게스트 코드 발권"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            코드 발급
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
        <p className={styles.hint}>
          드롭인/체험(게스트) <strong>{memberName}</strong>님의 당일 체크인용 6자리 코드를 발급합니다.
          코드는 발급 후 한 번만 표시됩니다.
        </p>
        {memberships.length > 0 ? (
          <Select
            label="연결 멤버십 (선택)"
            value={membershipId || null}
            onChange={setMembershipId}
            placeholder="연결 안 함"
            options={memberships.map((m) => ({
              value: m.id,
              label: `${m.membership_plans?.name ?? '요금제 미상'} · ${MEMBERSHIP_STATUS_LABEL[m.status]}`,
            }))}
          />
        ) : null}
        <Input
          label="만료 시각 (선택 · 미입력 시 당일 자동 만료)"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>
    </Modal>
  );
}
