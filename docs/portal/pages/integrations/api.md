# 외부 시스템 연동 (API / Webhooks)

## 1. 개요
- **경로**: `/admin/integrations/api`
- **아이콘**: `fa-key`
- **설명**: 외부 서비스(CRM, ERP 등)와의 데이터 동기화를 위한 API Key 발급 및 Webhook 설정을 관리하는 화면입니다.

## 2. 주요 기능
- 시스템 연동용 API Key 생성 및 만료 관리
- 이벤트 발생 시 데이터를 전송할 Webhook URL 등록
- API 호출 로그 및 에러 내역 모니터링

## 3. UI 컴포넌트
- API Key 목록 및 숨김/표시 기능
- Webhook 전송 테스트 버튼
- 호출량 통계 그래프

## 4. Database Requirements (DB Schema)

### 주요 테이블: `api_keys`
외부 연동을 위한 인증 키 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `name` | VARCHAR | 연동사 명칭 |
| `api_key` | VARCHAR | 암호화된 API Key |
| `permissions` | TEXT | 해당 키로 허용된 기능 (JSON) |
| `expires_at` | DATETIME | 만료 일시 |
| `last_used_at` | DATETIME | 최근 호출 일시 |

### 주요 테이블: `webhook_configs`
이벤트 발생 시 데이터를 전송할 엔드포인트를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | PK |
| `event_type` | VARCHAR | 트리거 이벤트 (USER_REGISTERED, ATTENDANCE_CREATED 등) |
| `url` | VARCHAR | 대상 서버 URL |
| `is_active` | TINYINT | 활성 여부 |
