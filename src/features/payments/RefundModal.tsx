'use client';

// 환불 2단계 플로우 (docs/08 §1.2 🔒-1~5, §1.6)
//  1단계(preview): fn_calculate_refund 서버 계산을 read-only로 표시 + 사유 입력(필수). 금액은 클라 편집 불가(🔒-3).
//  2단계(confirm): "환불 ₩OO / 위약금 ₩OO 실행" 명시적 재확인 → fn_request_refund(approved 생성)
//                  → cancel-payment EF(confirm:true) 실행(fn_process_refund: 거래 refunded + 멤버십 cancelled + audit).
//  두 단계는 시각적으로 분리(🔒-2). 자동 실행 없음 — 2단계 확정 버튼을 눌러야만 실행.
import { useState } from 'react';
import { Modal, Button, Input, Badge, Skeleton } from '@/components/ui';
import { useQuery } from '@/lib/data/useQuery';
import { rpc } from '@/lib/supabase/query';
import type { Envelope } from '@/lib/supabase/query';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  type TransactionRow,
  type RefundCalc,
  krw,
  refundErrorMessage,
} from './types';
import styles from './payments.module.css';

interface RefundModalProps {
  transaction: TransactionRow;
  onClose: () => void;
  onDone: () => void;
}

type Step = 'preview' | 'confirm';

