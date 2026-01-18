# 에러 로그 (Error Logs)

## 1. 개요
- **경로**: `/admin/maintenance/errors`
- **아이콘**: `fa-bug`
- **설명**: 시스템 내부에서 발생한 서버 에러, API 오류, DB 예외 상황 등을 기술적으로 수집하여 보여주는 화면입니다.

## 2. 주요 기능
- 실시간 에러 발생 현황 모니터링 및 알림
- 에러 상세 스택 트레이스(Stack Trace) 및 발생 컨텍스트 확인
- 에러 상태 관리 (Open, In Progress, Resolved)

## 3. UI 컴포넌트
- 에러 로그 리스트 (심각도별 정렬 가능)
- 코드 상세 뷰어 (상세 팝업)
- 에러 빈도 추적 차트

## 4. Database Requirements (DB Schema)

### 주요 테이블: `error_logs`
시스템 예외 상황 및 에러 스택 트레이스를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `severity` | ENUM | 심각도 (Critical, Error, Warning, Info) |
| `message` | TEXT | 에러 메시지 요약 |
| `stack_trace` | LONGTEXT | 상세 스택 트레이스 |
| `url` | VARCHAR | 발생 시점의 요청 URL |
| `status` | ENUM | 처리 상태 (Open, InProgress, Resolved) |
| `created_at` | DATETIME | 발생 일시 |
