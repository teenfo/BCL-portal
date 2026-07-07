# BCL Portal PM Gap Analysis Audit

**Date**: 2026-04-19  
**Audience**: Project Manager, Tech Lead, Release Owner  
**Status**: `Conditional Release Readiness`  
**Purpose**: 기능 구현 여부보다 출시 준비도, 문서-코드 정합성, 운영 리스크, 우선순위 관점에서 현재 프로젝트 상태를 재평가한다.

## Baseline

- 기준 문서: `README.md`, `.docs/project-blueprint.md`, `.docs/sitemap/README.md`, `.docs/database-reference.md`, `.docs/testing/README.md`, `.docs/security/README.md`, `.docs/deployment/server-setup-guide.md`, `.docs/archive/planning/race-system.md`
- 구현 검증 범위: `src/app/*`, `src/hooks/*`, `supabase/functions/*`, `supabase/migrations/*`, `.github/workflows/*`, `package.json`
- 기존 `.docs/audit/audit-full-project-20260419.md`는 참고만 했고, 본 문서는 최신 코드 기준으로 별도 재작성했다. 기존 감사 일부는 현재 코드와 이미 불일치한다.

## 1. Executive Summary

BCL Portal은 기능 표면적이 큰 제품이다. `npm run build`는 성공했고 App Router 기준 83개 정적 페이지가 생성되므로, 화면과 기능 범위 자체는 충분히 넓다. Admin, User App, Coach, Class, Kiosk, Race까지 제품 포트폴리오는 이미 형성되어 있다.

다만 현재 상태를 그대로 "출시 준비 완료"로 보기는 어렵다. 가장 큰 이유는 품질 게이트와 운영 기준선이 비어 있거나 흔들려 있기 때문이다. `npm run lint`는 76 errors / 21 warnings로 실패했고, `npm run test`는 스크립트 자체가 없다. 테스트 전략 문서는 있으나 실제 테스트 러너, 테스트 파일, CI 품질 게이트는 저장소에 없다.

문서 정합성 문제도 PM 관점에서 무시하기 어렵다. README는 Next.js 14를 기준으로 설명하지만 실제 `package.json`은 Next.js 16.1.6을 사용한다. `.docs/project-blueprint.md`는 `v0.5.0`과 Priority 17 완료를 말하지만 `package.json`과 `src/lib/version.ts`는 `0.4.0`에 머물러 있다. 운영 측면에서도 외부 알림 채널은 아직 mock 구현이며, 블루프린트 역시 Priority 14를 운영 환경 의존 대기 상태로 남겨 두고 있다.

### 강점

- 제품 범위는 이미 충분하다. Admin, User App, Coach, Class, Kiosk, Race 관련 라우트가 모두 존재하고 `npm run build`가 통과한다.
- 핵심 문서 자산은 잘 쌓여 있다. sitemap, blueprint, database, security, testing, deployment 문서가 분리되어 있어 기준선 자체는 존재한다.
- Race를 포함한 확장 기능이 코드베이스에 실제 반영되어 있다. `race/*`, `useRaceRealtime`, `/class/race/*`, `/coach/race/*`, Race 관련 마이그레이션이 확인된다.

### 핵심 리스크

- 품질 게이트 부재: `npm run lint` 실패, `npm run test` 미정의, 테스트 파일 부재.
- 문서 드리프트: 버전, 스택, 명령어, 완료 상태 문서가 코드와 어긋난다.
- 운영 미완: 외부 알림 채널이 mock 상태이고 Priority 14도 대기 상태다.
- 보안 통제 불명확: security 문서에 적힌 CSP, CSRF, rate limiting의 저장소 구현 근거가 약하다.
- 일부 기능은 화면만 있고 데이터 완성도가 낮다. 예를 들어 지원 위젯은 `support_tickets` 테이블 존재에도 TODO 반환을 사용한다.

## 2. Module Readiness Matrix

