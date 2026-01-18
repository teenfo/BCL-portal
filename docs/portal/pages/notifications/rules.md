# 자동 발송 규칙 (Notification Rules)

## 1. 개요
- **경로**: `/admin/notifications/rules`
- **아이콘**: `fa-cogs`
- **설명**: 특정 상황(이벤트 트리거) 발생 시 어떤 템플릿을 누구에게 발송할지 정의하는 자동화 규칙 관리 화면입니다.

## 2. 주요 기능
- 트리거 설정 (예: 수업 1시간 전, 회원 가입 즉시, 이용권 종료 3일 전)
- 발송 규칙의 활성화/비활성화 상태 제어
- 대상자 조건 필터링 (특정 플랜 회원에게만 전송 등)

## 3. UI 컴포넌트
- 자동화 규칙 목록 (On/Off 토글 지원)
- 워크플로우 빌더 형태의 규칙 편집 폼
- 트리거 - 템플릿 매칭 맵

## 4. Database Requirements (DB Schema)

### 주요 테이블: `notification_rules`
알림 자동화 발송 조건을 정의합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `trigger_event` | VARCHAR | 트리거 상황 (ON_SIGNUP, BEFORE_SESSION_1H, PLAN_EXPIRE_3D) |
| `template_id` | INT | 발송할 템플릿 ID (FK) |
| `target_conditions` | TEXT | 대상 필터링 규칙 (JSON 형식) |
| `delay_minutes` | INT | 지연 발송 시간 (0이면 즉시) |
| `is_enabled` | TINYINT | 규칙 활성화 여부 |

### 연관 테이블
- `notification_templates`: 매칭된 템플릿 정보
