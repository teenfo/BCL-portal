'use client';

// 회원 앱 PWA 설치 유도 배너 (docs/03) — 하단탭 위 고정.
//   Android/Chrome: beforeinstallprompt 캡처 → "설치" 버튼(네이티브 프롬프트).
//   iOS Safari: beforeinstallprompt 미지원 → "공유 → 홈 화면에 추가" 안내.
//   이미 설치(standalone) 또는 사용자가 닫으면 미노출(localStorage 기억).
//   상태는 useState 초기화(동기 감지) + 이벤트 콜백에서만 갱신 — effect 본문 setState 금지 규약 준수.
import { useEffect, useState } from 'react';
import styles from './InstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'bcl_pwa_install_dismissed';

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

function dismissedBefore(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [standalone] = useState(() => isStandalone());
  const [iosHint] = useState(() => isIosSafari());
  const [dismissed, setDismissed] = useState(() => dismissedBefore());
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
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
      window.localStorage.setItem(DISMISS_KEY, '1');
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
    <div className={styles.banner} role="dialog" aria-label="앱 설치 안내">
      <span className={styles.icon} aria-hidden="true">
        {/* 바벨 마크(브랜드) */}
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <line x1="7" y1="16" x2="25" y2="16" />
          <line x1="7" y1="11" x2="7" y2="21" />
          <line x1="25" y1="11" x2="25" y2="21" />
          <line x1="3.5" y1="13" x2="3.5" y2="19" />
          <line x1="28.5" y1="13" x2="28.5" y2="19" />
        </svg>
      </span>
      <div className={styles.text}>
        <span className={styles.title}>BCL 앱 설치</span>
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
