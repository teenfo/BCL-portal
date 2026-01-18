# 세션 운영 리포트 (Session Reports)

## 1. 개요
- **경로**: `/admin/reports/sessions`
- **아이콘**: `fa-chart-line`
- **설명**: 각 수업 세션별 예약률, 실제 출석률, 인기 수업 순위 등을 분석하는 리포트 화면입니다.

## 2. 주요 기능
- 수업 카테고리별(PT, GX, Yoga 등) 매출 및 점유율 분석
- 세션별 예약 취소/노쇼 비율 통계
- 인기 코치 및 인기 시간대 수업 분석

## 3. UI 컴포넌트
- 수업 점유율 파이 차트
- 세션 성과 랭킹 테이블
- 예약-출석 전환율 막대 차트

## 4. Database Requirements (DB Schema)

### 기초 데이터 테이블
- **`sessions`**: 전체 수업 리스트 및 시간대 정보
- **`bookings`**: 예약 인원 및 노쇼 비율 분석용 데이터
- **`attendance_logs`**: 실제 출석 인원 확인용
- **`users`**: 담당 코치별 실적 분석 연동

### 핵심 지표 계산 (Examples)
- **예약률**: `COUNT(bookings) / sessions.capacity`
- **노쇼율**: `(COUNT(bookings) - COUNT(attendance_logs)) / COUNT(bookings)`
