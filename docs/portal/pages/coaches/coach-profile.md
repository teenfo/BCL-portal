# 코치 프로필 (Coach Profile)

## 1. 개요
- **경로**: `/admin/coaches/{coachId}`
- **아이콘**: `fa-address-card`
- **설명**: 개별 코치의 경력, 자격증, 전문분야, 담당 수업 시간표 등 상세 정보를 관리하는 화면입니다.

## 2. 주요 기능
- 코치 프로필 이미지 및 바이오 수정
- 전문 분야(PT, Yoga, Crossfit 등) 태그 관리
- 해당 코치의 개인 수업 시간표 조회 및 예약 현황 확인

## 3. UI 컴포넌트
- 경력/자격증 타임라인 컴포넌트
- 전문 분야 태그 클라우드
- 코치 가용 시간(Availability) 캘린더

## 4. Database Requirements (DB Schema)

### 연관 테이블: `coach_details`
코치 프로필의 핵심 상세 정보를 저장합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `user_id` | INT | 코치 식별자 |
| `bio` | TEXT | 자기소개 |
| `certifications` | TEXT | 자격증 정보 (JSON/Text) |
| `experience_years` | INT | 경력 연차 |

### 가용 시간 테이블: `coach_availabilities`
코치별 수업 가능 시간을 관리합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `coach_id` | INT | 코치 ID |
| `day_of_week` | INT | 요일 (0-6) |
| `start_time` | TIME | 시작 가능 시각 |
| `end_time` | TIME | 종료 가능 시각 |
