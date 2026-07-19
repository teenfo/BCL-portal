'use client';

// BottomSheet (모바일 전용) — docs/12 §4.4. ui/에 없는 표준 컴포넌트를 회원 셸에 자체 구현
// (shared kit 미변경). variant auto(내용 높이)/full(92vh). 오버레이 탭·ESC·드래그다운 닫기.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './BottomSheet.module.css';

export type BottomSheetVariant = 'auto' | 'full';

export interface BottomSheetProps {
  /** 조건부 마운트로 여닫는 경우 생략 가능(기본 true). 유지 마운트 시 false로 닫기 */
  open?: boolean;
  onClose: () => void;
  title: ReactNode;
  variant?: BottomSheetVariant;
  footer?: ReactNode;
  /** 파괴적 확인 시트는 오버레이 탭 닫기 비활성 */
  closeOnOverlay?: boolean;
  children?: ReactNode;
}

export function BottomSheet({
  open = true,
  onClose,
  title,
  variant = 'auto',
  footer,
  closeOnOverlay = true,
  children,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  // ESC 닫기 + 배경 스크롤 잠금 (Modal과 동일 규약)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const onHandleDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = e.clientY;
  }, []);
  const onHandleMove = useCallback((e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  }, []);
  const onHandleUp = useCallback(() => {
    if (dragStart.current === null) return;
    if (dragY > 120) onClose();
    dragStart.current = null;
    setDragY(0);
  }, [dragY, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={closeOnOverlay ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={panelRef}
        className={`${styles.panel} ${variant === 'full' ? styles.full : styles.auto}`}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.handleZone}
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className={styles.handle} aria-hidden="true" />
        </div>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="닫기">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </div>
    </div>
  );
}
