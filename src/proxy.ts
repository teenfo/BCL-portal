import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * BCL Portal — Next.js Proxy (Middleware)
 *
 * 이 파일은 Next.js 16에서 middleware.ts 대신 사용하는 프록시 파일입니다.
 * 모든 요청에서 Supabase 세션 토큰을 갱신합니다.
 *
 * ── 왜 이 파일이 중요한가 ──
 * @supabase/ssr 기반 SSR 인증에서는 모든 요청마다 서버 측에서
 * Access Token의 만료 여부를 확인하고 갱신해야 합니다.
 * 이 파일이 없으면 토큰이 만료되었을 때 브라우저가 갱신을 받지 못해
 * 다음 페이지 이동 / 앱 전환 시 세션이 끊기는 현상이 발생합니다.
 */
export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * 다음을 제외한 모든 요청에 프록시를 적용합니다:
         * - _next/static  (정적 파일 — Next.js 빌드 결과물)
         * - _next/image   (이미지 최적화 API)
         * - favicon.ico   (파비콘)
         * - images/       (공개 이미지 디렉토리)
         * - sw.js         (Service Worker)
         * - manifest.json (PWA 매니페스트)
         * - 이미지 확장자 (svg, png, jpg 등)
         *
         * ⚠️ /api/, /auth/, /kiosk/, /class/ 등은 여기서 제외하지 않습니다.
         *    updateSession() 내부의 isPublicPath() 에서 처리됩니다.
         *    프록시는 토큰 갱신만 담당하고, 실제 접근 제어는 내부에서 합니다.
         */
        '/((?!_next/static|_next/image|favicon\\.ico|images/|sw\\.js|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
    ],
};
