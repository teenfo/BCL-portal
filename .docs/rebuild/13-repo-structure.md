# 13. Claude Code 최적화 신규 저장소 구조

> 재구축 저장소는 **기존 `.docs/`(sitemap/blueprint/planning) 구조를 승계하지 않는다.**
> 설계 목표: 에이전트가 매 세션 (1) CLAUDE.md 1개로 규칙을 파악하고 (2) 라우트명 grep 한 번으로 해당 화면 명세를 찾고 (3) 스킬 호출로 검증 절차를 재현할 수 있는 구조.
> 관련: [10-gaps-and-debt.md](./10-gaps-and-debt.md) P1-11(문서 드리프트), [14-agent-workflow.md](./14-agent-workflow.md)(이 구조를 전제로 한 에이전트 편성)

## 1. 저장소 트리 (to-be)

```
bcl-portal/                          # 신규 저장소 (기존 repo와 병행, cutover 후 대체)
├── CLAUDE.md                        # ★ 프로젝트 메모리 — 에이전트 단일 진입점 (§2 전문)
├── .claude/
│   ├── settings.json                # 팀 공유 권한/훅 (lint·typecheck 허용 등)
│   └── skills/
│       ├── verify/SKILL.md          # 앱 구동 검증 절차 (§3.1)
│       ├── db-migration/SKILL.md    # 마이그레이션 규약 (§3.2)
│       └── deploy/SKILL.md          # 배포 절차 (§3.3)
├── docs/                            # ★ 단일 SSOT — 라우트 1:1 매핑 (§4)
│   ├── README.md                    # 색인 + 문서 갱신 규칙(§6) + 상태 표기 규약
│   ├── architecture/
│   │   ├── data-model.md            # rebuild 07 승계본 (스키마 ERD·RLS·RPC 계약)
│   │   ├── auth.md                  # rebuild 01 승계본 (인증 안정성 계약 포함)
│   │   ├── integrations.md          # rebuild 08 승계본 (결제·알림·외부채널)
│   │   ├── race-system.md           # rebuild 15 승계본 (PM5·3경로·모드 3종·2.5D)
│   │   ├── design-system.md         # rebuild 12 승계본 (--bcl-* 토큰·컴포넌트 스펙)
│   │   └── deployment.md            # rebuild 11 승계본 (인프라·CI/CD·롤백)
│   └── screens/                     # 화면 명세: 파일 경로 = 라우트 경로 (§4)
│       ├── auth/{login,signup,reset-password,email-verify,callback,pending-approval,rejected}.md
│       ├── admin/{dashboard,members,attendance,payments,plans,schedule,coaches,
│       │         wod-studio,race,lockers,badges,feedback,crm,settings}.md   # to-be 14화면
│       ├── apps/{home,schedule,checkin,performance,profile,purchase,feedback,notifications}.md
│       ├── coach/{home,schedule,members,race,profile}.md
│       ├── class/{screen-console,race-view,race-run,race-result,rotation-hud,leaderboard}.md
│       └── kiosk/{idle,scan,success}.md
├── supabase/
│   ├── migrations/                  # YYYYMMDDHHMMSS_topic.sql — rebuild sql/ 00~09 초안에서 생성
│   ├── functions/                   # Edge Functions (send-push-notification, send-external-notification)
│   └── seed.sql                     # 최소 시드(시설 1·역할·벤치마크 정의)
├── src/
│   ├── app/                         # Next.js App Router — 라우팅 셸만 (로직 없음, features 위임)
│   │   ├── auth/ · admin/ · apps/ · coach/ · class/ · kiosk/
│   │   └── layout.tsx · globals.css # globals.css = --bcl-* 토큰 + UA 리셋만
│   ├── features/                    # ★ 도메인 모듈 경계 (§5)
│   │   ├── auth/                    # 세션 팩토리·가드·resolvePostLoginRoute
│   │   ├── members/ · memberships/ · payments/
│   │   ├── sessions/                # 세션·예약·체크인·rotation
│   │   ├── wod/                     # 템플릿·라이브러리·런시트
│   │   ├── race/                    # BLE 클라이언트 계약·3경로 수신·2.5D 렌더러
│   │   ├── notifications/ · performance/  # 벤치마크·배지·followup
│   │   └── settings/                # 지점·시스템·권한(RBAC UI)
│   ├── components/ui/               # 12번 표준 컴포넌트만 (Button/Card/Modal/BottomSheet/…)
│   ├── lib/
│   │   ├── supabase/                # ★ 클라이언트 팩토리 1곳 (browser/server/middleware 공용)
│   │   ├── api.ts                   # query()/rpc() 헬퍼 (직접 supabase-js 호출 금지)
│   │   └── constants.ts             # AUTH_STORAGE_KEY 등 상수 단일 정의
│   └── types/
│       ├── database.ts              # supabase gen types 산출물 (수동 편집 금지)
│       └── domain/                  # envelope·상태머신 enum 등 도메인 타입
├── tests/
│   ├── e2e/                         # Playwright: auth.smoke.spec.ts(CI 필수 게이트) + 앱별 수용 시나리오
│   └── unit/                        # Vitest: RPC envelope·유틸
├── race/                            # Python 브릿지 (FastAPI 8001) — 분리 배포 단위
├── .github/workflows/               # quality.yml(lint/typecheck/build/test) · deploy.yml
├── docker-compose.yml · Dockerfile · deploy.sh
└── package.json · tsconfig.json · playwright.config.ts · vitest.config.ts
```

