'use client';

// identify 명령 수신 시 콘솔 ID 5s 오버레이 — 설치·페어링용 (docs/05 §4.1 동작 규칙).
import styles from './tv.module.css';

export function IdentifyOverlay({ consoleId }: { consoleId: string }) {
  const shortId = consoleId.slice(0, 6).toUpperCase();
  return (
    <div className={styles.identifyOverlay}>
      <div className={styles.identifyLabel}>이 화면의 콘솔 ID</div>
      <div className={styles.identifyId}>{shortId}</div>
    </div>
  );
}
