# 예약·대기열 관리 (Bookings & Waitlists)

## 1. 개요
- **경로**: `/admin/sessions/bookings`
- **아이콘**: `fa-list-ul`
- **설명**: 수업 예약자 현황과 정원 초과 시 발생하는 대기열(Waitlist)을 관리하는 화면입니다.

## 2. 주요 기능
- 수업별 예약자 명단 조회 및 수동 예약 추가
- 대기 순번 조정 및 빈자리 발생 시 자동/수동 승인 처리
- 노쇼(No-show) 처리 및 위약금 적용 여부 관리

## 3. UI 컴포넌트
- 예약자 명단 리스트
- 대기열 정렬(Drag & Drop) 및 순서 관리
- 예약 상태 변경 버튼 그룹

## 4. Database Requirements (DB Schema)

### 주요 테이블: `bookings`
수업 예약 및 대기 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `session_id` | INT | 수업 ID (sessions.id FK) |
| `user_id` | INT | 회원 ID (users.id FK) |
| `status` | ENUM | 상태 (Reserved, Waiting, Confirmed, Cancelled) |
| `waiting_order` | INT | 대기 순번 (NULL: 예약 확정) |
| `created_at` | DATETIME | 예약 신청 일시 |

### 연관 테이블
- `sessions`: 수업 시간 및 장소 정보 조회
- `users`: 예약한 회원 이름 및 연락처 조회
