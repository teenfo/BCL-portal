# 00. BCL Portal 재구축 설계서 — 개요 · 색인

> **이 문서 세트가 재구축의 단일 입력(SSOT)이다.** 구현 에이전트는 기존 소스가 아니라 이 세트만 보고 다시 만든다.
> 명칭·구조의 최종 심판은 [`_source/contract.md`](./_source/contract.md), 스키마·RPC의 최종 심판은 [`07-data-model.md`](./07-data-model.md)+[`sql/`](./sql/)이다.

## 1. 제품 개요

BCL Portal은 크로스핏/피트니스 박스의 통합 운영 시스템 — 하나의 코드베이스에서 6개 앱을 서빙한다.

| 앱 | Prefix | 대상·성격 | 밀도 |
|---|---|---|---|
| **Auth** | `/auth/*` | 로그인·가입·승인 게이트 (라우트 7종) | — |
| **Admin** | `/admin/*` | 관리자 데스크탑 운영도구 (**14화면**, 다크) | `admin` |
| **User** | `/apps/*` | 회원 모바일 앱 (하단탭 5) | `mobile` |
| **Coach** | `/coach/*` | 코치 필드 운영 OS (하단탭 5) | `mobile` |
| **Class** | `/class/*` | TV 대형스크린 (screen-console/race/rotation-hud/leaderboard) | `tv` |
| **Kiosk** | `/kiosk/*` | 입구 무인 체크인 (idle/scan/success) | `tv` |

- **스택**: Next.js CSR + React + Supabase(Auth/RLS/Realtime/Edge Functions) + Vanilla CSS(`--bcl-*` 토큰) + 자체 Ubuntu Docker 서버 + Python Race 브릿지(FastAPI/BLE)
- **역할 3종**: `profiles.role`(admin/coach/member) + `approval_status` — 인증 게이트의 유일한 소스. 세부 권한은 `admin_user_roles`(라우팅 사용 금지)
- **최우선 비기능 요구**: 인증 안정성(01 §5 — 장애 이력 3건의 구조적 차단, E2E 게이트 협상 불가)

## 2. 문서 색인 · 읽는 순서

**계약 먼저** → 도메인 문서 → 실행 문서 순으로 읽는다.

| # | 문서 | 내용 | 성격 |
|---|---|---|---|
| — | [`_source/contract.md`](./_source/contract.md) | **표준 계약**: 테이블/RPC/메뉴 IA/토큰/인증/도메인 정책 — 전 문서·전 에이전트 준수(4차 보정) | 계약 |
| 01 | [01-auth.md](./01-auth.md) | 인증·가입 승인·웨이버 서명 워크플로우 + 안정성 설계(금칙 패턴·E2E 게이트) | 도메인 |
| 02 | [02-admin.md](./02-admin.md) | Admin 14화면 (23→14 통폐합 대조표 포함) | 도메인 |
| 03 | [03-user-app.md](./03-user-app.md) | 회원 앱 — 퍼포먼스 허브(기록/랭킹/배지 + 오늘의 WOD) | 도메인 |
| 04 | [04-coach-app.md](./04-coach-app.md) | 코치 OS — 상태머신·세션보드·WOD/런시트·후속조치 | 도메인 |
| 05 | [05-class-portal.md](./05-class-portal.md) | TV 포털 — screen-console 통합, anon 화이트리스트, Display-Safe | 도메인 |
| 06 | [06-kiosk.md](./06-kiosk.md) | 키오스크 — QR 프로토콜 SSOT, plan_kind 인식 체크인, 게스트 흐름 | 도메인 |
| 07 | [07-data-model.md](./07-data-model.md) | **Supabase 설계도 본문** — 56테이블 ERD·RLS 매트릭스·RPC 계약서·as-is 대조표 | 데이터 |
| — | [`sql/00~09`](./sql/) | 실행 가능 DDL 10파일(멱등·순서 적용) — **PG16 실검증 통과** | 데이터 |
| 08 | [08-integrations.md](./08-integrations.md) | 결제(Toss·환불 10% 상한·현금영수증)·알림 채널·외부 연동 | 도메인 |
| 09 | [09-nonfunctional.md](./09-nonfunctional.md) | 보안·성능·릴리즈 게이트·테스트 전략 | 실행 |
| 10 | [10-gaps-and-debt.md](./10-gaps-and-debt.md) | 부채·미구현 로드맵 (P1/P2/P3 — 벤치마킹 P2 16건 병합) | 실행 |
| 11 | [11-deployment-cutover.md](./11-deployment-cutover.md) | 재구축 로드맵·인프라·데이터 이관(M1~M9)·컷오버·1분 롤백 | 실행 |
| 12 | [12-design-system.md](./12-design-system.md) | 클로드 단일 디자인 시스템 — `--bcl-*` 토큰 실값·컴포넌트 스펙·밀도 3프로파일 | 실행 |
| 13 | [13-repo-structure.md](./13-repo-structure.md) | Claude Code 최적화 저장소 구조 — CLAUDE.md 전문·skills·화면=라우트 1:1 문서 | 실행 |
| 14 | [14-agent-workflow.md](./14-agent-workflow.md) | 멀티 에이전트 개발 체계 — 편성 9종·파이프라인·정합 게이트 | 실행 |
| 15 | [15-race-system.md](./15-race-system.md) | **Race 전용 설계** — PM5 BLE·3경로·모드 3종·2.5D 카트레이싱·기기 테마(R-11)·페이스보트·에셋 매니페스트 | 도메인 |
| 16 | [16-benchmark-gap-analysis.md](./16-benchmark-gap-analysis.md) | 벤치마킹 최종 검수 — 유사 솔루션 4카테고리 대비 갭 판정(P1 반영 완료) | 검수 |
| — | [`_source/`](./_source/) | as-is 원자료(화면/백엔드/비기능 인벤토리) + 벤치마킹 리서치 원문 4건 | 근거 |

