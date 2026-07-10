// PWA 웹 매니페스트 (Next 파일 컨벤션 → /manifest.webmanifest 자동 생성 + <link> 주입).
// scope/start_url = /apps → 회원 앱에서만 설치 유도(관리자·코치·키오스크 표면은 설치 대상 아님).
import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BCL — CrossFit · Rowing',
    short_name: 'BCL',
    description: 'BCL 짐 회원 앱 — 예약·체크인·WOD·멤버십',
    id: '/apps',
    start_url: '/apps',
    scope: '/apps',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f7f5',
    theme_color: '#ff6a00',
    lang: 'ko',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
