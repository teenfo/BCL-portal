# 세션·수업 스케줄 (Session Schedule)

## 1. 개요
- **경로**: `/admin/sessions/schedule`
- **아이콘**: `fa-calendar-alt`
- **설명**: 센터에서 운영되는 모든 그룹 수업 및 개인 세션의 시간표를 관리하는 화면입니다.

## 2. 주요 기능
- 주간/월간 캘린더 기반 스케줄 조회
- 새로운 수업 세션 등록 및 반복 일정 설정
- 특정 스케줄의 코치 배정 및 정원 변경

## 3. UI 컴포넌트
- 대형 캘린더 라이브러리 (FullCalendar 등)
- 세션 등록/수정 사이드바 또는 모달
- 지점/코치별 필터 토글

## 4. Database Requirements (DB Schema)

### 주요 테이블: `sessions`
수업/세션 정보를 저장하는 핵심 테이블입니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `title` | VARCHAR | 수업 명칭 |
| `coach_id` | INT | 담당 코치 ID (users.id FK) |
| `start_at` | DATETIME | 수업 시작 일시 |
| `end_at` | DATETIME | 수업 종료 일시 |
| `capacity` | INT | 정원 |
| `description` | TEXT | 수업 상세 설명 |
| `status` | VARCHAR | 상태 (Scheduled, Finished, Cancelled) |

### 연관 테이블
- `users`: 코치 데이터 조회 (Role=coach)
- `bookings`: 해당 세션에 예약된 회원 데이터 조회
