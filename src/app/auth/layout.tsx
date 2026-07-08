// /auth 셸 — ThemeScope(dark/mobile) + 단일 카드 중앙 정렬 (docs/12 §6)
import { ThemeScope } from '@/components/ThemeScope';
import styles from './layout.module.css';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeScope theme="dark" density="mobile">
      <div className={styles.shell}>
        <div className={styles.inner}>
          <p className={styles.brand}>BCL Portal</p>
          {children}
        </div>
      </div>
    </ThemeScope>
  );
}
