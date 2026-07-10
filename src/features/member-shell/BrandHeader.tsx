'use client';

// 회원 앱 전역 브랜드 바 — 이 화면이 BCL 짐 앱임을 상단에 각인.
//   탭 라우트에서만 노출(StackHeader가 있는 스택 화면과 이중 헤더 방지 — MemberShell isTab).
//   로고는 인라인 SVG(currentColor) + 워드마크. 에셋/hex 없이 --bcl-* 토큰만.
import styles from './BrandHeader.module.css';

/** BCL 로고 마크 — 케틀벨 모티프(크로스핏 짐). currentColor로 accent 상속. */
function BclMark() {
  return (
    <svg
      className={styles.mark}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 17.5 L13 12 Q13 8 16 8 Q19 8 19 12 L19 17.5" />
      <circle cx="16" cy="20" r="5.5" />
    </svg>
  );
}

export function BrandHeader() {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <span className={styles.logo} aria-label="BCL">
          <BclMark />
          <span className={styles.wordmark}>BCL</span>
        </span>
        <span className={styles.tagline}>CrossFit · Hyrox</span>
      </div>
    </header>
  );
}