## 3. 표기 규약 (전 문서 공통)

✅ 운영 중 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현(신규 설계) · 🔄 to-be에서 변경/통합
— ⏳/🔄 항목은 근거를 병기한다(예: "(G-4, 16 문서)").

## 4. 통합 IA (to-be 요약 — 상세는 계약 §5)

```
Auth(7):  login · signup(+웨이버 서명) · reset-password · callback · pending-approval · rejected · logout
Admin(14): dashboard · members · attendance · payments · plans · schedule · coaches
           · wod-studio · race · lockers · badges · feedback · crm · settings
User(5탭): home · schedule · checkin · performance(기록+랭킹+배지+오늘의WOD) · profile
Coach(5탭): home · schedule(중앙) · members · race · profile
Class:     screen-console(wod|live|timer|screen) · race(view|run|result) · rotation-hud · leaderboard
Kiosk(3):  idle · scan · success
```

## 5. 불변 원칙 인덱스 (위반 = 교차검수 반려)

| 영역 | 원칙 | 정의처 |
|---|---|---|
| 인증 | AUTH_STORAGE_KEY 1곳 · onAuthStateChange 내 await 금지 · resolvePostLoginRoute 단일 함수 · E2E 게이트 | 01 §5·§7, 계약 §7 |
| 권한 | RPC는 auth.uid() 내부 검증(클라이언트 식별자 전달 금지) + envelope `{success,data,error}` | 계약 §3, 07 §7 |
| 데이터 | 비즈니스 테이블은 member_id만 · 표준 명칭(checkins/bookings/membership_plans) | 계약 §2, 07 §1 |
| 결제 | 클라이언트 금액 불신 · Fail-to-NOT-charge · 환불 서버 계산(`fn_calculate_refund`, 10% 캡) | 08 §1, 계약 §6b |
| 예약 | 정책은 `facilities.booking_policy` 단일 소스, 집행은 RPC 내부 | 계약 §6b |
| Race | R-1~R-11 (역할 3분할·3경로·러버밴딩 없음·기기 테마·페이스보트 렌더 전용 등) | 15 §0.2 |
| 디자인 | `--bcl-*` 1세트 · UA 리셋 필수 · 표준 컴포넌트 외 인라인 재구현 금지 | 12, 계약 §6 |
| 화면 | Display-Safe(부상/메모/정산 비노출) — Class/Kiosk 공개 표면 | 05 §6, 계약 §3 |

## 6. 교차검수 결과 (2026-07-07 — 설계 마감 기준)

| 검수 | 방법 | 결과 |
|---|---|---|
| 라우트 커버리지 | `find src/app -name page.tsx` 81경로 전수 ↔ 문서 등장 | **81/81 통과** |
| RPC 커버리지(as-is) | migrations grep 51종 ↔ 07 §10 대조표 | **전수 등재** (폐지 7종은 폐지 목록에 명시) |
| RPC 정합(to-be) | contract §4 ↔ sql/09 함수 53개 | **일치** — 검수 중 `fn_calculate_refund` 누락 1건 발견·구현·검증 완료 |
| 표준 명칭 | 구명(check_ins/reservations)·구 토큰(--app-*) grep | **위반 0** (대조표·폐지 컨텍스트만 존재) |
| DDL 실검증 | 스크래치 PG16 — 10파일 순서 적용 ×2(멱등) + 스모크(화이트보드 계층 정렬·drop_in 체크인·예약 정책·환불 계산 3케이스) | **전부 통과** |
