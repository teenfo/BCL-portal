# BCL Portal – 출시 전 정비 통합 기획서

> **Status**: Approved
> **Author**: Codex
> **Created**: 2026-04-19
> **Last Updated**: 2026-04-19
> **Related**:
>   - `.docs/audit/audit-pm-gap-analysis-20260419.md`
>   - `README.md`
>   - `.docs/project-blueprint.md`
>   - `.docs/database-reference.md`
>   - `.docs/testing/README.md`
>   - `.docs/security/README.md`
>   - `.docs/deployment/server-setup-guide.md`

---

## 1. 개요 및 배경

### 1.1 목적

2026-04-19 PM 감사에서 도출된 핵심 갭을 바탕으로, BCL Portal을 현재의 `Conditional Release Readiness` 상태에서 **실행 가능한 출시 기준선**까지 끌어올리기 위한 통합 정비 계획을 수립한다.

이번 기획의 초점은 신규 기능 추가가 아니라 아래 3가지다.

1. **품질 게이트 복구** — lint/test/typecheck/CI를 실제로 동작하게 만든다.
2. **문서-코드 기준선 일치** — README, blueprint, version, database reference의 드리프트를 해소한다.
3. **운영 가능 범위 명확화** — 외부 알림, Race, 보안 통제, TODO 기반 지표의 실제 상태를 코드와 문서에 동일하게 반영한다.

### 1.2 현재 상태 (As-Is)

| # | 항목 | 현재 상태 | 심각도 |
|---|------|-----------|--------|
| 1 | 품질 게이트 | `npm run build`는 성공하나 `npm run lint`는 `76 errors / 21 warnings`, `npm run test`는 스크립트 부재 | 🔴 High |
| 2 | 문서 기준선 | README는 Next.js 14, 실제 코드는 Next.js 16.1.6 / React 19.2.3, blueprint는 `v0.5.0`, 코드 버전은 `0.4.0` | 🔴 High |
| 3 | 운영 범위 | 외부 알림 Edge Function은 Kakao/SMS mock 처리, blueprint의 Priority 14도 운영 의존 대기 | 🔴 High |
| 4 | 보안 통제 | security 문서는 CSP/CSRF/rate limiting을 설명하지만 저장소 구현 근거는 약함 | 🟠 Medium |
| 5 | 운영 지표 완성도 | `support_tickets` 테이블이 존재하나 Admin 위젯 일부는 TODO/0 반환 | 🟠 Medium |
| 6 | Race 수용 기준 | 코드와 마이그레이션은 넓게 구현됐지만 실환경 acceptance 기준과 QA 결과는 문서화 부족 | 🟠 Medium |

### 1.3 핵심 제약 조건

| 항목 | 내용 |
|------|------|
| 플랫폼 | Next.js 16 App Router + CSR + Supabase |
| 인증/데이터 접근 | anon key + RLS 원칙 유지, service role은 서버/로컬 에이전트에서만 사용 |
| 배포 안정성 | 정비 작업 이후에도 기존 83개 라우트의 빌드 안정성 유지 필요 |
| 범위 관리 | 신규 기능 확장보다 현재 기준선 정비를 우선 |
| 문서 원칙 | 문서는 실제 코드 상태보다 앞서가면 안 되며, 계획/구현/운영 상태를 분리 표기 |

---

## 2. 현재 문제 진단 (As-Is)

### 2.1 품질 게이트가 `build` 하나에 과도하게 의존

현재 릴리즈 흐름은 아래와 같은 상태다.

```
개발 완료
  └── npm run build  ✅ 성공
  └── npm run lint   ❌ 76 errors / 21 warnings
  └── npm run test   ❌ Missing script
  └── GitHub Actions ✅ main push 시 SSH 배포
```

**문제점**:
1. `build`가 통과해도 유지보수성, hooks 규칙, 선언 순서 오류, unescaped entities 등이 그대로 배포될 수 있다.
2. 테스트 전략 문서는 있으나 실제 테스트 자산이 없어 회귀 방지 장치가 없다.
3. CI가 품질 검증보다 배포 자동화에 치우쳐 있어 `main` 브랜치가 사실상 release gate 역할을 하지 못한다.

