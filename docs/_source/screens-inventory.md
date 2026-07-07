# [원자료] 화면별 기능 인벤토리 (as-is)

> 재구축 설계서의 근거 스냅샷. `.docs/sitemap/` 전체 정독 + 실제 `src/app/**/page.tsx` 80개 라우트 대조 결과 (2026-07-06).
> 이 문서는 **현행(as-is) 기록**이며, to-be 설계는 `.docs/rebuild/0X-*.md`를 따른다.

## 전역 구조

| 앱 | URL Prefix | Role 가드 | 성격 |
|---|---|---|---|
| 인증 | `/auth/*` | 공통 | 로그인/가입/재설정 |
| Admin | `/admin/*` | `admin` | 데스크탑 고밀도 운영도구 (다크) |
| User | `/apps/*` | `member` | 모바일 하단탭 앱 |
| Coach | `/coach/*` | `coach` | 모바일 필드 운영앱 (하단탭) |
| Class | `/class/*` | 공용/지점 계정 | TV 대형스크린 |
| Kiosk | `/kiosk/*` | 공용/지점 계정 | 입구 무인 체크인 단말 |

## 0. 인증 (`/auth/*`)
- `/auth/login`: 이메일/비밀번호, Remember Me, 역할별 리다이렉트(Admin→/admin/dashboard, Coach→/coach/dashboard, Member→/apps/dashboard)
- `/auth/signup`: 3-Step(계정→기본정보→약관), 가입 후 인증메일
- `/auth/reset-password`: 3-Step, 링크 유효 1시간
- `/auth/email-verify`, `/auth/logout`
- 정책: Supabase Auth JWT, 세션 7일(RM 30일), 비밀번호 8자·3종, Rate Limit(실패 5회→10분)
- **문서 누락(실존)**: `/auth/callback`(OAuth 콜백), `/auth/pending-approval`(승인 대기), `/auth/rejected`(거부) — 가입→승인 워크플로우가 미문서화
- 미구현: 소셜 로그인(Google/Kakao) = Phase 2

## 1. Admin (`/admin/*`) — 5그룹
### Insights
- `/admin/dashboard`: 실시간 KPI, 주간 추이, 긴급 위젯, 위젯형 Quick Actions
- `/admin/insights/attendance`: 요일/시간 Heatmap, CSV/Excel
- `/admin/insights/finance`: 요금제별 매출, 결제수단 통계, 예상 정산
- `/admin/insights/feedback`: 수업별 평점 트렌드, 코치별 평점, 저평점 분류·답변
- 스테일: `/admin/insights/coaches` 링크(위젯) — 실제 라우트 없음(coaches 성과분석 탭으로 통합됨)

### User & Finance
- `/admin/members` (+`/[id]` 상세): 통합검색, 프로필, 강제연장/블랙리스트/상담로그
- `/admin/memberships`: 수동 생성/연장/홀딩/재개/크레딧 조정/양도/이력
- `/admin/checkins`: 실시간 체크인 로그, 수동 출석
- `/admin/plans`: 기간제/횟수권 설계, 환급규정/홀딩/지점공유
- `/admin/transactions`: PG 승인/취소, 환불 워크플로우, 월정산

### Operations
- `/admin/operations/schedule`: 주간 DnD 세션, 다중코치, WOD 연동
- `/admin/operations/coaches`: 2탭(코치관리[등록 2-Step/계정연결]/성과분석[KPI/랭킹]) + 급여 설정
- `/admin/operations/reservations`: 확정 명단, 대기열 우선순위, 노쇼 통제
- `/admin/operations/race`: 이벤트 생성, PM5 기기 관리, 기록 통계
- `/admin/operations/lockers`: KPI, 목록, 배정/해제
- `/admin/operations/infrastructure`: 고정 QR, 키오스크 원격제어(kiosk_devices)
- `/admin/operations/wod-templates`: 스코프(Benchmark/Facility/Shared), 편집 패널, movement 검색, draft/publish
- `/admin/operations/roles`: RBAC(admin_roles/admin_user_roles), 권한 매트릭스, 사용자 배정
- `/admin/operations/movement-library`: 카테고리 동적, 마스터-디테일, fn_list_movement_library
- **미문서화(실존)**: `/admin/operations/badges` — 배지 관리 CRUD

### CRM
- `/admin/crm/content`: 공지/배너
- `/admin/crm/notifications`: 3탭(History/Rules/Compose), 자동규칙(pg_cron/트리거), 채널(In-App/Push/카카오·SMS)
- `/admin/crm/support`: 티켓 상태별 관리, FAQ
- `/admin/crm/feedback`: 수업 피드백 관리·답변 (insights/feedback과 이중화)

