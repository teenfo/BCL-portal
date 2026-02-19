/**
 * BCL Portal Version Management
 * 
 * 버전 규칙 (Semantic Versioning):
 *   0.MINOR.PATCH (베타)
 *   - 0.x.x: 베타 단계 (정식 출시 전)
 *   - MINOR: 기능 추가/개선 (Priority 완료 시)
 *   - PATCH: 버그 수정, UI 미세 조정
 *   - 1.0.0: 정식 출시 시 전환
 * 
 * 버전 갱신 시점:
 *   - /develop 워크플로우 완료 후 커밋 시 MINOR 증가
 *   - 핫픽스/버그 수정 커밋 시 PATCH 증가
 *   - 정식 출시 시 MAJOR를 1로 전환
 */

export const APP_VERSION = '0.1.0';
export const BUILD_DATE = '2026-02-19';

export interface VersionInfo {
    version: string;
    buildDate: string;
    environment: string;
}

export function getVersionInfo(): VersionInfo {
    return {
        version: APP_VERSION,
        buildDate: BUILD_DATE,
        environment: process.env.NEXT_PUBLIC_SUPABASE_ENV || 'production',
    };
}