### 2.2 문서 기준선이 실제 코드와 분리

#### 문서-코드 드리프트 현황

| 대상 | 문서 상태 | 실제 상태 |
|------|-----------|-----------|
| Frontend Stack | `README.md`: Next.js 14 | `package.json`: Next.js 16.1.6 |
| App Version | `.docs/project-blueprint.md`: `v0.5.0` | `package.json`, `src/lib/version.ts`: `0.4.0` |
| 테스트 명령 | README: `npm run test`, `npm run db:seed` | `package.json`에 스크립트 없음 |
| 테스트 체계 | `.docs/testing/README.md`: Vitest/Playwright 가정 | 저장소 내 실제 테스트 파일/설정 부재 |

**영향**:
- 신규 투입 인력에게 잘못된 기준선을 제공
- PM/개발/운영 간 상태 인식 불일치
- 감사 문서조차 빠르게 진부해지는 구조

### 2.3 운영 범위와 구현 상태의 불일치

외부 알림은 문서상 "시스템 구축"으로 읽히기 쉽지만 실제 구현은 아래에 가깝다.

```
알림 생성
  └── send-external-notification Edge Function
        ├── Kakao: 실제 API 호출 없음
        ├── SMS: 실제 API 호출 없음
        └── mock success 응답 반환
```

**문제점**:
1. 운영팀이 "알림 시스템 완료"로 오해할 수 있다.
2. Priority 14가 여전히 운영 환경 의존인데, 블루프린트의 완료 항목들과 함께 읽히면 범위가 모호해진다.
3. 배포 문서에는 실제 운영 가능 기능과 mock 기능의 경계가 없다.

### 2.4 보안 문서가 구현 수준을 앞서감

security 문서는 다음 항목을 적극적으로 설명한다.

- CSP
- CSRF 방어
- Rate Limiting
- Middleware 기반 보호

반면 실제 저장소에서 분명하게 확인되는 것은 주로 아래다.

- Supabase 세션 갱신 및 인증 리다이렉트
- 경로 접근 제어
- 일부 Nginx 보안 헤더

**문제점**:
1. "보안 설계"와 "보안 구현"이 문서상 분리되지 않았다.
2. release review에서 실제로 무엇이 적용됐는지 설명하기 어렵다.

### 2.5 화면 존재와 데이터 완성도가 혼용됨

현재 Admin 대시보드 일부 지표는 아래와 같은 상태다.

```typescript
case 'support_pending_count':
    return 0; // TODO: support_tickets 테이블
```

동시에 저장소에는 다음이 존재한다.

- `support_tickets` 테이블
- 관련 RLS 정책
- User Support 화면

즉, 데이터 소스는 있는데 운영 지표 바인딩이 마무리되지 않은 상태다.

### 2.6 Race는 구현 폭과 운영 수용 수준이 분리

Race는 다음 자산이 이미 존재한다.

- `race/*` Python 서버
- `useRaceRealtime`, `useRaceAnimator`
- `/class/race/*`, `/coach/race/*`
- Race 관련 마이그레이션

그러나 PM 관점에서 부족한 것은 아래다.

1. 실환경 acceptance checklist
2. 장비/재접속/레코딩/결과 적재에 대한 운영 수용 기준
3. 코드 완료와 현장 완료를 구분하는 문서

---

## 3. 개선 설계 (To-Be)

### 3.1 핵심 설계 원칙

1. **실행 가능한 기준선 우선** — 문서상 존재하는 프로세스가 아니라 저장소에서 실제 실행 가능한 기준을 만든다.
2. **문서는 코드의 상태를 반영** — 구현되지 않은 항목은 계획/권장으로 명확히 낮춘다.
3. **운영 범위는 명시적으로 제한** — mock, 대기, 현장 검증 필요 항목을 분리한다.
4. **Phase 단위 정비** — P0 → P1 → P2 순서로 release gate부터 닫는다.

