# Database Schema Documentation

This document serves as the Single Source of Truth (SSOT) for the BCL Portal database schema.

---

## Tables

### 1. facilities
지점 정보 및 운영 설정을 저장합니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | PK |
| `name` | `text` | - | No | 지점명 |
| `address` | `text` | - | Yes | 주소 |
| `operating_hours` | `text` | - | Yes | 운영 시간 (문자열) |
| `created_at` | `timestamptz` | `now()` | Yes | 생성일 |

### 2. members
체육관 회원 핵심 데이터입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | PK |
| `user_id` | `uuid` | - | Yes | FK -> `auth.users.id` |
| `name` | `text` | - | No | 성함 |
| `email` | `text` | - | No | 이메일 (Unique) |
| `phone` | `text` | - | Yes | 연락처 |
| `joined_date` | `date` | `CURRENT_DATE` | Yes | 가입일 |
| `status` | `text` | `'Active'` | Yes | Active, Inactive, Pending |
| `plan` | `text` | `'Iron Pulse Lite'` | Yes | 수강권 종류 |
| `credits` | `integer` | `0` | Yes | 남은 수강 횟수 |

### 3. membership_plans
수강권 및 요금제 정보입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `uuid_generate_v4()` | No | PK |
| `name` | `text` | - | No | 플랜명 |
| `description` | `text` | - | Yes | 설명 |
| `price` | `numeric` | - | No | 가격 |
| `credits` | `integer` | `0` | Yes | 부여 횟수 |

### 4. sessions
수업 일정 정보입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | PK |
| `title` | `text` | - | No | 수업명 |
| `coach_name` | `text` | - | Yes | 담당 코치명 |
| `start_time` | `timestamptz` | - | No | 시작 시간 |
| `end_time` | `timestamptz` | - | No | 종료 시간 |
| `capacity` | `integer` | `20` | Yes | 정원 |
| `enrolled` | `integer` | `0` | Yes | 현재 인원 |

### 5. bookings
수업 예약 기록입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `uuid_generate_v4()` | No | PK |
| `session_id` | `uuid` | - | Yes | FK -> `sessions.id` |
| `user_id` | `uuid` | - | Yes | FK -> `auth.users.id` |
| `status` | `text` | `'confirmed'` | Yes | confirmed, waitlist, cancelled, attended |

### 6. checkins
키오스크 및 앱 체크인 로그입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | PK |
| `member_id` | `uuid` | - | Yes | FK -> `members.id` |
| `member_name` | `text` | - | Yes | 회원명 (Denormalized) |
| `time` | `timestamptz` | `now()` | Yes | 입장 일시 |
| `facility` | `text` | - | Yes | 지점명 |
| `status` | `text` | `'Present'` | Yes | 상태 |

### 7. transactions
결제 내역 정보입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` | - | No | PK (외부 ID 혼용 가능) |
| `member_id` | `uuid` | - | Yes | FK -> `members.id` |
| `amount` | `numeric` | - | Yes | 결제 금액 |
| `status` | `text` | `'completed'` | Yes | completed, pending, cancelled |
| `date` | `date` | `CURRENT_DATE` | Yes | 결제 일자 |

### 8. member_notes
상담 및 코칭 노트 (관리자/코치 전용) 입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | PK |
| `member_id` | `uuid` | - | Yes | FK -> `members.id` |
| `author_id` | `uuid` | - | Yes | FK -> `auth.users.id` (작성자) |
| `content` | `text` | - | No | 내용 |

### 9. coaches
코치 프로필 정보입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | PK |
| `name` | `text` | - | No | 코치명 |
| `specialty` | `text` | - | Yes | 전문 분야 |
| `status` | `text` | `'Active'` | Yes | Active, Inactive |

### 10. notices
공지사항 정보입니다.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | PK |
| `title` | `text` | - | No | 제목 |
| `content` | `text` | - | Yes | 내용 |
| `date` | `date` | `CURRENT_DATE` | Yes | 등록일 |
