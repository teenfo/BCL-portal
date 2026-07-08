'use client';

// 콘솔 인스턴스 식별 — 최초 구동 시 UUID 생성·localStorage 보존.
// 원격제어 대상 지정(target_console_id)·identify 오버레이에 사용 (docs/05 §3.3).
import { useEffect, useState } from 'react';

const CONSOLE_ID_KEY = 'bcl.class.console_id';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useConsoleId(): string {
  // SSR/최초 렌더 결정성을 위해 빈 문자열로 시작 → 마운트 후 확정(콘솔은 CSR 강제)
  const [consoleId, setConsoleId] = useState<string>('');

  useEffect(() => {
    let active = true;
    // 마이크로태스크 이후 상태 전이 — 이펙트 동기 setState(cascading render) 회피
    void Promise.resolve().then(() => {
      if (!active) return;
      let id: string | null = null;
      try {
        id = window.localStorage.getItem(CONSOLE_ID_KEY);
        if (!id) {
          id = newId();
          window.localStorage.setItem(CONSOLE_ID_KEY, id);
        }
      } catch {
        id = newId();
      }
      setConsoleId(id);
    });
    return () => {
      active = false;
    };
  }, []);

  return consoleId;
}
