'use client';

// PWA 설치 유도 배너 — 회원/관리자/코치 앱 공용(각 앱은 자기 매니페스트 스코프로 설치됨).
//   Android/Chrome: beforeinstallprompt 캡처 → "설치" 버튼(네이티브 프롬프트).
//   iOS Safari: 미지원 → "공유 → 홈 화면에 추가" 안내.
//   이미 설치(standalone)/사용자 닫음(localStorage) 시 미노출. 서비스워커도 여기서 1회 등록.
//   상태는 useState 초기화(동기 감지) + 이벤트 콜백만 갱신 — effect 본문 setState 금지 규약 준수.
//   navOffset: 하단탭(56px) 있는 셸(회원/코치)에서 true — 배너를 탭 위로 띄운다.
import { useEffect, useState } from 'react';
import styles from './InstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// 앱별 배너 문구 + 닫음 기억 키(앱마다 독립 — 한 앱 닫아도 다른 앱은 유도).
export type PwaApp = 'apps' | 'admin' | 'coach';
const LABEL: Record<PwaApp, string> = { apps: 'BCL 앱', admin: 'BCL 관리자', coach: 'BCL 코치' };

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in document);
  const otherBrowser = /crios|fxios|edgios|opios/i.test(ua);
  return iOS && !otherBrowser;
}

function dismissedBefore(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function InstallPrompt({ app, navOffset = false }: { app: PwaApp; navOffset?: boolean }) {
  const dismissKey = `bcl_pwa_dismissed_${app}`;
  const [standalone] = useState(() => isStandalone());
  const [iosHint] = useState(() => isIosSafari());
  const [dismissed, setDismissed] = useState(() => dismissedBefore(dismissKey));
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // 서비스워커 등록(설치 가능 조건). 스코프 '/' 로 전 앱 공용, 멱등.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const close = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissKey, '1');
    } catch {
      /* noop */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    setDeferred(null);
    close();
  };

  if (standalone || dismissed) return null;
  const showAndroid = Boolean(deferred);
  const showIos = iosHint && !deferred;
  if (!showAndroid && !showIos) return null;

  return (
    <div className={`${styles.banner} ${navOffset ? styles.withNav : ''}`} role="dialog" aria-label="앱 설치 안내">
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="7" y1="16" x2="25" y2="16" />
          <line x1="7" y1="11" x2="7" y2="21" />
          <line x1="25" y1="11" x2="25" y2="21" />
          <line x1="3.5" y1="13" x2="3.5" y2="19" />
          <line x1="28.5" y1="13" x2="28.5" y2="19" />
        </svg>
      </span>
      <div className={styles.text}>
        <span className={styles.title}>{LABEL[app]} 설치</span>
        {showAndroid ? (
          <span className={styles.desc}>홈 화면에 추가해 앱처럼 빠르게 여세요.</span>
        ) : (
          <span className={styles.desc}>
            공유
            <svg className={styles.share} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12M12 3l-4 4M12 3l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 12v7a1 1 0 001 1h12a1 1 0 001-1v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            → &ldquo;홈 화면에 추가&rdquo;
          </span>
        )}
      </div>
      {showAndroid ? (
        <button type="button" className={styles.cta} onClick={install}>
          설치
        </button>
      ) : null}
      <button type="button" className={styles.close} onClick={close} aria-label="닫기">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
