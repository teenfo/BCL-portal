# BCL Portal – 다음 단계 작업 목록

**작성일**: 2026-02-17
**상태**: 알림 시스템 구현 완료 후 다음 단계
**우선순위**: 🔴 높음 | 🟡 중간 | 🟢 낮음

---

## 📋 목차
1. [알림 시스템 실 가동 전 확인](#1-알림-시스템-실-가동-전-확인)
2. [User App 핵심 화면 개발](#2-user-app-핵심-화면-개발)
3. [Admin Portal 고도화](#3-admin-portal-고도화)
4. [데이터베이스 & 보안](#4-데이터베이스--보안)
5. [성능 최적화](#5-성능-최적화)

---

## 1. 알림 시스템 실 가동 전 확인

### 🔴 1.1 pg_cron 작동 확인
**목표**: Supabase pg_cron이 정상적으로 자동 알림을 발송하는지 확인

**작업 항목**:
- [ ] Supabase Dashboard → Database → Cron Jobs 확인
- [ ] `class-reminder-every-10min` 크론 작업 실행 이력 확인
- [ ] `membership-expiry-daily-9am` 크론 작업 실행 이력 확인
- [ ] 테스트용 수업 데이터 생성 (1시간 후 시작 예정)
- [ ] 10분 후 알림이 자동 생성되는지 `notifications` 테이블 확인

**예상 소요 시간**: 30분

**참고 자료**:
- `.docs/planning/notification-system.md` § 자동 알림 엔진
- Supabase Cron 문서: https://supabase.com/docs/guides/database/extensions/pg_cron

---

### 🔴 1.2 DB 트리거 테스트
**목표**: 예약 취소 시 대기열 알림, 체크인 완료 시 격려 메시지가 자동 발송되는지 확인

**작업 항목**:
- [ ] **빈자리 알림 트리거 테스트**:
  1. 만석인 수업에 대기열(waitlist) 예약 생성
  2. 기존 예약자 1명의 상태를 `cancelled`로 변경
  3. `notifications` 테이블에 대기열 회원에게 알림이 자동 생성되었는지 확인
- [ ] **체크인 완료 알림 트리거 테스트**:
  1. 회원의 체크인 레코드 생성 (`status='completed'`)
  2. `notifications` 테이블에 격려 메시지가 자동 생성되었는지 확인
  3. 월간 출석 횟수가 메시지에 정확히 포함되는지 확인

**예상 소요 시간**: 30분

**참고 SQL**:
```sql
-- 빈자리 알림 트리거 테스트
UPDATE bookings SET status = 'cancelled' WHERE id = 'booking_id_here';

-- 체크인 알림 트리거 테스트
INSERT INTO checkins (member_id, session_id, status, checked_in_at)
VALUES ('member_id_here', 'session_id_here', 'completed', NOW());
```

---

### 🟡 1.3 Web Push 실제 발송 테스트
**목표**: Web Push 알림이 실제로 디바이스에 도착하는지 확인 (iOS PWA 포함)

**작업 항목**:
- [ ] **Android/Desktop 테스트** (브라우저에서 바로 가능):
  1. User App 접속 (`/apps/dashboard`)
  2. 브라우저 알림 권한 허용
  3. `/apps/profile/notifications`에서 Push 토글 활성화
  4. Admin에서 테스트 알림 수동 발송 (`/admin/crm/notifications` → Compose 탭)
  5. 브라우저가 닫혀있어도 알림 수신 확인
- [ ] **iOS PWA 테스트**:
  1. iPhone Safari에서 BCL Portal 접속
  2. 공유 버튼 → "홈 화면에 추가"
  3. 홈 화면에서 BCL 앱 아이콘 실행 (Standalone 모드)
  4. 알림 권한 허용
  5. Push 토글 활성화
  6. Admin에서 테스트 알림 발송
  7. 앱이 닫혀있을 때 알림 수신 확인

**예상 소요 시간**: 1시간

**참고 자료**:
- VAPID 키: `.env.local` (보안 유지)
- Push 발송 Edge Function: `send-push-notification`

---

### 🟡 1.4 카카오 알림톡/SMS 외부 API 연동
**목표**: 외부 채널 (카카오 알림톡, SMS) 실제 발송 준비

**작업 항목**:
- [ ] **카카오 비즈메시지 API 키 발급**:
  1. 카카오 비즈니스 계정 생성 (https://business.kakao.com)
  2. 알림톡 템플릿 등록 및 승인
  3. API 키 발급
  4. Supabase Edge Function Secrets에 `KAKAO_API_KEY` 등록
- [ ] **SMS 서비스 API 키 발급** (알리고, 네이버 클라우드 등):
  1. SMS 서비스 가입
  2. 발신번호 등록 및 인증
  3. API 키 발급
  4. Supabase Edge Function Secrets에 `SMS_API_KEY`, `SMS_SENDER` 등록
- [ ] **Edge Function 코드 업데이트**:
  1. `supabase/functions/send-external-notification/index.ts`의 주석 제거
  2. 실제 API 엔드포인트로 교체
  3. 재배포: `supabase functions deploy send-external-notification`
- [ ] **테스트 발송**:
  1. Admin에서 카카오 알림 선택하여 발송
  2. 실제 카카오톡으로 메시지 수신 확인
  3. Admin에서 SMS 선택하여 발송
  4. 실제 SMS 수신 확인

**예상 소요 시간**: 2~3시간 (API 계정 승인 대기 시간 제외)

**참고 자료**:
- Edge Function: `supabase/functions/send-external-notification/index.ts`
- 카카오 비즈메시지: https://business.kakao.com/info/bizMessage/
- 네이버 클라우드 SENS: https://www.ncloud.com/product/applicationService/sens

---

## 2. User App 핵심 화면 개발

### 🔴 2.1 Home (Dashboard) 화면
**목표**: 회원의 메인 대시보드 – 회원권 정보, 다음 예약, 출석 현황

**작업 항목**:
- [ ] **레이아웃 & 디자인**:
  - [ ] Figma 디자인 참고 (StitchMCP Project ID: `432557053076320380`)
  - [ ] Stitch MCP로 UI 스크린 생성 (`.agent/workflows/design-screen.md` 참조)
- [ ] **데이터 연동**:
  - [ ] 현재 활성 멤버십 조회 (`memberships` 테이블)
  - [ ] 다음 예약 조회 (`bookings` 테이블, `status='confirmed'`, `start_time > NOW()`)
  - [ ] 이번 달 출석 횟수 (`checkins` 테이블, `DATE_TRUNC('month')`)
  - [ ] 최근 공지사항 3건 (`notices` 테이블)
- [ ] **주요 컴포넌트**:
  - [ ] 멤버십 카드 (플랜명, 만료일 D-Day, 잔여 크레딧)
  - [ ] 다음 수업 카드 (시간, 코치, 예약 취소 버튼)
  - [ ] 이번 달 출석 현황 (진행바, 목표 대비 % 표시)
  - [ ] 공지사항 목록 (최근 3건, "더보기" 링크)
- [ ] **사용자 경험**:
  - [ ] 로딩 스켈레톤 추가
  - [ ] Empty State (멤버십 없음, 예약 없음)
  - [ ] CTA 버튼 ("지금 예약하기", "회원권 구매")

**우선순위**: 🔴 높음 (User App의 첫 인상)

**예상 소요 시간**: 3~4시간

**파일 위치**: `src/app/apps/dashboard/page.tsx` (현재 Placeholder 수정)

**참고 자료**:
- `.docs/sitemap/user-app.md` § Home
- Glassmorphism 가이드: `.agent/skills/ui-gen/SKILL.md`

---

### 🔴 2.2 Schedule (수업 캘린더) 화면
**목표**: 주간 수업 목록 조회, 실시간 예약/대기열 등록

**작업 항목**:
- [ ] **주간 캘린더 UI**:
  - [ ] 날짜 선택 바 (주간 단위 슬라이드)
  - [ ] 선택한 날짜의 수업 목록 (시간순 정렬)
- [ ] **수업 카드**:
  - [ ] 수업명, 시간, 코치, 난이도, 정원 정보
  - [ ] 실시간 예약 가능 여부 (`capacity` vs `current_bookings`)
  - [ ] 만석일 경우 "대기열 등록" 버튼
- [ ] **필터링**:
  - [ ] 코치별 필터 (드롭다운)
  - [ ] 난이도별 필터 (Beginner/Intermediate/Advanced)
- [ ] **예약 프로세스**:
  - [ ] "예약하기" 버튼 클릭 → 확인 모달 → `bookings` INSERT
  - [ ] 대기열 등록 → `status='waitlist'` INSERT
  - [ ] 예약 취소 → `status='cancelled'` UPDATE (빈자리 알림 트리거 발동)
- [ ] **내 일정 탭**:
  - [ ] 예정된 예약 목록 (`bookings.status='confirmed'`)
  - [ ] 과거 참여 이력

**우선순위**: 🔴 높음 (핵심 기능)

**예상 소요 시간**: 4~5시간

**파일 위치**: `src/app/apps/schedule/page.tsx` (현재 Placeholder 수정)

**참고 자료**:
- `.docs/sitemap/user-app.md` § Schedule
- 예약 프로세스 로직: `.docs/planning/` (추후 작성 필요)

---

### 🔴 2.3 Check-in (QR 체크인) 화면
**목표**: 동적 QR 코드 생성, 실시간 체크인 기록

**작업 항목**:
- [ ] **QR 코드 생성**:
  - [ ] QR 라이브러리 설치: `npm install qrcode.react`
  - [ ] 사용자 고유 체크인 코드 생성 (JWT 또는 UUID 기반)
  - [ ] QR 코드 30초마다 갱신 (보안 강화)
- [ ] **체크인 히스토리**:
  - [ ] 이번 달 출석 캘린더 (날짜별 체크인 표시)
  - [ ] 월간 통계 (총 출석, 연속 출석 일수)
- [ ] **데이터 연동**:
  - [ ] `checkins` 테이블 조회 (최근 30일)
  - [ ] RLS 정책: 본인 데이터만 조회 가능

**우선순위**: 🔴 높음 (출입 관리 핵심)

**예상 소요 시간**: 2~3시간

**파일 위치**: `src/app/apps/checkin/page.tsx` (현재 Placeholder 수정)

**참고 자료**:
- `.docs/sitemap/user-app.md` § Check-in
- QR 라이브러리: https://github.com/zpao/qrcode.react

---

### 🟡 2.4 Facilities (지점 정보) 화면
**목표**: 운영 중인 전 지점 정보 조회 (운영 시간, 주소, 지도, 편의시설)

**작업 항목**:
- [ ] **지점 목록**:
  - [ ] `facilities` 테이블 조회 (RLS: public 읽기 허용)
  - [ ] 지점별 카드 (이름, 주소, 운영 시간)
- [ ] **지점 상세**:
  - [ ] 지도 연동 (Google Maps 또는 Kakao Map API)
  - [ ] 편의시설 아이콘 (주차, 샤워실, 락커 등)
  - [ ] 전화번호, 이메일
- [ ] **연동**:
  - [ ] Admin Portal의 지점 설정 (`/admin/setup/branch`)과 실시간 동기화

**우선순위**: 🟡 중간

**예상 소요 시간**: 2~3시간

**파일 위치**: `src/app/apps/facilities/page.tsx` (현재 Placeholder 수정)

**참고 자료**:
- `.docs/sitemap/user-app.md` § Facilities

---

### 🟡 2.5 Profile (프로필 관리) 화면
**목표**: 기본 정보 수정, 회원권 관리

**작업 항목**:
- [ ] **기본 정보 수정** (`/apps/profile/edit`):
  - [ ] 이름, 전화번호, 이메일 수정 폼
  - [ ] `members` 테이블 UPDATE
- [ ] **회원권 관리** (`/apps/profile/memberships`):
  - [ ] 현재 활성 멤버십 상세 조회
  - [ ] 과거 멤버십 히스토리
  - [ ] 홀딩 신청 버튼 (Admin 승인 필요)
- [ ] **결제 내역** (`/apps/profile/payments`):
  - [ ] `transactions` 테이블 조회 (본인 데이터만)
  - [ ] 영수증 다운로드 (PDF 생성)

**우선순위**: 🟡 중간

**예상 소요 시간**: 3~4시간

**파일 위치**: 
- `src/app/apps/profile/edit/page.tsx`
- `src/app/apps/profile/memberships/page.tsx`
- `src/app/apps/profile/payments/page.tsx`

**참고 자료**:
- `.docs/sitemap/user-app.md` § Profile

---

## 3. Admin Portal 고도화

### 🟡 3.1 Race 페이지 DB 연동
**목표**: Mock 데이터를 실제 DB 테이블로 교체

**작업 항목**:
- [ ] **DB 테이블 생성**:
  - [ ] `race_events` (이벤트 정보)
  - [ ] `race_devices` (PM5 기기 정보)
  - [ ] `race_records` (기록 데이터)
- [ ] **RLS 정책**:
  - [ ] Admin만 이벤트/기기 관리 가능
  - [ ] 회원은 본인 기록만 조회 가능
- [ ] **페이지 수정**:
  - [ ] `/admin/operations/race/page.tsx`의 Mock 데이터 제거
  - [ ] Supabase 쿼리로 교체

**우선순위**: 🟡 중간

**예상 소요 시간**: 2~3시간

**참고 자료**:
- `.docs/sitemap/admin/03-operations.md` § Race

---

### 🟢 3.2 Audit Logs 실제 DB 연동
**목표**: 시스템 감사 로그 실제 DB 저장

**작업 항목**:
- [ ] **DB 테이블 생성**:
  - [ ] `audit_logs` (사용자 액션, IP, 타임스탬프, 심각도)
- [ ] **자동 로깅 미들웨어**:
  - [ ] 중요 액션 발생 시 자동 로그 저장 (회원 삭제, 결제 환불 등)
- [ ] **페이지 수정**:
  - [ ] `/admin/setup/audit/page.tsx`의 Mock 데이터 제거

**우선순위**: 🟢 낮음

**예상 소요 시간**: 2시간

---

### 🟢 3.3 Feedback 실제 DB 연동
**목표**: 수업 피드백 실제 데이터 저장 및 조회

**작업 항목**:
- [ ] **DB 테이블 생성**:
  - [ ] `session_feedback` (평점, 리뷰, 세션 ID, 회원 ID)
- [ ] **페이지 수정**:
  - [ ] `/admin/crm/feedback/page.tsx`의 Mock 데이터 제거
  - [ ] User App Feedback 페이지 (`/apps/feedback`)와 연동

**우선순위**: 🟢 낮음

**예상 소요 시간**: 2시간

---

### 🟢 3.4 Roles 실제 DB 연동
**목표**: 역할 및 권한 시스템 DB 연동

**작업 항목**:
- [ ] **DB 테이블 생성**:
  - [ ] `roles` (역할 정의)
  - [ ] `permissions` (권한 정의)
  - [ ] `role_permissions` (역할-권한 매핑)
- [ ] **페이지 수정**:
  - [ ] `/admin/operations/roles/page.tsx`의 Mock 데이터 제거

**우선순위**: 🟢 낮음

**예상 소요 시간**: 3시간

---

## 4. 데이터베이스 & 보안

### 🔴 4.1 RLS 정책 Supabase 적용
**목표**: 모든 테이블에 Row Level Security 정책 적용

**작업 항목**:
- [ ] **RLS 정책 검토**:
  - [ ] `.docs/database/rls-policies.sql` 파일 확인
  - [ ] 각 테이블별 정책 정의 검증
- [ ] **Supabase 적용**:
  - [ ] Supabase Dashboard → SQL Editor에서 정책 실행
  - [ ] 또는 마이그레이션 파일 생성 후 적용
- [ ] **테스트**:
  - [ ] User App에서 타인의 데이터 접근 시도 (거부되어야 함)
  - [ ] Admin 권한으로 모든 데이터 접근 가능 확인

**우선순위**: 🔴 높음 (보안 필수)

**예상 소요 시간**: 2~3시간

**참고 자료**:
- `.docs/security/rls-policies.md`
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security

---

### 🔴 4.2 테스트 계정 생성 및 실제 로그인 테스트
**목표**: 다양한 권한의 테스트 계정으로 실제 시나리오 검증

**작업 항목**:
- [ ] **테스트 계정 생성**:
  - [ ] Super Admin (모든 권한)
  - [ ] Admin (지점 관리자)
  - [ ] Coach (코치)
  - [ ] Member (일반 회원)
- [ ] **시나리오 테스트**:
  - [ ] 회원: 로그인 → 수업 예약 → 체크인 → 프로필 수정
  - [ ] 코치: 담당 수업 조회 → 출석 체크
  - [ ] Admin: 전체 회원 조회 → 멤버십 발급 → 알림 발송
- [ ] **권한 검증**:
  - [ ] 회원이 Admin 페이지 접근 시 리다이렉트 확인
  - [ ] RLS로 타인 데이터 접근 차단 확인

**우선순위**: 🔴 높음

**예상 소요 시간**: 2시간

---

## 5. 성능 최적화

### 🟢 5.1 이미지 최적화
**작업 항목**:
- [ ] Next.js Image 컴포넌트 사용 (`<Image>` 태그)
- [ ] 코치 프로필 이미지 WebP 변환
- [ ] Lazy Loading 적용

**우선순위**: 🟢 낮음

**예상 소요 시간**: 1~2시간

---

### 🟢 5.2 코드 스플리팅 & 번들 크기 최적화
**작업 항목**:
- [ ] `next/dynamic`으로 컴포넌트 동적 로딩
- [ ] 불필요한 라이브러리 제거
- [ ] Webpack Bundle Analyzer 실행 (`npm run analyze`)

**우선순위**: 🟢 낮음

**예상 소요 시간**: 2~3시간

---

### 🟢 5.3 Supabase 쿼리 최적화
**작업 항목**:
- [ ] N+1 쿼리 문제 해결 (JOIN 사용)
- [ ] 인덱스 추가 (자주 조회되는 컬럼)
- [ ] 페이지네이션 적용 (대량 데이터)

**우선순위**: 🟢 낮음

**예상 소요 시간**: 2~3시간

---

## 📅 권장 작업 순서

### Week 1: 알림 시스템 검증 + User App 핵심 화면
1. 🔴 알림 시스템 실 가동 전 확인 (1.1 ~ 1.2)
2. 🔴 User App: Home (Dashboard)
3. 🔴 User App: Schedule (수업 캘린더)
4. 🔴 User App: Check-in (QR 체크인)

### Week 2: User App 완성 + 보안 강화
5. 🟡 User App: Facilities, Profile
6. 🔴 RLS 정책 적용
7. 🔴 테스트 계정 생성 및 시나리오 테스트
8. 🟡 Web Push 실제 발송 테스트

### Week 3: Admin 고도화 + 외부 연동
9. 🟡 Admin: Race, Audit Logs, Feedback, Roles DB 연동
10. 🟡 카카오 알림톡/SMS API 연동
11. 🟢 성능 최적화

---

## 📚 참고 자료

### 문서
- 프로젝트 블루프린트: `.docs/project-blueprint.md`
- Sitemap: `.docs/sitemap/`
- 알림 시스템 기획: `.docs/planning/notification-system.md`
- 완료 리포트: `.docs/archive/result/NOTIFICATION_SYSTEM_COMPLETE.md`

### 워크플로우
- 화면 디자인: `.agent/workflows/design-screen.md`
- 페이지 추가: `.agent/workflows/add-page.md`
- 문서 동기화: `.agent/workflows/sync-docs.md`

### 스킬
- UI 생성: `.agent/skills/ui-gen/SKILL.md`
- DB 마이그레이션: `.agent/skills/db-migration/SKILL.md`
- 커밋: `.agent/skills/commit-bot/SKILL.md`

---

**작성자**: Antigravity Agent  
**마지막 업데이트**: 2026-02-17 20:01