### 3.2 목표 릴리즈 흐름 (To-Be)

```
개발 완료
  └── npm run lint       ✅
  └── npm run typecheck  ✅
  └── npm run test       ✅
  └── npm run build      ✅
  └── 문서/버전 기준선 동기화 ✅
  └── CI 통과 후 배포      ✅
```

핵심은 `build만 통과하면 배포`하는 구조를 끝내고, **문서 기준선 + 품질 게이트 + 운영 범위 명시**를 하나의 release baseline으로 묶는 것이다.

### 3.3 품질 게이트 복구 설계

**설계 방향**:
- `package.json`에 `test`, `typecheck`를 실제로 추가
- 현재 lint failure를 유발하는 hooks/선언순서/markup 오류를 해소
- CI 워크플로우를 배포와 분리하여 품질 검증용으로 신설

**의도**:
- 품질 검증을 "문서상 약속"이 아니라 "레포에서 강제되는 기준"으로 승격

### 3.4 Release Baseline 동기화 설계

**대상 기준선**:
- 스택 버전
- 앱 버전
- 명령어
- 현재 Focus/완료/대기 상태
- 데이터베이스 레퍼런스와 마이그레이션 목록

**설계 방향**:
- README, blueprint, database reference, testing docs, version metadata를 한 번에 동기화
- 실제 없는 스크립트는 제거하거나 구현 후 유지
- 상태 문서는 "완료", "운영 의존", "계획"을 구분해서 재서술

### 3.5 운영 범위 정리 설계

운영 범위는 아래 3층으로 정리한다.

```
Layer 1: 코드 구현 완료
Layer 2: 운영 환경 준비 완료
Layer 3: 현장/실사용 수용 완료
```

이 기준을 외부 알림과 Race에 공통 적용한다.

예시:
- 외부 알림: Layer 1 일부 / Layer 2 미완 / Layer 3 미완
- Race 시뮬레이터: Layer 1 완료 가능 / BLE 현장 검증은 Layer 3 별도

### 3.6 보안 문서-구현 정렬 설계

보안 문서는 아래 분류로 재작성한다.

- **적용 완료**: 현재 저장소/설정에서 실제 확인 가능한 통제
- **부분 적용**: 일부 설정은 있으나 완전한 통제라고 보기 어려운 항목
- **향후 계획**: 권장되지만 아직 구현되지 않은 항목

이 방식으로 CSP, CSRF, rate limiting, security headers를 재분류한다.

### 3.7 운영 지표 완성 설계

Admin Dashboard의 TODO/0 반환 지표는 아래 두 갈래 중 하나로 정리한다.

1. `support_tickets` 기반 실제 데이터 연결
2. KPI 정의가 아직 확정되지 않았다면 위젯을 임시 비노출

핵심은 **운영자가 보는 수치가 TODO 상태여서는 안 된다**는 점이다.

### 3.8 Race 수용 기준 설계

Race는 "코드 구현"과 "운영 수용"을 분리해서 정의한다.

#### Acceptance 항목
- BLE 스캔/연결
- 다중 기기 연결
- 실시간 브로드캐스트
- 재접속 복원
- JSONL 레코딩
- 결과 적재
- 종료 후 정리 및 상태 초기화

#### Acceptance 방식
- 시뮬레이터 검증
- 로컬 장비 검증
- 현장 네트워크/다중 기기 검증

---

## 4. 데이터베이스 변경 (필요 시)

### 4.1 마이그레이션 SQL

**이번 기획의 P0 범위에서는 필수 DB 스키마 변경 없음.**

- 품질 게이트 복구: DB 변경 없음
- 문서 기준선 동기화: DB 변경 없음
- 운영 범위 명확화: DB 변경 없음

### 4.2 선택적 DB 변경 가능성

다만 아래 항목은 구현 방식에 따라 선택적으로 발생할 수 있다.

- 지원 지표 최적화를 위한 RPC 함수 추가
- Admin Dashboard 전용 집계 쿼리 보강