### Setup
- `/admin/setup/branch`: 지점 정보/운영시간/약관
- `/admin/setup/system`: PG 연동키, API/Webhook
- `/admin/setup/settings`: 업로드 설정, 사이트 정보, Quick Action Manager 탭
- `/admin/setup/audit`: 관리자 액션/에러 로그

### Dashboard Widget System (설계서)
- 위젯 8종(members/schedule/checkins/transactions/notifications/memberships/coaches/support), 모달 18종, @dnd-kit DnD, localStorage 상태(DB 이관 예정), AI 위젯 생성기(Gemini, 설계만)

## 2. User (`/apps/*`)
하단탭: dashboard/schedule/checkin/facilities/profile
- `/apps/dashboard`: 오늘 예약·체크인, 다음 수업, 공지/알림, 멤버십 D-Day
- `/apps/schedule` (+`/bookings`): 주간 목록·필터, 예약/Waitlist/취소, WOD·서킷 뷰어
- `/apps/checkin`: 동적 QR(5분), 월간 출석 캘린더, 통계
- `/apps/facilities`: 지점 정보/지도
- `/apps/profile` (+edit/memberships/payments/settings/support 하위 5), `/apps/profile/notifications`
- `/apps/notifications`: 알림 히스토리+Realtime 토스트
- `/apps/purchase` (+success/fail): 요금제, Toss 결제(simulation 기본)
- `/apps/feedback`: 수업 후 별점/리뷰
- `/apps/records`: WOD 기록(For Time/AMRAP/Weight), PR 관리
- `/apps/badges` ✅, `/apps/coaches` ✅, `/apps/leaderboard` ✅

## 3. Coach (`/coach/*`) — 전체 ✅ (P0~P2)
- Layout: AuthGuard + CoachStateGate(fn_get_my_coach_context: unlinked/linked_unassigned/linked_active/on_leave)
- `/coach/dashboard`: 오늘 수업, 운영위험 요약, 회원 경고 위젯(member_alert_flags), FollowupSummary(P2), 다음세션 CTA
- `/coach/schedule` (+`/rotation` 서킷 콘솔): 세션 운영보드(출결 7통계/일괄·개별 출결/대기열), WOD 패널, 런시트 패널(6탭), Race 수업시작(P2), 후속조치 생성(P2)
- `/coach/members`: 담당 스코프, 코칭노트, 컨텍스트 플래그 패널, 후속조치 타임라인, 퍼포먼스 프로필(벤치마크 즉시입력+PR)
- `/coach/race` (+`/control`): 3탭 허브(Live/기록/장비), Control(레인/팀전/카운트다운/BLE), ?event_id 딥링크
- `/coach/profile`: 상태 배지, 정보 수정, 급여/수당(read-only), KPI/리텐션
- 출결 상태기계: bookings.attendance_outcome (pending→checked_in/no_show/late_cancel/coach_excused/walk_in)
- DEPRECATED: wods 테이블, sessions.wod_description (→ session_wods + fn_get_class_display_wod)

## 4. Class (`/class/*`) — TV
- `/class/wod`: fn_get_class_display_wod 표준, 60s 갱신
- `/class/leaderboard`, `/class/timer`(4모드, 원격제어는 향후), `/class/live`
- `/class/race/view`(2.5D), `/class/race/run`(ERG 그리드), `/class/race/result`(포디움)
- `/class/screen`: Display-Safe 공개보드(P24)
- `/class/rotation-hud`: 6분할 서킷 HUD, Realtime 리모컨 수신

## 5. Kiosk (`/kiosk/*`) — 3화면 ✅
- `/kiosk`(Idle: 시계/공지/Heartbeat 30s), `/kiosk/scan`(카메라 QR→수동 폴백→체크인 분기), `/kiosk/success`(회원명/예약/잔여, 5s 복귀)
- ⚠️ QR 자동 디코딩은 mock(수동입력) — jsQR 통합 예정
- ⚠️ 문서 네이밍 불일치: check_ins/checkins, reservations/bookings, plans/membership_plans

## 6. 라우트 전수 대조 요약 (80 page.tsx)
- 문서에만 존재: `/admin/insights/coaches` (스테일 링크)
- 실존·미문서화: `/`, `/admin`, `/apps`, `/coach`, `/class` (인덱스), `/auth/callback`, `/auth/pending-approval`, `/auth/rejected`, `/admin/operations/badges`
- 기능 언급·라우트 미명시(실존): `/apps/profile/{edit,memberships,payments,settings,support}`, `/apps/purchase/{success,fail}`, `/apps/schedule/bookings`