| Module | 상태 | PM 판단 | 근거 |
| --- | --- | --- | --- |
| Admin | 조건부 완료 | 화면 커버리지는 넓지만 린트 실패와 일부 TODO 데이터 바인딩이 남아 있어 운영 투입 전 정비 필요 | `src/app/admin/*`, `npm run build`, `npm run lint`, `src/hooks/useWidgetData.ts` |
| User App | 조건부 완료 | 주요 사용자 흐름은 존재하나 자동화 테스트와 품질 게이트 부재로 회귀 리스크가 큼 | `src/app/apps/*`, `.docs/testing/README.md`, `package.json` |
| Coach | 조건부 완료 | 기능 표면은 형성됐고 Race 관리 UI도 있으나 운영 검증과 테스트 증거가 부족 | `src/app/coach/*`, `src/app/coach/race/page.tsx` |
| Class | 조건부 완료 | TV/대형 화면 기능은 존재하지만 Race 훅과 애니메이션 관련 린트 이슈가 유지보수 리스크로 남음 | `src/app/class/*`, `src/hooks/useRaceRealtime.ts`, `src/hooks/useRaceAnimator.ts` |
| Kiosk | 완료에 가까운 조건부 완료 | 경로와 UI는 존재하나 별도 수용 테스트 및 현장 검증 근거는 저장소에서 확인되지 않음 | `src/app/kiosk/*`, `npm run build` |
| Race | 운영 의존 | 코드와 마이그레이션은 넓게 들어왔지만 하드웨어/BLE/실환경 QA 완료 증거는 부족하고 린트 이슈도 남아 있음 | `race/*`, `supabase/migrations/20260221084721_race_system_enhancement.sql`, `.docs/project-blueprint.md` |
| Infra / Docs | 문서 드리프트 | 문서는 많지만 스택, 버전, 스크립트, 완료 상태가 실제 저장소와 어긋나 release baseline으로 쓰기 어려움 | `README.md`, `.docs/project-blueprint.md`, `.docs/database-reference.md`, `.github/workflows/deploy.yml`, `package.json`, `src/lib/version.ts` |

## 3. Gap Analysis

### 3.1 QA / 테스트

- 테스트 전략 문서는 존재하지만 실제 테스트 실행 체계는 없다.
  - 근거: `.docs/testing/README.md`는 Vitest, Playwright, `npm run db:seed:test`를 가정한다.
  - 근거: `package.json`에는 `test`, `typecheck`, `db:seed`, `db:seed:test` 스크립트가 없다.
  - 근거: 저장소에서 `tests/`, `*.test.*`, `*.spec.*`, Playwright/Vitest 설정 파일이 확인되지 않았다.
- 현재 품질 기준은 사실상 `build` 하나에 의존하고 있다.
  - 근거: `npm run build`는 성공했다.
  - 근거: `npm run lint`는 76 errors / 21 warnings로 실패했다.
  - 의미: "배포 가능"과 "유지보수 가능"이 분리되어 있으며, 회귀 방지 장치가 없다.

### 3.2 문서 정합성

- README의 기술 스택 설명이 실제 코드와 다르다.
  - 근거: `README.md`는 Frontend를 Next.js 14로 표기한다.
  - 근거: `package.json`은 `next: 16.1.6`, `react: 19.2.3`를 사용한다.
- 버전 기준선이 흔들려 있다.
  - 근거: `.docs/project-blueprint.md`는 Current Focus와 Last Action을 `v0.5.0`으로 설명한다.
  - 근거: `package.json`과 `src/lib/version.ts`는 `0.4.0`이다.
- README의 운영 명령이 실제 스크립트와 일치하지 않는다.
  - 근거: `README.md`는 `npm run test`, `npm run db:seed`를 안내한다.
  - 근거: `package.json`에는 해당 스크립트가 없다.
- 데이터베이스 레퍼런스도 최신 운영 기준선으로 보기 어렵다.
  - 근거: `.docs/database-reference.md`는 존재하지 않는 마이그레이션 파일명과 실행 가이드를 일부 포함한다.
  - 의미: 신규 투입 인력과 운영자가 문서만 믿고 움직이면 혼선이 발생한다.

### 3.3 운영 / 배포

- CI는 품질 검증보다 배포 자동화에 치우쳐 있다.
  - 근거: `.github/workflows/deploy.yml`만 확인되며, main push 시 SSH 배포를 수행한다.
  - 근거: lint/test/typecheck를 강제하는 워크플로우는 저장소에서 확인되지 않았다.
- 외부 채널 알림은 아직 운영 상태가 아니다.
  - 근거: `supabase/functions/send-external-notification/index.ts`는 Kakao/SMS를 실제 API 호출 대신 mock success로 처리한다.
  - 근거: `.docs/project-blueprint.md`의 Priority 14는 "개발 대기 — 운영 환경 의존"으로 남아 있다.
- 배포 문서는 비교적 상세하지만 release gate와 smoke test 기준은 약하다.
  - 근거: `.docs/deployment/server-setup-guide.md`는 서버 세팅과 배포 절차를 설명한다.
  - 근거: 하지만 배포 전 검증 체크는 build/liveness 수준에 가깝고, 품질 게이트는 문서화돼 있지 않다.

