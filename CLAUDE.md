# BCL Portal

크로스핏/로잉 체육관 운영 플랫폼. 6개 앱(auth/admin/apps=회원/coach/class=TV/kiosk) + Supabase + Python BLE 브릿지.

## 스택
- Next.js(App Router, standalone, CSR 강제) · TypeScript strict · Supabase(Auth/Postgres/RLS/Realtime/Edge Functions)
- 자체 Ubuntu Docker 배포(portal 3000 내부/3001 외부, race-service 8001) · GitHub Actions CI/CD
- 스타일: `--bcl-*` 디자인 토큰 단일 체계(docs/12-design-system.md) · Lexend · 4px grid

## 불변 규칙 (위반 = 리뷰 반려)
### 인증 (장애 이력 있음 — 절대 금칙)
- onAuthStateChange 콜백 안에서 `await` 금지 (락 교착 → 로그인 5~10초 지연 실사고)
- Supabase 클라이언트는 `src/lib/supabase/` 팩토리로만 생성. 쿠키명/storageKey 수동 정의 금지
  (`AUTH_STORAGE_KEY`는 `src/lib/supabase/constants.ts` 한 곳에만 존재)
- 역할별 리다이렉트는 `resolvePostLoginRoute(profile)` 단일 함수만 사용 (분산 구현 금지)
- 로딩 실패 시 에러 표면화 필수 — 무한 스피너 금지

### 결제 (Fail-to-NOT-charge)
- 클라이언트가 보낸 금액을 절대 신뢰하지 않는다 — 서버에서 `membership_plans.price` 재조회 비교
- orderId UNIQUE + `SELECT ... FOR UPDATE` 필수. 자동결제/재시도/빌링키 저장 금지
- 결제 한도 = min(Admin 설정, env) 이중장치. 환불 = 관리자 2단계 확인 + 서버 계산(`fn_calculate_refund`, 10% 캡) + audit_logs

### 데이터
- 비즈니스 테이블 참조는 `member_id`만 사용 — auth `user_id`를 비즈니스 FK로 쓰지 않는다
  (members/coaches.user_id는 nullable — 계정 미연결 회원 존재)
- DB 접근은 `query()`/`rpc()` 헬퍼 경유만. supabase-js 직접 호출 금지
- 테이블 표준명: `checkins`/`bookings`/`membership_plans` (check_ins·reservations·plans 금지)
- 신규 RPC = SECURITY DEFINER + `SET search_path=public` + 내부 `auth.uid()` 검증
  (클라이언트가 coach_id 등 식별자 전달 금지) + envelope `{success, data, error}` 1종
- 신규 테이블은 RLS 필수. DELETE 정책 = admin 전용
- 예약/취소/노쇼 정책은 `facilities.booking_policy` 단일 소스 — 클라이언트 하드코딩 금지

### UI — 토큰만 사용
- 색/간격/radius는 `--bcl-*` 토큰만. hex 하드코딩·인라인 스타일 재구현·수동 유틸 클래스 신설 금지
  (HEX 리터럴은 `src/styles/tokens.css`에만 — 예외 1곳: `src/lib/brand.ts`(PWA themeColor·캔버스 폴백용 JS 미러))
- 표준 컴포넌트(`src/components/ui/`) 밖에서 버튼/모달/입력 재구현 금지
- Class/Race 화면: rAF + DOM 직접 조작(React 리렌더 우회), Display-Safe(부상/메모/정산 비노출)
- Race TV 코스 2모드(세로/가로 — `race_events.course_layout`, 생성 시 결정)는 **기능 동등 유지**:
  레이스 기능 추가/변경 시 두 레이아웃 모두 반영·검증 (표시 지오메트리 외 분기 금지)

## 명령어
- `npm run dev` — 로컬 개발 (3000)
- `npm run lint && npm run typecheck` — 커밋 전 필수 (경고 0)
- `npm run test` — Vitest 단위 / `npm run test:e2e` — Playwright (auth.smoke 필수 통과) ※ Phase 1에서 러너 추가
- `npx supabase db push` — 마이그레이션 적용은 /db-migration 스킬 절차로만
- 배포: main push → GitHub Actions (수동 배포는 /deploy 스킬 참조)

## 검증 절차
1. 코드 변경 후: lint → typecheck → 관련 단위 테스트
2. 화면/플로우 변경: /verify 스킬로 실제 구동 확인 (역할별 로그인 → 해당 라우트)
3. 인증 관련 변경: `npm run test:e2e -- auth.smoke` 통과 없이는 커밋 금지
4. 스키마 변경: /db-migration 스킬 (로컬 적용 → 타입 재생성 → 원격은 승인 후)

## 금지사항
- `.env*`·Service Role Key를 클라이언트 번들에 노출 (릴리즈 게이트: `.next/static` 내 SRK 0건)
- 마이그레이션 파일 사후 수정 (새 파일로만 전진)
- 완료 이력 문서 작성 (git log가 이력) · 문서 신설 남발 (변경 시 갱신 문서 1개 이하 — docs/00-overview.md 규칙)
- 레거시 부활 금지: `wods` 테이블, `sessions.wod_description`, fn_get_coach_dashboard류 구 RPC
  (구 소스·구 스키마 참조가 필요하면 `docs-legacy/` 열람만 — 코드로 복사 금지)

## 문서 지도
- **설계 SSOT**: `docs/00-overview.md`(색인) → 01 인증 · 02~06 앱별 · 07 데이터모델(+`docs/sql/` DDL) · 08 연동
  · 12 디자인 · 15 Race · 16 벤치마킹 갭 · `docs/_source/contract.md`(표준 계약)
- 구현 진행에 따라 `docs/screens/<app>/<route>.md` 라우트 1:1 화면 명세로 분화한다 (docs/13 §4)
- as-is 아카이브: `docs-legacy/` (구 문서·구 마이그레이션 31개 — 데이터 이관 대조용, 수정 금지)
