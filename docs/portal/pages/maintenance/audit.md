# 관리자 액션 로그 (Audit Logs)

## 1. 개요
- **경로**: `/admin/maintenance/audit`
- **아이콘**: `fa-user-clock`
- **설명**: 관리자가 시스템 내에서 수행한 모든 주요 활동(데이터 수정, 삭제, 설정 변경 등)을 기록하고 추적하는 화면입니다.

## 2. 주요 기능
- 관리자별/시간별/작업 성격별 활동 내역 검색
- 변경 전/후 데이터 비교 확인
- 보안 사고 발생 시 추적을 위한 감사용 데이터 제공

## 3. UI 컴포넌트
- 액션 로그 타임라인/테이블
- 변경 데이터 Diff 뷰어
- 작업 유형별 통계 대시보드

## 4. Database Requirements (DB Schema)

### 주요 테이블: `audit_logs`
시스템 내에서 발생한 주요 이력(Audit Trail)을 기록합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `user_id` | INT | 수행자 ID (users.id FK) |
| `event` | VARCHAR | 이벤트 유형 (CREATE, UPDATE, DELETE, LOGIN) |
| `table_name` | VARCHAR | 대상 테이블명 |
| `target_id` | INT | 대상 데이터의 PK |
| `old_values` | TEXT | 변경 전 데이터 (JSON) |
| `new_values` | TEXT | 변경 후 데이터 (JSON) |
| `ip_address` | VARCHAR | 수행자 IP |
| `user_agent` | VARCHAR | 수행자 브라우저 정보 |
| `created_at` | DATETIME | 발생 일시 |
