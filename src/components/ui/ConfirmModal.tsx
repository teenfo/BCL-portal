'use client';

// ConfirmModal — Modal 기반 파괴적 행동 확인 (02 §3 공통 규칙 · docs/12 §4.3)
// requireTyping: 지정 문자열과 일치 입력해야 확인 버튼 활성 (멤버십 취소 등)
// 파괴적 확인이므로 오버레이 클릭 닫기 비활성(closeOnOverlay=false).
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import styles from './ConfirmModal.module.css';

export interface ConfirmModalProps {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
  /** 지정 시 이 문자열을 정확히 입력해야 확인 버튼 활성화 */
  requireTyping?: string;
  /** 확인 처리 중 표시 (이중 실행 차단) */
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '확인',
  variant = 'danger',
  onConfirm,
  onClose,
  requireTyping,
  loading = false,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const typingOk = !requireTyping || typed === requireTyping;

  const handleClose = () => {
    setTyped('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="sm"
      closeOnOverlay={false}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            취소
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={!typingOk}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className={styles.message}>{message}</p>
      {requireTyping ? (
        <div className={styles.typing}>
          <Input
            label={`계속하려면 "${requireTyping}" 를 입력하세요`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
        </div>
      ) : null}
    </Modal>
  );
}