**비승계 원칙**: 기존 `.docs/{sitemap,blueprint,planning,database-reference}`는 신규 저장소로 옮기지 않는다. 필요한 내용은 전부 `rebuild/` 설계서에 흡수됐고, 그 승계본이 `docs/`가 된다. **완료 이력 문서(blueprint complete류)는 폐지 — git log + PR이 이력이다** (에이전트는 `git log --oneline -- <path>`로 이력 조회).

## 2. CLAUDE.md 전체 초안

````markdown
# BCL Portal

크로스핏/로잉 체육관 운영 플랫폼. 6개 앱(auth/admin/apps=회원/coach/class=TV/kiosk) + Supabase + Python BLE 브릿지.

## 스택
- Next.js(App Router, standalone, CSR 강제) · TypeScript strict · Supabase(Auth/Postgres/RLS/Realtime/Edge Functions)
- 자체 Ubuntu Docker 배포(portal 3000 내부/3001 외부, race-service 8001) · GitHub Actions CI/CD
- 스타일: `--bcl-*` 디자인 토큰 단일 체계(docs/architecture/design-system.md) · Lexend · 4px grid

## 불변 규칙 (위반 = 리뷰 반려)
### 인증 (장애 이력 있음 — 절대 금칙)
- onAuthStateChange 콜백 안에서 `await` 금지 (락 교착 → 로그인 5~10초 지연 실사고)
- Supabase 클라이언트는 `src/lib/supabase/` 팩토리로만 생성. 쿠키명/storageKey 수동 정의 금지
  (`AUTH_STORAGE_KEY`는 `src/lib/constants.ts` 한 곳에만 존재)
- 역할별 리다이렉트는 `resolvePostLoginRoute(profile)` 단일 함수만 사용 (분산 구현 금지)
- 로딩 실패 시 에러 표면화 필수 — 무한 스피너 금지

### 결제 (Fail-to-NOT-charge)
- 클라이언트가 보낸 금액을 절대 신뢰하지 않는다 — 서버에서 `membership_plans.price` 재조회 비교
- orderId UNIQUE + `SELECT ... FOR UPDATE` 필수. 자동결제/재시도/빌링키 저장 금지
- 결제 한도 = min(Admin 설정, env) 이중장치. 환불 = 관리자 2단계 확인 + 서버 계산 + audit_logs

