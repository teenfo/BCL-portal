# 09. 비기능 요구 — 보안 · 성능 · 테스트 전략 · 릴리즈 게이트

> 근거: `_source/nonfunctional-history.md`(보안 v2.0.0 3분류/성능/부채), `_source/backend-inventory.md`(RLS/RPC 원칙), `_source/contract.md` §3
> 표기: ✅ 운영 · 🟡 코드완료(검증 대기) · 🧪 mock · ⏳ 미구현 · 🔄 to-be 변경

---

## 1. 보안

### 1.1 as-is 3분류 승계 + 재구축 승격

**✅ 적용 완료 (그대로 승계 — 회귀 금지)**

| 항목 | 내용 |
|------|------|
| 인증 | Supabase JWT + bcrypt(Supabase Auth 내장), `profiles.approval_status` 승인 게이트 |
| RLS 전면 | 전 테이블 RLS 활성 + anon 차단. 의도적 예외 2건만: `session_rotation_states` SELECT(TV HUD), `fn_get_class_display_wod` |
| RBAC | `profiles.role` 3역할 판정 → 🔄 to-be에서 `admin_user_roles` 단일 소스 통합(07 문서) |
| SRK 격리 | Service Role Key는 서버(race-service env, EF Secrets)에만 — 클라이언트 번들 0건 |
| nginx 보안 헤더 | X-Frame-Options / X-Content-Type-Options / Referrer-Policy / Permissions-Policy |
| 입력 방어 | 업로드 10MB 제한(`client_max_body_size`), XSS(React 이스케이프+입력 검증), SQLi(파라미터라이즈드 RPC) |

**🟡 부분 적용 (재구축 중 완결)**

| 항목 | 완결 조건 |
|------|-----------|
| HTTPS + HSTS | 운영 nginx 443 TLS 종료 확정(11 문서 §2) 후 HSTS 헤더 활성화(`max-age=31536000; includeSubDomains`) — 평문 80은 301 리다이렉트만 |
| 백업 복구 리허설 | cutover 리허설(11 문서 §3)에 복구 훈련 편입 — pg_dump 복원→검증 대사 쿼리 통과를 절차화 |

**⏳ 계획 → 🔄 재구축 필수 승격 4항목** (cutover 전 완료가 게이트)

| # | 항목 | 설계 |
|---|------|------|
| 1 | **CSP Report-Only** | `Content-Security-Policy-Report-Only` 헤더로 시작(nginx). 허용 목록: self + Supabase 도메인 + Toss 위젯(`js.tosspayments.com`) + data:. 2주 리포트 수집 후 위반 0건이면 enforce 전환 |
| 2 | **nginx rate limit** | as-is 주석 상태를 활성화: `zone=auth_limit rate=10r/m`(로그인/가입/비밀번호 재설정), `zone=api_limit rate=100r/m`(일반), `burst` 허용 + 429 응답. 키오스크/TV 고정 IP는 화이트리스트 |
| 3 | **server_tokens off** | 전 server 블록 명시(as-is 존재 — staging 포함 신규 conf에도 누락 금지) |
| 4 | **Dependabot** | `.github/dependabot.yml` — npm(주간)+github-actions(주간)+pip(race/, 주간). security 업데이트는 자동 PR, quality 워크플로우 통과 시에만 병합 |

**⏳ 계획 유지(재구축 범위 외, 로드맵 기록)**: MFA, CSRF 토큰(현 구조는 JWT Bearer로 위험 낮음), Fail2ban, 개인정보 파기 절차 자동화.

### 1.2 RLS / RPC 게이트 규칙 (신규 코드 표준)

- **신규 테이블**: `ENABLE ROW LEVEL SECURITY` 없는 CREATE TABLE 병합 금지. anon 정책 신설은 설계서에 예외 등재된 경우만
- **신규 RPC**: `SECURITY DEFINER` + `SET search_path = public` + 함수 첫 블록에서 `auth.uid()` 기반 권한 검증(공통 게이트 `_assert_admin()`/`_assert_coach_of_session()` 2종 경유) — **클라이언트가 coach_id/member_id 등 식별자를 전달하는 시그니처 금지**
- 쓰기 하드닝 표준: INSERT/UPDATE = admin+coach(도메인별), DELETE = admin 전용
- envelope `{success, data, error}` 1종 — 에러에 내부 스택/SQL 노출 금지
- 회원 비노출 데이터: `coach_followups`·`member_alert_flags`·정산은 회원 role SELECT 불가, Class 화면은 Display-Safe(부상/메모/위험/정산 비노출)

### 1.3 시크릿 관리

