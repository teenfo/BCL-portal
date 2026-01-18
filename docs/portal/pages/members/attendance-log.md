# 출결·체크인 로그 (Attendance Log)

## 1. 개요
- **경로**: `/admin/attendance`
- **아이콘**: `fa-clipboard-check`
- **설명**: 센터 출입 및 수업 체크인 데이터를 로깅하고 분석하는 화면입니다.

## 2. 주요 기능
- 날짜별/지점별 출석 데이터 필터링
- 실시간 체크인 발생 현황 모니터링
- 출결 데이터 엑셀 내보내기 (통계용)

## 3. UI 컴포넌트
- 데이터 검색 필터 (Date Range Picker)
- 출결 로그 전용 테이블
- 출결 요약 위젯

## 4. Database Requirements (DB Schema)

### 주요 테이블: `attendance_logs`
출결 및 체크인 정보를 저장하는 테이블입니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `user_id` | INT | 회원 ID (users.id FK) |
| `session_id` | INT | 수업 세션 ID (sessions.id FK, 자유 입장인 경우 NULL) |
| `checkin_at` | DATETIME | 체크인 일시 |
| `method` | ENUM | 체크인 방식 (QR, PIN, RFID, Manual) |
| `status` | VARCHAR | 상태 (Present, Late, Cancel) |

### 연관 테이블
- `users`: 회원 기본 정보 조회
- `sessions`: 수업 정보 및 코치 정보 조회
