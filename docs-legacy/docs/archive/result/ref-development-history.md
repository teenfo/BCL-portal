# 프로젝트 개발 이력 통합 리포트
(Project Development History)

이 문서는 BCL Portal의 각 Phase별 실제 개발 내역(DB, Auth, 알림 시스템, 사용자 앱 구현 상태)을 정리한 문서입니다. 완료된 항목은 간략하게 요약되었으며, 데이터베이스 변경 사항이나 핵심적인 결정 내역은 보존되었습니다.

---

## 1. Database Schema (Phase 1)
**원본**: `PHASE1_DB_COMPLETE.md`
**일자**: 2026-02-17
**상태**: ✅ 완료

- **Schema**: 14개 핵심 테이블 기본 구성 완료 및 검증 (`001_initial_schema.sql`)
- **RLS 정책 구현**: 55개 정책, 14개 테이블에 안전하게 적용. `get_user_role()`, `is_admin()`, `is_coach()` 등 헬퍼 함수 구현 완료
- **Auth Trigger**: `handle_new_user()` 연동을 통해 신규 회원 프로필(`members`, `coaches`) 자동 생성 설정
- **기본 Seed Data**: 지점(2개), 요금제(5개), 초기 공지사항 데이터 삽입

---

## 2. 통합 Development Status
**원본**: `DEV_STATUS.md`
**일자**: 2026-02-17
**상태**: 🚧 기초 설계 후 프론트 개발 착수 시점

### 개발 단계별 착수 전략 (Foundation First)
1. **DB Schema & RLS** (Week 1-2): 스키마 설계 및 마이그레이션 (완료)
2. **Auth System** (Week 2): 인증 UI(Stitch 생성) 및 Supabase Auth 연동 (완료)
3. **Core Features** (Week 3-6): User App 및 Admin 우선순위 화면 개발 (진행 중)

---

## 3. 인증(Authentication) 시스템 구현 이력
**원본**: `AUTH_IMPLEMENTATION_PLAN.md`, `AUTH_COMPLETE.md`, `AUTH_TEST_REPORT.md`, `TEST_PROGRESS.md`
**일자**: 2026-02-17
**상태**: ✅ 코드 구현 완료 및 UI 검증

### 3.1 구현 완료 목록
- **전역 설정**: `AuthContext` (전역 인증 상태 공급), `AuthGuard` (역할 기반 라우트 컴포넌트)
- **로그인 (`/auth/login`)**: Email 및 소셜 로그인 Mock UI, Password 입력 컴포넌트
- **회원가입 (`/auth/signup`)**: 3단계 분할 플로우 (계정→개인정보→서비스약관), Validation 지원
- **패스워드 찾기 / 이메일 인증**: 토큰/리다이렉션 구조 준비됨
- **UI/UX**: 프리미엄 Glassmorphism 스타일 디자인 모듈(Stitch 기반) 화면 전역 적용

### 3.2 검증 테스트 결과 (AUTH_TEST_REPORT)
| 테스트 대상 화면 | 상태 | 검증 결과 특이사항 요약 |
|:---|:---:|:---|
| **Login Page** | ✅ 통과 | 400 Bad Request 에러 UI 응답 성공 |
| **Signup Form** | 🟡 양호 | Step 2 (개인정보)에서 Gender 필드 누락 |
| **Terms / OAuth**| ✅ 통과 | 플로우 정상 |
| **개발 환경 이슈** | ⚠️ 주의 | npm `node_modules` 권한 문제(EPERM 에러)로 chown, npm rebuild 진행 |

---

## 4. 통합 알림(Notification) 시스템 구축 
**원본**: `NOTIFICATION_SYSTEM_COMPLETE.md`
**날짜**: 2026-02-17
**상태**: ✅ 구현 및 마이그레이션 완료

### 4.1 시스템 변경 사항 보존
- **신규 테이블 구성**: `notifications`(기존 강화), `notification_rules`, `push_subscriptions`, `notification_preferences`
- **크론 & DB 트리거 로직 (6대 규칙)**
  - `fn_send_class_reminders()`: 수업 1시간 전 예약 발송 (10분 주기 분산)
  - `fn_send_membership_expiry_reminders()`: 멤버십 만료 7, 3, 1일전 발송 (일 1회)
  - `fn_notify_waitlist_on_cancel()`: 세션 취소 시 발생 대기열 전환 알림 (즉시)
  - `fn_notify_checkin_complete()`: 센터 입장 완료 알림 (즉시)
- **Supabase Edge Functions 활용**: `send-push-notification` (iOS/Web 푸시 VAPID 전송), `send-external-notification` (카카오톡, SMS 플러그 준비)
- **PWA 설정 지원**: `manifest.json` 세팅 완료, `sw.js` 백그라운드 구동 스크립트.

---

## 5. 사용자 앱 (User App) UI/UX 구현 점검 현황
**원본**: `USER_APP_INVESTIGATION_REPORT.md`
**작성일**: 2026-02-17

### 5.1 페이지별 프론트엔드 모듈 구현 상태

| 모듈 화면 (라우트) | 동작 상태 | UI 구현 요소 기술 내역 | 필요한 기능 보완 |
|:---|:---:|:---|:---|
| **Dashboard** 홈 | ✅ 95% | 시간대 응답 인사말, 스켈레톤, 예약 수업 안내, 알림 아이콘 | 데이터 실시간 Refetch 적용 |
| **Schedule** 수업일정 | ✅ 90% | 주간 달력, Book/Waitlist 필터 칩 전환 | 실 로직 검색/필터 적용 필요 |
| **Check-in** 체크인 | ✅ 100%| 실시간 타이머 갱신 기반 QR 코드 (30초 만료), Streak 표시 | — |
| **Facilities** 지점 | ✅ 95% | 지점별 상세 갤러리/주소 렌더링, Naver Map 앱스키마 딥링킹 | — |
| **Profile** 유저 | ✅ 90% | 잔여 이용권 리스트 매핑, 모달 처리 | 서브 뎁스 일부 페이지 누락 |
| **Notifications** | ✅ 95% | 카테고리 필터링 읽음 처리 토글 | — |
| **Purchase** 구매 | 🟡 85% | 기간권/횟수제 구분, 상품카드 베스트셀러 마킹, 하단 약관 | PG 모듈 통신 실 결제 미연동 |
| **Feedback** 평가 | ✅ 95% | Rate Stars 적용 (코치/수업 분리), 답변 컴포넌트 | — |
| **Records** 운동 | ✅ 90% | WOD 기록 양식 차트 대시보드 | PR 통계 테이블 스키마 분리 |

### 5.2 모바일 인터페이스 디자인 평가 요약
- React 컴포넌트 성능은 우수하나 `apps.css`의 용량(1400여줄) 및 단일 파일 집중 문제가 있어 최적화 권장 단계
- Safe-Area 탑재 하단 고정 네비게이션과 Glassmorphism 효과가 모바일 앱 퀄리티를 대폭 향상함