| 등급 | 대상 | 규칙 |
|------|------|------|
| 공개 가능 | `NEXT_PUBLIC_*` (Supabase URL/anon key, VAPID public) | 빌드 ARG 허용. anon key는 RLS가 방어선임을 전제 |
| 서버 전용 | `SUPABASE_SERVICE_ROLE_KEY` | 서버 `.env.local` + docker env로만 주입. **릴리즈 게이트: `grep -r "service_role" .next/static` 0건** |
| EF 전용 | VAPID private, KAKAO/SMS 키 | `supabase secrets set` — 저장소·이미지에 미포함 |
| DB 암호화 | Toss secret/webhook/POS 키 | `pg_settings` pgp_sym 암호화 컬럼. 복호화는 `get_decrypted_pg_settings`(admin 전용)·EF 내부만 |
| CI | SSH 접속 정보 | GitHub Secrets(11 문서 §5 명명 규약). 로그 마스킹 확인 |

공통 금지: 시크릿의 코드 하드코딩, console.log 출력, `.env.local`의 git 추적(`.gitignore` 유지), 예제 파일에는 placeholder만.

---

## 2. 성능

### 2.1 렌더링 원칙 — CSR 강제

- 전 앱 CSR(`'use client'`) 기준 — Supabase 클라이언트 SDK+Realtime 중심 아키텍처와 정합. SSR 도입은 인증 쿠키 이슈 재발 벡터이므로 금지(01 문서 인증 계약)
- Next.js standalone 빌드, 페이지 단위 코드 스플리팅은 기본 동작에 위임. TV/키오스크는 저사양 기기 전제로 무거운 라이브러리(차트 등) lazy import

### 2.2 Class/Race 고빈도 렌더 패턴 — rAF + DOM 직접 조작

React 상태 갱신(리렌더)은 0.3s×20레인 스트림을 감당하지 못한다(as-is 검증된 패턴 승계):

1. Broadcast 수신 데이터는 **ref/외부 스토어에만 기록** — setState 금지(리렌더 우회)
2. `requestAnimationFrame` 루프에서 DOM 노드에 직접 반영(`transform`/텍스트) — 목표 **20레인 60fps**
3. 위치 보간 **LERP 300ms**(0.3s 수신 간격 사이 부드러운 이동), 러버밴딩 없는 실거리 기반
4. 레이아웃 스래싱 금지: 읽기(측정)와 쓰기(스타일) 분리, `transform`/`opacity`만 애니메이션(리플로우 회피)
5. 언마운트 시 rAF/채널 정리 필수(누수=장시간 TV 구동 사고)

### 2.3 인덱스 전략 원칙 (07 문서의 산정 기준)

- **쿼리 패턴 기준 재산정**: as-is 20+ 단일컬럼 인덱스를 그대로 옮기지 않고, 화면·RPC별 실제 WHERE/ORDER BY에서 도출한 **복합 인덱스 위주**로 재설계
- 표준 패턴: `bookings(session_id, status)`, `sessions(facility_id, session_date)`, `checkins(member_id, checkin_time)`, `notifications(user_id, is_read, created_at)`, `transactions(order_id UNIQUE)`, `race_live_state(event_id, device_id UNIQUE)`
- FK 컬럼은 조회 패턴이 있을 때만 인덱스(맹목적 FK 인덱스 금지), 부분 인덱스 적극 사용(`WHERE status='confirmed'` 등), UNIQUE 제약이 동시성 방어를 겸하는 곳(orderId, race_records(event,member)) 우선

### 2.4 Realtime 용량 계산

| 소스 | 산정 | 결과 |
|------|------|------|
| Race Broadcast(`race:{event_id}`) | 20레인 × 1msg/0.3s | ~67 msg/s (버스트 상한) |
| race_live_state UPSERT | 20레인 / 5s | 4 msg/s |
| In-app 알림/rotation HUD | 산발 | < 1 msg/s |

- Supabase Realtime 기본 한도(프로젝트 기본 500 msg/s, 채널당 rate 설정 가능) 대비 **최대 부하 ~70 msg/s ≈ 14%** — 여유. 단 Broadcast는 **DB 미기록 경로**(postgres_changes 아님)를 유지해 DB 부하와 분리
- 구독자 수: TV 2~3 + 코치 1 + 관리 1 = 채널당 ~5 클라이언트. 시청자 확장 시에도 Broadcast는 fan-out만 증가(DB 무관)
- 수용 검증: Race L1 시뮬레이터로 20레인 풀부하 30분 구동 시 메시지 드랍/지연 없이 60fps 유지(15 문서 수용 기준과 연동)

---

## 3. 테스트 전략 — 현행 0 해소 (재구축 필수)

> as-is는 테스트 러너·파일이 **전무**(계획 문서만 존재). 재구축은 아래 3층을 Phase 1부터 함께 구축하며, CI 편입까지가 완료 정의다.