### 3.4 보안 통제

- 보안 문서의 설계 수준과 실제 구현 수준이 분리되어 있다.
  - 근거: `.docs/security/README.md`는 CSP, CSRF, rate limiting, middleware 레벨 보호를 설명한다.
  - 근거: 저장소 검색 기준 `rate limit`, `csp`, `csrf`, `nonce`는 문서 외 구현 흔적이 거의 확인되지 않았다.
  - 근거: `src/proxy.ts`와 `src/lib/supabase/middleware.ts`는 세션 갱신과 접근 제어에 집중되어 있다.
- PM 관점 판단: 현재 보안 상태를 "설계 완료"로 표현할 수는 있으나 "통제 구현 완료"로 표현하기는 어렵다.

### 3.5 기능 완성도

- 일부 기능은 화면 존재와 데이터 완성도를 혼동하고 있다.
  - 근거: `src/hooks/useWidgetData.ts`의 `support_pending_count`는 `return 0; // TODO: support_tickets 테이블`이다.
  - 근거: 같은 저장소에 `support_tickets` 테이블은 `.docs/database/schema/001_initial_schema.sql`과 RLS 정책에 존재한다.
  - 의미: 데이터는 있는데 대시보드는 아직 연결되지 않았다.
- Race는 기능 폭은 넓지만 "실운영 수용 완료"로 단정하기 어렵다.
  - 근거: `race/*`, `/class/race/*`, `/coach/race/*`, Race 마이그레이션이 존재한다.
  - 근거: 반면 하드웨어 실환경 acceptance 결과나 자동 검증 체계는 저장소에서 확인되지 않았다.
- 기존 감사 문서도 최신 기준선으로 재사용하기 어렵다.
  - 근거: `.docs/audit/audit-full-project-20260419.md`는 Admin 코치 평점 mock 문제를 major로 지적하지만 현재 `src/app/admin/operations/coaches/page.tsx`는 `fn_get_coach_performance_stats` RPC 기반으로 읽는다.
  - 의미: 감사 산출물도 버전 관리 대상이다.

### 3.6 유지보수성

- 린트 실패는 단순 스타일 문제가 아니라 구조적 유지보수 경고다.
  - 근거: `react-hooks/set-state-in-effect`, `cannot access variable before it is declared`, `react/no-unescaped-entities`가 다수 발생한다.
  - 근거: 에러가 Admin, hooks, Race 관련 코드에 넓게 분포한다.
- 제품 범위가 넓어질수록 기준선 없는 확장은 리스크를 증폭시킨다.
  - 의미: 지금 필요한 것은 기능 추가보다 기준선 정비다.

## 4. Priority Backlog

| Priority | 항목 | 문제 | 영향 | 권장 조치 | 선행 조건 |
| --- | --- | --- | --- | --- | --- |
| P0 | 품질 게이트 복구 | `npm run lint` 실패, `npm run test` 부재 | 회귀 검출 불가, 배포 신뢰도 저하 | lint zero-error 기준 복구, `test`와 `typecheck` 스크립트 추가, PR/merge 전 강제 | 현재 lint 에러 분류와 담당 범위 확정 |
| P0 | 문서 기준선 재동기화 | README, blueprint, version, scripts 설명 불일치 | PM/개발/운영 커뮤니케이션 혼선 | `README.md`, `.docs/project-blueprint.md`, `.docs/database-reference.md`, `src/lib/version.ts`, `package.json` 기준선 통합 | release owner가 공식 버전과 범위를 확정 |
| P0 | 운영 범위 명확화 | 외부 알림이 mock인데 문서상 시스템 완료처럼 읽힘 | 운영 기대치 과대 형성, 장애 책임 불명확 | 알림 외부 채널을 실제 연동하거나, v1 범위에서 명시적으로 제외 | Priority 14 범위와 일정 재합의 |
| P1 | 보안 문서-구현 정렬 | CSP/CSRF/rate limiting 설계와 구현 근거 불일치 | 보안 상태 과신 위험 | 실제 통제를 구현하거나 문서를 "설계 목표" 수준으로 낮춰 표현 | 플랫폼/보안 담당자 리뷰 |
| P1 | 대시보드 TODO 데이터 연결 | 지원 위젯 등 일부 모듈이 TODO/0 반환 사용 | 운영 지표 신뢰도 하락 | `support_tickets` 기반 위젯 연결 또는 UI 비노출 처리 | 데이터 소유자와 KPI 정의 확정 |
| P1 | Race 운영 수용 기준 수립 | 코드 구현과 실환경 검증이 분리 | 하드웨어 이슈 시 현장 장애 가능성 | 장비 연결, BLE 안정성, 재접속, 결과 저장까지 acceptance checklist 작성 | 테스트 장비/환경 확보 |
| P2 | 감사/문서 갱신 체계화 | 과거 감사와 현재 코드가 빠르게 어긋남 | 보고서 재사용성 저하 | 릴리즈마다 PM 감사, 기술 감사, 문서 동기화 체크리스트를 묶어 운영 | 릴리즈 cadence 정의 |

