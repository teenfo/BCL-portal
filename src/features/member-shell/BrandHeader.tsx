'use client';

// 회원 앱 전역 브랜드 바 — 이 화면이 BCL 짐 앱임을 상단에 각인.
//   탭 라우트에서만 노출(StackHeader가 있는 스택 화면과 이중 헤더 방지 — MemberShell isTab).
//   로고는 BclLogo 워드마크(벡터 아웃라인, currentColor로 accent 상속).
import { BclLogo } from '@/components/brand/BclLogo';
import styles from './BrandHeader.module.css';

export function BrandHeader() {
  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <BclLogo className={styles.logo} />
        <span className={styles.tagline}>CrossFit · Hyrox</span>
      </div>
    </header>
  );
}
