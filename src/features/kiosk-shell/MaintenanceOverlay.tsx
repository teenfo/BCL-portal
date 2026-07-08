'use client';

// 점검 오버레이 (docs/06 §6) — 원격 maintenance 명령 시 전면 표시. resume까지 유지.
import styles from './overlay.module.css';

export function MaintenanceOverlay() {
  return (
    <div className={styles.overlay} role="alertdialog" aria-live="assertive" aria-label="점검 중">
      <div className={styles.maintenance}>
        <div className={styles.maintIcon} aria-hidden="true">
          <svg viewBox="0 0 48 48" width="72" height="72">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M24 14v12l8 4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className={styles.maintTitle}>잠시 점검 중입니다</h1>
        <p className={styles.maintDesc}>이용에 불편을 드려 죄송합니다. 데스크에 문의해주세요.</p>
      </div>
    </div>
  );
}
