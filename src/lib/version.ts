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

export interface ChangelogEntry {
    version: string;
    date: string;
    type: 'major' | 'minor' | 'patch';
    priority?: number;
    planningDoc?: string; // .docs/archive/planning/ 내 파일 경로
    title: string;
    changes: string[];
}

/** GitHub 저장소 기본 URL */
export const GITHUB_REPO_URL = 'https://github.com/teenfo/BCL-portal';

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '0.1.0',
        date: '2026-02-19',
        type: 'minor',
        priority: 16,
        planningDoc: 'checkin-qr-system.md',
        title: 'QR 체크인 시스템 재설계 + 버전 관리',
        changes: [
            '🔧 QR 체크인 시스템 전면 재작성 (Priority 16)',
            '📱 QR 페이로드 JSON 인코딩 (member_id, facility_id, timestamp)',
            '🏢 키오스크 인증 로직: 타임스탬프 검증, 회원 확인, 중복 방지',
            '🎓 수업 체크인 자동 감지 (예약 ±30분 이내)',
            '✅ 성공 화면 체크인 유형별 UI 분기 (수업/시설)',
            '📐 사용자 앱 헤더 가독성 개선 (배경색/텍스트색 수정)',
            '🪞 키오스크 카메라 반전 시 오버레이 정상 방향 유지',
            '🏷️ 버전 관리 시스템 구축 + Admin 사이드바 버전 표시',
        ],
    },
];

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
