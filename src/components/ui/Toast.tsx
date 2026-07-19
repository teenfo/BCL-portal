'use client';

// 표준 Toast + ToastProvider (docs/12-design-system §4.9)
// variant success/error/info/warning — surface-raised + 좌측 상태색 바
// admin 우하단 스택 최대 3, 자동 소멸 4s(error 6s), hover 일시정지
// role=status(success/info) · role=alert(error/warning)
// 주의: 폼 에러의 유일 표면화 수단으로 쓰지 말 것 — 성공/액션 피드백용 (§4.9 금지)
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Toast.module.css';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: ReactNode;
  action?: ToastAction;
}

interface ToastApi {
  success: (message: ReactNode, action?: ToastAction) => void;
  error: (message: ReactNode, action?: ToastAction) => void;
  info: (message: ReactNode, action?: ToastAction) => void;
  warning: (message: ReactNode, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const MAX_STACK = 3;
const DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 4000,
  error: 6000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  // 포털은 클라이언트 마운트 이후에만 (SSR 하이드레이션 불일치 방지)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const remove = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: ReactNode, action?: ToastAction) => {
    setToasts((list) => {
      const next = [...list, { id: (idRef.current += 1), variant, message, action }];
      // 최대 3개 — 오래된 것부터 제거
      return next.slice(-MAX_STACK);
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, a) => push('success', m, a),
      error: (m, a) => push('error', m, a),
      info: (m, a) => push('info', m, a),
      warning: (m, a) => push('warning', m, a),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted && typeof document !== 'undefined'
        ? createPortal(
            <div className={styles.viewport}>
              {toasts.map((t) => (
                <ToastRow key={t.id} toast={t} onDismiss={() => remove(t.id)} />
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const paused = useRef(false);
  const remaining = useRef(DURATION[toast.variant]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const schedule = useCallback(() => {
    clear();
    startedAt.current = Date.now();
    timer.current = setTimeout(onDismiss, remaining.current);
  }, [onDismiss]);

  useEffect(() => {
    schedule();
    return clear;
  }, [schedule]);

  const onEnter = () => {
    if (paused.current) return;
    paused.current = true;
    clear();
    remaining.current -= Date.now() - startedAt.current;
  };
  const onLeave = () => {
    paused.current = false;
    schedule();
  };

  const alert = toast.variant === 'error' || toast.variant === 'warning';

  return (
    <div
      className={[styles.toast, styles[toast.variant]].join(' ')}
      role={alert ? 'alert' : 'status'}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className={styles.message}>{toast.message}</div>
      {toast.action ? (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" className={styles.close} onClick={onDismiss} aria-label="닫기">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast는 <ToastProvider> 하위에서만 사용할 수 있습니다.');
  return ctx;
}