### 3.1 3층 구조

| 층 | 도구 | 대상 | 시점 |
|----|------|------|------|
| 단위 | **Vitest** | RPC 헬퍼(`query()`/`rpc()` envelope 파싱·에러 매핑), 유틸(위약금·예상정산 계산 미러, QR 페이로드 인코딩/만료 판정, `resolvePostLoginRoute`), 날짜/크레딧 로직 | Phase 2부터 상시 |
| E2E | **Playwright** | ① **인증 스모크(필수 게이트)**: 로그인→역할별 진입→새로고침 세션 유지→앱 전환→로그아웃 — 실패 시 **배포 차단**(인증 반복 장애 이력의 구조적 재발 방지) ② 예약→체크인: 플랜 보유 회원이 세션 예약→크레딧 차감→QR/키오스크 체크인→attendance 반영 ③ 세션 보드 출결: 코치 로그인→오늘 세션 보드→출결 일괄 마킹→집계 확인 | Phase 3(①)→4(②③) |
| Race L1 | **시뮬레이터 기반** | race-service `/api/sim/*`로 가상 20레인 레이스 구동 → lobby→countdown→racing→finished 상태 전이, live_state 스냅샷, 종료 후 race_records 적재(멱등) 검증. Playwright로 2.5D 뷰 렌더 스모크 결합 | Phase 4 |

### 3.2 테스트 환경 규약

- E2E는 **staging Supabase 프로젝트**(운영과 분리) + 시드 계정 3종(admin/coach/member, 승인 완료 상태) 고정 — 시드는 `sql/` 시드 스크립트로 재현 가능해야 함
- 결제 E2E는 시뮬레이션 모드 한정(라이브 키 테스트 금지 — 08 문서 ❌ 원칙), 외부 채널은 mock 검증까지만
- 파일 배치: `tests/unit/**/*.test.ts`(Vitest), `tests/e2e/**/*.spec.ts`(Playwright), `race/tests/`(pytest — 파서/시뮬레이터 단위)
- npm 스크립트: `test`(vitest run), `test:e2e`(playwright test), `test:e2e:auth`(스모크만 — 배포 게이트용 태그 `@auth-smoke`)

### 3.3 CI 편입 설계 (11 문서 §5와 동일 정의)

```
quality.yml   push/PR:  lint(0 error) → typecheck → vitest → build
test.yml      PR→main:  Playwright(@auth-smoke 필수 + 주요 플로우) — Supabase staging 대상
              nightly:  전체 E2E + Race L1 시뮬레이터
deploy.yml    main push: quality+test 성공 조건부 → SSH 배포
```

- **인증 스모크 실패 = deploy 진입 불가**(required check). flaky 발생 시 스킵이 아니라 원인 수정이 원칙
- Playwright 트레이스/스크린샷 아티팩트 업로드(실패 건), 브라우저는 chromium 단일(TV/키오스크도 chromium 계열)

---

## 4. 릴리즈 게이트 체크리스트 (as-is 10섹션 승계·간소화)

> 매 운영 배포 전 통과 필수. ①~⑤는 CI 자동화, ⑥~⑩은 수동 확인.

| # | 게이트 | 기준 | 자동화 |
|---|--------|------|--------|
| ① | 품질 | ESLint 0 error / typecheck 통과 / build 성공 | CI |
| ② | 단위 테스트 | Vitest 전건 통과 | CI |
| ③ | **인증 E2E 스모크** | Playwright @auth-smoke 통과 — 실패 시 배포 차단 | CI(required) |
| ④ | 시크릿 유출 | `.next/static` 내 service_role 0건, 신규 시크릿 하드코딩 grep 0건 | CI 스크립트 |
| ⑤ | 의존성 | Dependabot critical 미해결 0건 | CI |
| ⑥ | DB 변경 | 신규 테이블 RLS 활성 / 신규 RPC SECURITY DEFINER+권한 게이트 / 마이그레이션 원격=로컬 일치(`supabase migration list` 대조) | 수동+advisor |
| ⑦ | 결제 안전 | 결제 코드 변경 시: 단독 커밋·리뷰 완료, 시뮬레이션 플로우 재검증, 자동결제 경로 부재 확인 | 수동 |
| ⑧ | 알림 | cron 2건 등록 상태(`cron.job` 조회), 트리거 2종 존재 | 수동 쿼리 |
| ⑨ | 인프라 | nginx conf 문법(`nginx -t`), 보안 헤더·rate limit 존치, /health 200 | 수동 |
| ⑩ | 롤백 준비 | 직전 이미지 태그 보존, DB 백업 최신본 확인, 롤백 절차(11 문서 §4) 숙지 | 수동 |