### 데이터
- 비즈니스 테이블 참조는 `member_id`만 사용 — auth `user_id`를 비즈니스 FK로 쓰지 않는다
  (members/coaches.user_id는 nullable — 계정 미연결 회원 존재)
- DB 접근은 `query()`/`rpc()` 헬퍼 경유만. supabase-js 직접 호출 금지
- 테이블 표준명: `checkins`/`bookings`/`membership_plans` (check_ins·reservations·plans 금지)
- 신규 RPC = SECURITY DEFINER + `SET search_path=public` + 내부 `auth.uid()` 검증
  (클라이언트가 coach_id 등 식별자 전달 금지) + envelope `{success, data, error}` 1종
- 신규 테이블은 RLS 필수. DELETE 정책 = admin 전용

### UI — 토큰만 사용
- 색/간격/radius는 `--bcl-*` 토큰만. hex 하드코딩·인라인 스타일 재구현·수동 유틸 클래스 신설 금지
- 표준 컴포넌트(`src/components/ui/`) 밖에서 버튼/모달/입력 재구현 금지
- Class/Race 화면: rAF + DOM 직접 조작(React 리렌더 우회), Display-Safe(부상/메모/정산 비노출)

## 명령어
- `npm run dev` — 로컬 개발 (3000)
- `npm run lint && npm run typecheck` — 커밋 전 필수 (경고 0)
- `npm run test` — Vitest 단위 / `npm run test:e2e` — Playwright (auth.smoke 필수 통과)
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
- 완료 이력 문서 작성 (git log가 이력) · 문서 신설 남발 (변경 시 갱신 문서 1개 이하 — docs/README.md 규칙)
- 레거시 부활 금지: `wods` 테이블, `sessions.wod_description`, fn_get_coach_dashboard류 구 RPC

## 문서 지도
- 화면 명세: `docs/screens/<app>/<route>.md` (라우트와 1:1 — 예: /admin/members → docs/screens/admin/members.md)
- 스키마/RPC: `docs/architecture/data-model.md` · 인증: auth.md · 디자인: design-system.md · Race: race-system.md
````

## 3. `.claude/skills/` 3종 설계

### 3.1 `verify/SKILL.md` — 앱 구동 검증

```markdown
---
name: verify
description: 변경 사항을 실제 앱 구동으로 검증. 화면·플로우·인증 변경 시 커밋 전 필수.
---
1. `npm run lint && npm run typecheck` (실패 시 중단)
2. `npm run dev` 백그라운드 기동 → `curl localhost:3000/api/health` 대기
3. 변경 범위별 시나리오:
   - 인증: `npm run test:e2e -- auth.smoke` (로그인→역할 진입→새로고침→앱 전환→로그아웃)
   - 화면: 해당 라우트를 역할 계정(시드: admin@/coach@/member@bcl.test)으로 열어 스크린샷 확인
   - RPC: `tests/unit/rpc/` 해당 스펙 실행 (envelope {success,data,error} 검증)
4. 다크/라이트 양 테마 확인 (data-theme 토글) — UI 변경 시
5. 결과 요약: 통과 시나리오 / 스크린샷 경로 / 미검증 항목 명시
```

### 3.2 `db-migration/SKILL.md` — 마이그레이션 규약

