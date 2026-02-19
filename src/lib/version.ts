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

export const APP_VERSION = '0.4.0';
export const BUILD_DATE = '2026-02-20';

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
        version: '0.4.0',
        date: '2026-02-20',
        type: 'minor',
        priority: 17,
        title: 'Known Issues 정비 — user_id/member_id 혼용 해결',
        changes: [
            '🔑 AuthContext에 memberId 필드 추가 (로그인 시 auth.users.id → members.id 변환 + 캐싱)',
            '🔧 fetchMemberId() 유틸 함수 신규 추가',
            '📊 dashboard: 2차 병렬 쿼리 구조로 리팩토링 (auth 레이어 → member 레이어)',
            '📝 records: loadData/saveWod/savePR의 member_id 혼용 3건 수정',
            '💬 feedback: loadData/handleSubmit의 member_id 혼용 3건 수정',
            '✅ checkin: memberships/checkins 쿼리 member_id 정상화 + 캘린더 쿼리 수정',
            '👤 profile: memberships/checkins/bookings 쿼리 member_id 정상화',
        ],
    },
    {
        version: '0.3.0',
        date: '2026-02-20',
        type: 'minor',
        priority: 15,
        title: '성능 최적화',
        changes: [
            '🖼️ Next.js Image 컴포넌트 적용 (profile, branch, feedback)',
            '⚙️ next.config 이미지 최적화 활성화 (unoptimized → remotePatterns)',
            '📦 QRCodeSVG dynamic import (코드 스플리팅)',
            '🗑️ @faker-js/faker, dotenv → devDependencies 이동',
            '🗄️ DB 인덱스 15개 추가 (checkins, bookings, sessions, memberships, notifications, members, transactions, lockers)',
        ],
    },
    {
        version: '0.2.0',
        date: '2026-02-19',
        type: 'minor',
        priority: 13,
        planningDoc: 'badge-system.md',
        title: '배지 시스템 고도화 (DB 기반 전환)',
        changes: [
            '🗄️ badge_definitions + badge_awards 테이블 신규 생성',
            '🔒 RLS 정책 8개 적용 (Admin CRUD, User 본인 조회)',
            '⚙️ fn_calculate_badge_progress RPC — 10개 metric_type 지원',
            '🤖 DB Trigger 4개 — 체크인/피드백/레이스/결제 시 자동 배지 평가',
            '🛡️ fn_evaluate_badges — 미달성 배지 자동 수여',
            '📊 fn_get_my_badges — 단일 RPC로 배지+진행도 조회',
            '🏅 초기 데이터 21개 배지 등록 (기존 15 → 확장)',
            '🖥️ Admin 배지 관리 화면 (/admin/operations/badges)',
            '📱 User 배지 화면 리팩토링 — 하드코딩 제거, RPC 전환',
            '🐛 Bug Fix: WOD/PR 카운트 오류 4건 해결',
        ],
    },
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