**원칙**:
- 스키마 대규모 변경은 이번 정비 스프린트 범위에서 제외
- 가능하면 기존 테이블/컬럼/RLS를 활용하여 해결

---

## 5. 영향 범위 분석

| 파일/모듈 | 변경 내용 | 변경 필요 여부 |
|-----------|-----------|:---:|
| `package.json` | `test`, `typecheck` 스크립트 추가 및 명령 기준선 정리 | ✅ |
| `.github/workflows/deploy.yml` | 배포 전제 재검토 | ✅ |
| `.github/workflows/*` | 품질 게이트용 CI 워크플로우 신설 | ✅ |
| `README.md` | 스택, 명령어, 운영 가이드 기준선 동기화 | ✅ |
| `.docs/project-blueprint.md` | 현재 상태, 버전, 우선순위 상태 재정렬 | ✅ |
| `.docs/database-reference.md` | 마이그레이션/레퍼런스 기준선 정리 | ✅ |
| `.docs/testing/README.md` | 실제 테스트 전략 기준으로 현실화 | ✅ |
| `.docs/security/README.md` | 구현/계획 분리 표기 | ✅ |
| `.docs/deployment/server-setup-guide.md` | 운영 가능한 기능 범위와 release gate 보강 | ✅ |
| `supabase/functions/send-external-notification/index.ts` | mock → 실제 연동 또는 범위 명시 | ✅ |
| `src/hooks/useWidgetData.ts` | TODO 지표 실제 데이터 연결 | ✅ |
| `src/config/widget-registry.ts` | 위젯 노출 조건/지표 정의 보강 가능 | ✅ |
| `src/hooks/useNotifications.ts` 외 lint 실패 파일 | lint error 해소 | ✅ |
| `src/hooks/useRaceRealtime.ts`, `src/hooks/useRaceAnimator.ts` | lint/유지보수성 정비 + acceptance 기준 연계 | ✅ |
| `race/*` | 실환경 acceptance 기준과 연결된 점검 대상 | ⬜ QA 중심 |

---

## 6. 보안 고려사항

- **문서 과장 금지**: 구현되지 않은 CSP/CSRF/rate limiting을 "적용 완료"로 기술하지 않는다.
- **RLS 유지**: 지원 위젯 및 Admin 집계 보강 시 기존 admin 권한 모델을 유지한다.
- **비밀키 경계 유지**: 외부 알림 실제 연동 시 API 키는 Edge Function/서버 환경 변수로만 사용한다.
- **Race 서비스 경계 유지**: service role은 Python 로컬 서버/서버사이드에서만 사용하고 브라우저로 노출하지 않는다.
- **Release gate 우선**: 품질 게이트 복구는 보안 문제를 줄이기 위한 기본 단계다.

---

## 7. 구현 단계 및 에이전트 배분

### Phase 1: 품질 게이트 복구 (P0)
> **담당**: 💻 **Developer (Sonnet/Codex)** | **공수**: 1~2일

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | lint 오류 분류 | hooks/set-state, 선언순서, markup, 이미지 경고 등 카테고리별로 정리 |
| 1-2 | 스크립트 추가 | `package.json`에 `test`, `typecheck` 추가 |
| 1-3 | 테스트 최소 기준선 구축 | 최소 smoke test 또는 핵심 흐름 검증 가능한 러너 구성 |
| 1-4 | lint failure 해소 | 현재 `npm run lint` 실패 파일 순차 정리 |
| 1-5 | CI 신설 | 배포와 분리된 품질 워크플로우 추가 |

### Phase 2: Release Baseline 문서/버전 동기화 (P0)
> **담당**: 🏛️ **Architect (Opus/Codex)** | **공수**: 0.5~1일

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | README 정리 | 실제 스택/명령 기준으로 갱신 |
| 2-2 | blueprint 정리 | Current Focus, version, 대기/완료 상태 정렬 |
| 2-3 | version 통일 | `package.json`, `src/lib/version.ts`, 문서 버전 동기화 |
| 2-4 | database reference 정리 | 마이그레이션/참조 목록을 현재 저장소 기준으로 수정 |
| 2-5 | testing docs 현실화 | 실제 테스트 체계 기준으로 문서 갱신 |

