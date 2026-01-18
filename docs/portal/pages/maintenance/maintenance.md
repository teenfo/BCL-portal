# 공지/점검 이력 (Maintenance History)

## 1. 개요
- **경로**: `/admin/maintenance/maintenance`
- **아이콘**: `fa-tools`
- **설명**: 시스템 정기 점검 또는 긴급 점검 공지 내역과 서버 작업 히스토리를 관리하는 화면입니다.

## 2. 주요 기능
- 시스템 점검 안내 팝업/페이지 예약 게시 및 해제
- 서버 인프라 변경 또는 패치 내역 기록
- 점검 시간 동안 특정 기능(결제 등) 제한 자동화

## 3. UI 컴포넌트
- 점검 히스토리 테이블
- 점검 공지 설정 폼
- 현재 서버 상태 모니터링 배지

## 4. Database Requirements (DB Schema)

### 주요 테이블: `maintenance_schedules`
시스템 점검 일정을 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `title` | VARCHAR | 점검 명칭 |
| `description` | TEXT | 점검 안내 문구 |
| `start_at` | DATETIME | 점검 시작 예정 시각 |
| `end_at` | DATETIME | 점검 종료 예정 시각 |
| `block_access` | TINYINT | 점검 중 일반 사용자 접근 차단 여부 |
| `status` | ENUM | 상태 (Scheduled, Ongoing, Completed, Cancelled) |
