# 코치 성과 리포트 (Coach Performance)

## 1. 개요
- **경로**: `/admin/reports/coaches`
- **아이콘**: `fa-award`
- **설명**: 코치별 수업 진행 횟수, 회원 만족도, 재등록률 등 성과 지표를 분석하는 리포트 화면입니다.

## 2. 주요 기능
- 코치별 담당 회원의 재등록률 및 중도 이탈률 분석
- 수업 후기 및 평점 데이터 통계
- 코치별 업무 로드 및 인건비 효율성 지표 분석

## 3. UI 컴포넌트
- 코치별 성과 비교 바 차트
- 별점 및 리뷰 워드클라우드/리스트
- 핵심 지표(KPI) 스코어보드

## 4. Database Requirements (DB Schema)

### 기초 데이터 테이블
- **`users`** (Role=coach): 코치 기본 정보
- **`sessions`**: 코치별 수업 진행 횟수 집계
- **`post_comments`**: 수업 후기 및 평점 데이터 원천 (수업 만족도 분석용)
- **`payments` / `membership_plans`**: 담당 회원의 재결제율(Retention) 계산을 위한 결제 이력

### 성과 컬럼 (Proposed)
- `users.rating_avg`: 코치 평점 (게시판/리뷰 기반 집계)
- `users.retention_rate`: 관리 회원 재등록률