### Phase 3: 운영 범위 명확화 (P0)
> **담당**: 💎 **Senior Dev (Opus/Codex)** | **공수**: 0.5~1일

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | 외부 알림 상태 결정 | 실제 연동 또는 v1 제외 중 하나로 결정 |
| 3-2 | mock 상태 명시 | 코드/문서/배포 가이드에 동일하게 반영 |
| 3-3 | Priority 14 재정렬 | 운영 의존 항목을 blueprint에서 명확히 분리 |
| 3-4 | 배포 가이드 보강 | 실제 운영 가능 기능 목록과 미운영 기능 목록 분리 |

### Phase 4: 보안 문서-구현 정렬 (P1)
> **담당**: 💎 **Senior Dev (Opus/Codex)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | 구현된 통제 식별 | middleware, nginx, auth guard 기준 확인 |
| 4-2 | 보안 문서 재분류 | 적용 완료 / 부분 적용 / 향후 계획으로 분리 |
| 4-3 | 누락된 최소 항목 반영 | 쉽게 보강 가능한 헤더/설정은 실제 적용 검토 |

### Phase 5: 운영 지표 TODO 제거 (P1)
> **담당**: 💻 **Developer (Sonnet/Codex)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 5-1 | 지원 지표 정의 | pending/today/urgent/recent 기준 확정 |
| 5-2 | 실제 쿼리 연결 | `support_tickets` 기반 데이터 바인딩 |
| 5-3 | 비노출 fallback | 정의가 불완전하면 위젯 임시 비노출 처리 |

### Phase 6: Race 운영 수용 기준 수립 (P1)
> **담당**: ⚡ **Specialist (Gemini/Codex)** | **공수**: 1일

| # | 작업 | 상세 |
|---|------|------|
| 6-1 | Acceptance checklist 작성 | BLE, reconnect, recording, results, cleanup 포함 |
| 6-2 | 시뮬레이터/실장비 구분 | 어떤 검증을 어디서 수행하는지 명시 |
| 6-3 | Race 유지보수성 정리 | 관련 lint issue 및 운영 문구 정비 |

### Phase 7: 감사/문서 운영 체계화 (P2)
> **담당**: 🏛️ **Architect (Opus/Codex)** | **공수**: 0.5일

| # | 작업 | 상세 |
|---|------|------|
| 7-1 | audit-planning 참조 규칙 정리 | planning ↔ audit ↔ blueprint 연결 방식 통일 |
| 7-2 | release checklist 정의 | 다음 릴리즈부터 반복 가능한 문서화 프로세스 확립 |
| 7-3 | 갱신 책임 명시 | 어떤 문서를 언제 갱신하는지 기준 수립 |

---

## 8. 완료 판정 기준

이번 기획의 완료는 단순 문서 작성이 아니라 아래 조건이 모두 충족될 때로 본다.

1. `npm run lint` 성공
2. `npm run test` 성공
3. `npm run typecheck` 성공
4. `npm run build` 성공 유지
5. README / blueprint / version / database reference / testing docs가 동일한 기준선을 가리킴
6. 외부 알림 상태가 실제 코드와 동일하게 문서화됨
7. Admin Dashboard에 TODO/0 고정 운영 지표가 남아 있지 않음
8. Race acceptance checklist가 문서화되고 최소 1회 검증됨

---

## 9. 기대 효과

- PM은 출시 판단을 기능 개수 대신 **실행 가능한 기준선**으로 내릴 수 있다.
- 개발팀은 "무엇이 완료이고 무엇이 대기인지"를 문서와 코드에서 동일하게 해석할 수 있다.
- 운영팀은 mock 기능과 실운영 기능을 구분할 수 있다.
- 다음 감사 문서는 현재 코드와 크게 어긋나지 않는 상태에서 시작할 수 있다.
