# 대시보드 (Dashboard)

## 1. 개요
- **경로**: `/admin/dashboard`
- **아이콘**: `fa-tachometer-alt`
- **설명**: 프로젝트의 전반적인 현황을 한눈에 볼 수 있는 요약 화면입니다.

## 2. 주요 기능
- 실시간 이용 현황 (Occupancy) 모니터링
- 주요 지표 (매출, 회원 수 등) 요약 보기
- 최근 활동 로그 요약 표시

## 3. UI 컴포넌트
- 통계 카드 (Stats Cards)
- 출석 현황 그래프 (Weekly Attendance)
- 최근 활동 리스트 (Recent Activity)

## 4. Database Requirements (DB Schema)

### 주요 집계 테이블
대시보드 위젯은 전 시스템의 핵심 데이터를 요약하여 보여줍니다.

- **`attendance_logs`**: 실시간 입장/수업 체크인 현황 집계
- **`payments`**: 오늘/이번 달 신규 매출 합계 계산
- **`users`**: 전체 회원 수 및 신규 가입자 추이 집계
- **`audit_logs`**: 관리자의 최근 활동 내역 추출

### 연관 필드 (Core Metrics)
- `COUNT(attendance_logs)` where `DATE(checkin_at) = TODAY`
- `SUM(payments.amount)` where `status = 'Success'`
- `COUNT(users)` where `active = 1`