```markdown
---
name: db-migration
description: Supabase 스키마 변경 절차. 원격-로컬 불일치 사고(4건 백필) 재발 방지 규약.
---
1. 파일명 `YYYYMMDDHHMMSS_topic.sql` — supabase/migrations/에 신규 파일로만 (기존 파일 수정 절대 금지)
2. 필수 포함: IF NOT EXISTS 멱등 / 신규 테이블 RLS 정책 동봉 / 신규 RPC는 SECURITY DEFINER+search_path
3. 로컬 적용: `npx supabase db reset` → 전체 마이그레이션 재생 성공 확인
4. 타입 재생성: `npx supabase gen types typescript --local > src/types/database.ts`
5. 문서 동기화: docs/architecture/data-model.md의 해당 테이블/RPC 절 갱신 (이 1개만)
6. 원격 push는 사용자 승인 후에만. push 후 `supabase migration list`로 원격-로컬 일치 확인
7. 금지: 데이터 파괴 DDL(DROP/TRUNCATE)은 백업 확인 절차 없이 불가
```

### 3.3 `deploy/SKILL.md` — 배포

```markdown
---
name: deploy
description: 운영 배포 절차와 게이트. main 병합 전 체크리스트 포함.
---
1. 사전 게이트: quality.yml 녹색(lint 0/typecheck/build/test) + auth.smoke E2E 통과
2. 릴리즈 게이트: `.next/static` 내 SRK 검색 0건 / 신규 테이블 RLS 확인 / env 변경분 서버 반영 여부
3. 표준 경로: main push → deploy.yml → SSH → deploy.sh (pull/build/up/prune). 포트: portal 3001, race 8001
4. 마이그레이션 동반 배포: DB 먼저(db-migration 스킬) → 앱 배포 순서 고정
5. 확인: `/health` 200, 역할별 로그인 1회, 직전 릴리즈 노트와 대조
6. 롤백: docker compose 이전 이미지 태그로 `up -d` (docs/architecture/deployment.md §롤백)
```

## 4. `docs/screens/` — 라우트 1:1 매핑 규약

- **규칙**: URL 경로 `/{app}/{route}` ↔ 파일 `docs/screens/{app}/{route}.md`. 하위 라우트(상세/탭)는 부모 파일의 섹션으로 흡수(예: `/admin/members/[id]` → `members.md#상세`). 에이전트는 라우트명 grep 한 번으로 명세 도달.
- **파일 템플릿** (각 화면 명세 필수 5절): ① 목적 ② 핵심 기능 ③ 데이터 소스(테이블·RPC — data-model.md 표준명만) ④ 상태·권한 규칙 ⑤ 수용 시나리오(검증 에이전트가 그대로 실행)
- blueprint식 거대 단일문서 금지. 한 파일 300행 초과 시 분할 검토.

## 5. `src/features/` 도메인 모듈 경계

- 각 feature = `components/ hooks/ api.ts(쿼리·RPC 래퍼) types.ts` 표준 4요소. **feature 간 직접 import 금지** — 공유가 필요하면 `src/lib/` 또는 `src/components/ui/`로 승격.
- `src/app/`의 page.tsx는 라우팅 셸(가드+feature 컴포넌트 조립)만. 비즈니스 로직·직접 쿼리 금지.
- 도메인 경계는 07-data-model.md의 스키마 도메인과 1:1(§1 트리 참조) — 스키마 에이전트와 앱 에이전트가 같은 경계로 분업 가능([14-agent-workflow.md](./14-agent-workflow.md)).

## 6. 문서 거버넌스 (간소화)

1. **완료 이력 = git log 대체**: complete/이력 문서 신설 금지. "무엇을 했나"는 커밋·PR, "지금 무엇인가"만 docs/에.
2. **코드 변경 시 갱신 문서 1개 이하**: 화면 변경→해당 screens 파일 1개, 스키마 변경→data-model.md 1개. 두 개 이상 고쳐야 한다면 문서 구조가 잘못된 것 — 구조를 고친다.
3. **상태 표기 규약 승계**: ✅/🟡/🧪/⏳ (docs/README.md에 정의).
4. **드리프트 검사 자동화**: CI에 라우트↔screens 파일 대조 스크립트(존재하지 않는 문서/라우트 상호 검출) — [14-agent-workflow.md](./14-agent-workflow.md) 문서동기화 에이전트가 Phase 종료마다 실행.
