'use client';

// 앱별 테마/밀도 지정 (docs/12 §1) — 각 앱 layout이 1회 사용.
// 컴포넌트는 테마·밀도를 감지하지 않고 토큰만 소비한다(분기 코드 금지).
import { useLayoutEffect } from 'react';
import type { ReactNode } from 'react';

export interface ThemeScopeProps {
  theme: 'dark' | 'light';
  density: 'admin' | 'mobile' | 'tv';
  children: ReactNode;
}

export function ThemeScope({ theme, density, children }: ThemeScopeProps) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.getAttribute('data-theme');
    const prevDensity = root.getAttribute('data-density');

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-density', density);

    return () => {
      // 스코프 이탈 시 이전 값 복원 (루트 layout 기본값 유지)
      if (prevTheme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', prevTheme);
      if (prevDensity === null) root.removeAttribute('data-density');
      else root.setAttribute('data-density', prevDensity);
    };
  }, [theme, density]);

  return <>{children}</>;
}