export function RefundModal({ transaction, onClose, onDone }: RefundModalProps) {
  const membershipId = transaction.membership_id;
  const [step, setStep] = useState<Step>('preview');
  const [reason, setReason] = useState('');
  const [executing, setExecuting] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);

  // 1단계: 서버 계산(read-only). membership_id 없으면 계산 불가 → 아래에서 차단 안내.
  const calc = useQuery<RefundCalc>(
    () =>
      membershipId
        ? rpc<RefundCalc>(getSupabaseBrowserClient(), 'fn_calculate_refund', {
            p_transaction_id: transaction.id,
            p_membership_id: membershipId,
          })
        : Promise.resolve({ success: false, data: null, error: 'membership_not_found' }),
    [transaction.id, membershipId],
  );

  const c = calc.data;
  const reasonOk = reason.trim().length > 0;

  const execute = async () => {
    if (!membershipId || !reasonOk) return;
    setExecuting(true);
    setExecError(null);
    const client = getSupabaseBrowserClient();

    // (2a) 승인 레코드 생성 — 서버가 fn_calculate_refund로 재계산·잠금 후 refunds(approved) 반환
    const reqRes = await rpc<RefundCalc>(client, 'fn_request_refund', {
      p_transaction_id: transaction.id,
      p_membership_id: membershipId,
      p_reason: reason.trim(),
    });
    if (!reqRes.success || !reqRes.data?.refund_id) {
      setExecuting(false);
      setExecError(refundErrorMessage(reqRes.error, '환불 요청에 실패했습니다.'));
      return;
    }

    // (2b) PG 취소 실행 — cancel-payment EF(fn_process_refund: 거래 refunded + 멤버십 cancelled + audit)
    const { data, error } = await client.functions.invoke('cancel-payment', {
      body: { refundId: reqRes.data.refund_id, confirm: true },
    });
    const efRes = (data ?? null) as Envelope<unknown> | null;
    setExecuting(false);
    if (error || !efRes?.success) {
      setExecError(refundErrorMessage(efRes?.error ?? error?.message, '환불 실행에 실패했습니다.'));
      return;
    }
    onDone();
  };

  const previewFooter = (
    <>
      <Button variant="ghost" onClick={onClose}>
        닫기
      </Button>
      <Button
        variant="primary"
        disabled={!c || !reasonOk || calc.loading}
        onClick={() => setStep('confirm')}
      >
        환불 실행 확인 →
      </Button>
    </>
  );

  const confirmFooter = (
    <>
      <Button variant="ghost" onClick={() => setStep('preview')} disabled={executing}>
        ← 이전
      </Button>
      <Button variant="danger" onClick={execute} loading={executing} disabled={!c}>
        환불 실행
      </Button>
    </>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title={step === 'preview' ? '환불 — 1단계 계산·미리보기' : '환불 — 2단계 확정 실행'}
      size="md"
      closeOnOverlay={false}
      footer={step === 'preview' ? previewFooter : confirmFooter}
    >
      <div className={styles.modalBody}>
        <span className={styles.stepMark}>
          <Badge variant={step === 'preview' ? 'info' : 'danger'} size="sm">
            {step === 'preview' ? 'STEP 1 / 2' : 'STEP 2 / 2'}
          </Badge>
          {step === 'preview' ? '서버 계산 확인 + 사유 입력' : '실행 재확인'}
        </span>

        <div className={styles.txMeta}>
          <div className={styles.txMetaRow}>
            <span className={styles.txMetaLabel}>회원</span>
            <span className={styles.txMetaValue}>{transaction.members?.name ?? '—'}</span>
          </div>
          <div className={styles.txMetaRow}>
            <span className={styles.txMetaLabel}>요금제</span>
            <span className={styles.txMetaValue}>{transaction.membership_plans?.name ?? '—'}</span>
          </div>
          <div className={styles.txMetaRow}>
            <span className={styles.txMetaLabel}>결제금액</span>
            <span className={styles.txMetaValue}>{krw(transaction.amount)}</span>
          </div>
        </div>

        {!membershipId ? (
          <p className={styles.errorText}>
            이 거래에는 연결된 멤버십이 없어 환불 금액을 계산할 수 없습니다.
          </p>
        ) : calc.loading ? (
          <Skeleton variant="rect" height={160} srLabel="환불 금액 계산 중" />
        ) : calc.error || !c ? (
          <p className={styles.errorText}>
            {refundErrorMessage(calc.error, '환불 금액을 계산하지 못했습니다.')}
          </p>
        ) : step === 'preview' ? (
          <>
            {/* 서버 계산 결과 — read-only(🔒-3). 클라이언트가 금액을 편집할 수 없다. */}
            <div className={styles.calc}>
              <div className={styles.calcRow}>
                <span>결제금액</span>
                <span className={styles.calcValue}>{krw(c.transaction_amount)}</span>
              </div>
              <div className={styles.calcRow}>
                <span>
                  이용분 공제 (
                  {c.basis === 'period' ? `${c.used_days}/${c.total_days}일` : `${c.used_days}/${c.total_days}회`}
                  )
                </span>
                <span className={styles.calcValue}>− {krw(c.used_amount)}</span>
              </div>
              <div className={styles.calcRow}>
                <span>위약금 (율 {Math.round(c.penalty_rate * 100)}% · 10% 캡)</span>
                <span className={styles.calcValue}>− {krw(c.penalty_amount)}</span>
              </div>
              <div className={`${styles.calcRow} ${styles.calcRowTotal}`}>
                <span>환불금액</span>
                <span className={styles.calcValue}>{krw(c.refund_amount)}</span>
              </div>
            </div>
            <p className={styles.hint}>
              금액은 서버(fn_calculate_refund)가 산정하며 10% 위약금 상한이 강제 적용됩니다. 화면에서 수정할 수 없습니다.
            </p>
            <Input
              multiline
              label="환불 사유"
              placeholder="환불 사유를 입력하세요 (필수)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </>
        ) : (
          <>
            {/* 2단계 — 명시적 재확인(🔒-2). 이 단계의 [환불 실행]을 눌러야만 실제 실행된다. */}
            <p className={styles.confirmNotice}>
              아래 내용으로 환불을 실행합니다. 실행 후에는 되돌릴 수 없습니다.
            </p>
            <div className={styles.calc}>
              <div className={`${styles.calcRow} ${styles.calcRowTotal}`}>
                <span>환불</span>
                <span className={`${styles.calcValue} ${styles.confirmAmount}`}>
                  {krw(c.refund_amount)}
                </span>
              </div>
              <div className={styles.calcRow}>
                <span>위약금</span>
                <span className={styles.calcValue}>{krw(c.penalty_amount)}</span>
              </div>
            </div>
            <p className={styles.confirmNotice}>
              사유: <strong>{reason.trim()}</strong>
            </p>
            {execError ? <p className={styles.errorText}>{execError}</p> : null}
          </>
        )}
      </div>
    </Modal>
  );
}
