# 발송 로그 (Notification Logs)

## 1. 개요
- **경로**: `/admin/notifications/logs`
- **아이콘**: `fa-history`
- **설명**: 실제로 발송된 모든 알림의 성공/실패 여부 및 상세 로그를 조회하는 화면입니다.

## 2. 주요 기능
- 수신자별/채널별/시간별 발송 이력 검색
- 발송 실패 사유 확인 및 재전송 요청 처리
- 전체 발송 통계 (도달률, 오픈율 등) 요약

## 3. UI 컴포넌트
- 발송 로그 테이블
- 실패 사유 레이어 팝업
- 발송 성공률 요약 파이 차트

## 4. Database Requirements (DB Schema)

### 주요 테이블: `notification_logs`
개별 알림 발송 시도 및 결과 데이터를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `template_id` | INT | 사용된 템플릿 ID |
| `user_id` | INT | 수신 회원 ID |
| `recipient` | VARCHAR | 수신처 정보 (전화번호, 이메일, 토큰 등) |
| `status` | ENUM | 상태 (Success, Failed, Processing) |
| `error_message` | TEXT | 실패 시 외부 API 에러 로그 |
| `sent_at` | DATETIME | 발송 처리 시각 |

### 연관 테이블
- `users`: 수신자 이름 및 상세 정보 조회
- `notification_templates`: 발송된 메시지 제목 및 유형 조회
