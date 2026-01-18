# 코치 배정·교체 (Coach Assignments)

## 1. 개요
- **경로**: `/admin/sessions/assignments`
- **아이콘**: `fa-random`
- **설명**: 특정 수업의 담당 코치를 배정하거나, 긴급한 상황(휴가, 병가 등) 시 코치를 교체하는 기능을 관리합니다.

## 2. 주요 기능
- 코치별 업무 스케줄 로드 공유 및 배정 조정
- 대리 코치(Substitute) 배정 및 자동 알림
- 수업료 정산을 위한 코치-세션 매칭 로그 관리

## 3. UI 컴포넌트
- 수업 - 코치 매칭 매트릭스
- 대체 코치 검색 및 배정 폼
- 배정 충돌 경고 알림 아이콘

## 4. Database Requirements (DB Schema)

### 주요 테이블: `session_assignments`
코치 배정 이력 및 교체 내역을 관리합니다.

| 컬럼명 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | INT | 고유 식별자 (PK) |
| `session_id` | INT | 수업 ID (sessions.id FK) |
| `original_coach_id` | INT | 원본 배정 코치 ID |
| `actual_coach_id` | INT | 실제 진행 코치 ID (대리 코치 등) |
| `assignment_type` | VARCHAR | 배정 유형 (Regular, Substitute) |
| `reason` | TEXT | 교체 사유 (병가, 휴가 등) |

### 연관 테이블
- `users`: 배정 가능한 코치 목록 조회 (Group=coach)
- `sessions`: 배정 대상 수업 정보 조회