## 5. PM Recommendation

다음 마일스톤은 신규 기능 스프린트가 아니라 **출시 전 정비 스프린트**로 정의하는 것이 맞다. 현재 제품은 "더 만들 것"보다 "현재 상태를 믿을 수 있게 만드는 것"이 더 중요하다.

출시 전 반드시 닫아야 할 게이트는 아래와 같다.

- `npm run lint`가 green 이어야 한다.
- `npm run test`와 가능하면 `npm run typecheck`가 실제로 존재하고 CI에 연결되어야 한다.
- README, blueprint, database reference, 버전 정보가 동일한 release baseline을 가리켜야 한다.
- 외부 알림 채널은 실제 운영 연동을 끝내거나, v1 범위에서 명시적으로 제외해야 한다.
- 보안 문서의 주장 중 구현되지 않은 항목은 구현하거나 문서에서 "계획/권장"으로 낮춰야 한다.
- TODO 기반의 운영 지표는 연결하거나 숨겨야 한다.

PM 실행 관점에서는 기능 개발 티켓보다 먼저 다음 세 묶음을 병렬로 관리하는 것이 적절하다.

- Release baseline 정리: 버전, 문서, 스크립트, 완료 상태 동기화
- Quality gate 정리: lint, test, typecheck, CI
- Operational scope 정리: 알림, Race, 보안 통제의 실제 운영 가능 범위 확정

## 6. Evidence

| 검증 항목 | 실행/확인 내용 | 결과 | 관련 경로 |
| --- | --- | --- | --- |
| 빌드 상태 | `npm run build` | 성공, App Router 기준 83개 정적 페이지 생성, TypeScript 4.9.5 경고 확인 | `package.json` |
| 린트 상태 | `npm run lint` | 실패, 76 errors / 21 warnings | `src/app/admin/*`, `src/hooks/*` |
| 테스트 스크립트 | `npm run test` | `Missing script: "test"` | `package.json` |
| 테스트 자산 존재 여부 | `rg --files | rg '(^tests/|\\.test\\.|\\.spec\\.)'` | 실질 테스트 파일 미확인 | 저장소 전체 |
| CI 구성 | `.github/workflows/*` 확인 | `deploy.yml`만 확인, 품질 게이트 워크플로우 부재 | `.github/workflows/deploy.yml` |
| 외부 알림 운영 상태 | Edge Function 코드 확인 | Kakao/SMS 모두 mock success 처리 | `supabase/functions/send-external-notification/index.ts` |
| 버전 드리프트 | README, blueprint, version 확인 | README는 Next.js 14, blueprint는 `v0.5.0`, 실제 코드는 `0.4.0` | `README.md`, `.docs/project-blueprint.md`, `src/lib/version.ts`, `package.json` |
| 보안 통제 구현 흔적 | `rg -n "(rate.?limit|csp|csrf|nonce)"` | 문서 외 구현 근거 희박 | `.docs/security/README.md`, `src/proxy.ts`, `src/lib/supabase/middleware.ts` |
| 기능 완성도 잔여 TODO | `rg -n "TODO|Mock success for now"` 확인 | 지원 위젯 TODO, 외부 알림 mock 확인 | `src/hooks/useWidgetData.ts`, `supabase/functions/send-external-notification/index.ts` |

## Conclusion

2026-04-19 기준 BCL Portal은 "기능은 넓게 구현되었지만, 출시 준비 기준선은 아직 정리되지 않은 상태"로 판단한다. 따라서 현재 프로젝트의 핵심 과제는 기능 확장이 아니라 **기준선 정비와 운영 신뢰성 확보**다.

PM 관점 최종 판정은 아래와 같다.

- 기능 범위: 충분함
- 문서 체계: 풍부하지만 드리프트 큼
- 품질 게이트: 미흡
- 운영 준비도: 부분 완료
- 출시 판단: `Conditional Release Readiness`
