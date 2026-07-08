'use client';

// 시설 미지정 시 안내(무한 스피너·에러 화면 금지 — 인증 계약 §7 준용).
import styles from './tv.module.css';

export function SetupNotice() {
  return (
    <div className={styles.setupNotice}>
      <div className={styles.setupTitle}>화면 설정 필요</div>
      <p className={styles.setupBody}>
        이 TV의 시설을 지정하세요. 주소 끝에{' '}
        <span className={styles.setupCode}>?facility=&lt;시설ID&gt;</span> 를 붙여 한 번 열면
        이후 자동 기억됩니다.
      </p>
    </div>
  );
}
