# 템플릿 관리 (Notification Templates)

## 1. 개요
- **경로**: `/admin/notifications/templates`
- **아이콘**: `fa-envelope-open-text`
- **설명**: 푸시 알림, SMS, 알림톡, 이메일 등 발송되는 자동 메시지의 양식을 관리하는 화면입니다.

## 2. 주요 기능
- 발송 채널별 메시지 문구 작성 및 치환 변수(`{회원이름}`, `{수업시간}` 등) 설정
- 템플릿별 발송 목적(예약 완료, 결제 안내, 광고 등) 분류
- 템플릿 테스트 발송 기능

## 3. UI 컴포넌트
- 채널별 탭 UI
- 메시지 편집기 (치환 변수 도우미 포함)
- 모바일 화면 미리보기 컴포넌트

## 4. Database Requirements (DB Schema)

### 주요 테이블: `notification_templates`
알림 메시지 본문 및 메타데이터를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `channel` | ENUM | 발송 채널 (SMS, Push, Email, Alimtalk) |
| `code` | VARCHAR | 템플릿 코드 (예: RESERVATION_CONFIRM) |
| `title` | VARCHAR | 템플릿 이름 |
| `content` | TEXT | 메시지 내용 (변수 포함: Hello {name}...) |
| `is_active` | TINYINT | 사용 여부 |

### 참고
치환 변수는 서버 로직에서 정규식을 통해 회원 및 세션 데이터와 매칭됩니다.
