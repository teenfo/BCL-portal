# 체크인 현황 (Session Checkins)

## 1. 개요
- **경로**: `/admin/sessions/checkins`
- **아이콘**: `fa-door-open`
- **설명**: 현재 진행 중이거나 곧 시작될 수업의 실시간 체크인 현황을 모니터링하는 화면입니다.

## 2. 주요 기능
- 실시간 체크인 완료자 및 미출석자 구분 표시
- 키오스크 또는 모바일 연동 실시간 데이터 업데이트
- 코치용 출석 확인 보조 화면 제공

## 3. UI 컴포넌트
- 실시간 체크인 대시보드 (Live Update Card)
- 세션별 인원 분포 그래프
- 미출석 대상자 강조 알림

## 4. Database Requirements (DB Schema)

### 주요 테이블: `attendance_logs`
(참고: Attendance Log 화면과 동일한 테이블을 사용)

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `user_id` | INT | 회원 ID |
| `session_id` | INT | 수업 세션 ID |
| `checkin_at` | DATETIME | 실시간 체크인 시각 |

### 실시간 연관 필드: `users.last_visit_at`
회원의 최종 방문 시각을 실시간으로 업데이트하여 모니터링에 활용합니다.
