# 14. 멀티 에이전트 개발 체계 (Agent Workflow)

> 재구축 구현은 멀티 에이전트 오케스트레이션으로 진행한다. 이 문서는 **누가(에이전트 편성) · 무엇을 입력받아(입력 계약) · 어떤 파이프라인으로(오케스트레이션) · 무엇이 되면 끝인지(완료 기준·병합 게이트) · 세션이 끊기면 어떻게 잇는지(인수인계)**를 규정한다.
> 전제: [13-repo-structure.md](./13-repo-structure.md)의 신규 저장소 구조 + [11-deployment-cutover.md](./11-deployment-cutover.md)의 5단계 로드맵.

## 1. 공통 원칙

1. **설계서 세트 = 단일 입력 계약**: 모든 에이전트의 유일한 요구사항 소스는 이 `rebuild/` 문서 세트다. 명칭·구조 충돌 시 [`_source/contract.md`](./_source/contract.md)가 최종 우선한다. 에이전트가 설계서에 없는 결정을 내려야 하면 **구현하지 말고 오케스트레이터에 질문으로 반환**한다.
2. **worktree 격리**: 병렬 구현 에이전트는 각자 git worktree(전용 브랜치)에서 작업 — 파일 충돌 원천 차단. 공유 지점(`src/lib/`, `src/components/ui/`, `src/types/database.ts`)은 **선행 Phase 산출물로 동결**되어 있으며 구현 에이전트는 수정 금지(수정 필요 시 질문 반환).
3. **완료 기준 공통분모**: ① 07-data-model 표준 명칭(테이블/RPC/envelope)만 사용 ② 12-design-system `--bcl-*` 토큰만 사용 ③ 담당 화면의 수용 시나리오 E2E 통과 ④ lint 0 / typecheck 통과.
4. **적대적 리뷰 분리**: 구현 에이전트는 자기 코드를 스스로 승인할 수 없다. 리뷰·검증 에이전트는 항상 별도 컨텍스트(신규 세션)로 기동한다.

## 2. 에이전트 편성표

| 에이전트 | 역할 | 입력 계약 (필수 읽기) | 산출물 | 완료 기준 |
|---|---|---|---|---|
| **ORCH** 오케스트레이터 | Phase 계획 수립, 에이전트 기동/중재, 질문 응답, 병합 게이트 판정 | 전체 rebuild 세트 + 본 문서 | Phase 보고서, 병합 결정 | 게이트 체크리스트 전항 통과 판정 |
| **SCHEMA** 스키마 | `sql/00~09` → supabase/migrations 생성·적용·검증, 타입 생성, 시드 | contract.md + [07-data-model.md](./07-data-model.md) + [`sql/*`](./sql/) | migrations/, database.ts, seed.sql | `db reset` 전체 재생 성공, RLS 매트릭스 대조, RPC 30종 시그니처=계약 일치 |
| **APP-ADMIN** | Admin 14화면 (worktree: `feat/admin`) | contract.md + [02-admin.md](./02-admin.md) + 07·12 | features/{members,memberships,payments,settings…} + admin 라우트 | 수용 시나리오 + 공통분모(§1-3) |
| **APP-USER** | User 앱 하단탭 5 + performance 허브 (worktree: `feat/user`) | contract.md + [03-user-app.md](./03-user-app.md) + 07·12 | features/{sessions 예약측,performance…} + apps 라우트 | 〃 |
| **APP-COACH** | Coach 운영 OS (worktree: `feat/coach`) | contract.md + [04-coach-app.md](./04-coach-app.md) + 07·12 | features/{wod,sessions 운영측…} + coach 라우트 | 〃 + 코치 4대 원칙(서버권한/사실·판정 분리) 준수 |
| **APP-CLASS/KIOSK** | TV 포털 + Kiosk + Race 화면 (worktree: `feat/class`) | contract.md + [05](./05-class-portal.md)·[06](./06-kiosk.md)·[15-race-system.md](./15-race-system.md) + 07·12 | features/race + class/kiosk 라우트 | 〃 + 60fps rAF·Display-Safe·QR 프로토콜, Race L1(시뮬레이터) 통과 |
| **REVIEW** 리뷰 | 구현 diff 정밀 리뷰 + **적대적 검증**(경계·권한 우회·불변식 위반 탐색) | 해당 앱 설계 문서 + diff + CLAUDE.md 불변규칙 + [10-gaps-and-debt.md](./10-gaps-and-debt.md) P1 목록 | 리뷰 보고서(차단/권고 구분) | 차단 항목 0 도달까지 반복 |
| **QA** 검증 | 수용 시나리오를 실제 구동으로 실행(Playwright + /verify 스킬), 스크린샷 증빙 | docs/screens/*.md §수용 시나리오 + 01-auth E2E 스펙 | E2E 스펙 코드 + 실행 결과 보고 | 시나리오 100% 실행(통과/실패 명시), auth.smoke 녹색 |
| **DOCSYNC** 문서동기화 | Phase 종료 시 라우트↔`docs/screens/` 1:1 대조·갱신, 드리프트 스크립트 실행 | 13번 §4 규약 + 병합된 diff | docs/ 갱신 커밋 (1문서 원칙) | 대조 스크립트 불일치 0 |

## 3. Phase별 편성 (11번 로드맵 정합)

| Phase ([11-deployment-cutover.md](./11-deployment-cutover.md)) | 투입 에이전트 | 병렬성 | Phase 완료 기준 |
|---|---|---|---|
| **0. 설계 승인** | ORCH | — | rebuild 세트 사용자 승인, 신규 저장소·Supabase 프로젝트 생성 |
| **1. Supabase 스키마 + Auth** | SCHEMA → APP 공통기반 1개(auth/lib/ui 토큰) → REVIEW/QA | 직렬 (전 앱의 토대) | 마이그레이션 재생·RLS·RPC 30종 검증 + **auth.smoke E2E 녹색**(이후 전 Phase CI 필수 게이트) + `src/lib`·`ui`·토큰 동결 |
| **2. Admin 코어** (회원/멤버십/세션) | APP-ADMIN + REVIEW + QA | worktree 1 | Admin 코어 화면 수용 시나리오 통과(회원 등록→멤버십→세션 개설→예약 확인 흐름) |
| **3. User/Coach 앱** | APP-USER ∥ APP-COACH + REVIEW×2 + QA | worktree 2 병렬 | 예약→체크인→출결→기록 크로스앱 시나리오, 구 P22/P23/P25 이관 시나리오([10번](./10-gaps-and-debt.md) P2-05) 통과 |
| **4. Class/Kiosk/Race** | APP-CLASS/KIOSK + REVIEW + QA(+시뮬레이터) | worktree 1(+race/ 브릿지) | Kiosk QR 자동인식(P2-01), Race **L1 시뮬레이터 게이트** 통과 — L2~L4 실장비는 현장 검증 트랙으로 병행 |
| **5. 알림·결제 실가동** | APP-ADMIN(잔여) + SCHEMA(cron 확인) + QA | 직렬 | pg_cron 실등록 확인, Push 실수신, Toss live 전환 리허설(불변식 체크리스트), 이관·cutover 리허설([11번](./11-deployment-cutover.md) §3~4) |

Phase 종료마다: DOCSYNC 실행 → ORCH가 Phase 보고서 작성 → 다음 Phase 킥오프.

## 4. 오케스트레이션 파이프라인 (작업 단위 공통)

```
[ORCH] 작업 배정 (설계 문서 절 + worktree 지정)
  → [구현 에이전트] 구현 + 자체 lint/typecheck/단위테스트 + /verify 스킬 자가 구동
  → [REVIEW] 적대적 리뷰 ── 차단 발견 ──→ 구현 에이전트에 반려 (수정 루프, 동일 세션 유지)
  → [QA] 수용 시나리오 E2E 실행 ── 실패 ──→ 반려 루프
  → [ORCH] 병합 게이트 판정 (§5) → main 병합 → [DOCSYNC] (Phase 말)
```

- **적대적 리뷰 관점 고정**: RLS 우회 가능 경로 / 클라이언트 식별자·금액 신뢰 / 인증 금칙 패턴 / 토큰·표준명 위반 / 레거시 부활(wods 등) / envelope 이탈 — CLAUDE.md 불변규칙과 [10번 P1 표](./10-gaps-and-debt.md)를 체크리스트로 사용.
- 반려 2회 초과 반복 시 ORCH가 개입해 설계서 결함인지 판단(결함이면 문서 수정 먼저 — 코드로 우회 금지).

## 5. 병합 전 교차검수 절차 (병합 게이트)

병렬 산출물(특히 Phase 3)은 병합 전 ORCH가 다음을 **기계 대조**한다.

1. **명칭 일치**: diff 내 테이블/RPC 명칭을 grep 추출 → 07-data-model 등재 목록과 대조 (미등재 명칭 = 차단). 금지어 grep: `check_ins|reservations[^_]|\bplans\b|\bwods\b|fn_get_coach_dashboard`
2. **토큰 준수**: hex 하드코딩·`--app-*` 구 토큰·미정의 토큰 grep = 0건
3. **경계 침범**: 다른 worktree 담당 feature/ 또는 동결 영역(`src/lib`, `ui`, `database.ts`) 수정 여부 — 있으면 차단·조정
4. **CI 전체 녹색**: lint 0 / typecheck / build / unit / **auth.smoke E2E** (인증 회귀 = 무조건 배포 차단)
5. **수용 시나리오 증빙**: QA 보고서에 시나리오별 통과 기록 + 스크린샷 존재
6. **문서 1:1**: 신규/변경 라우트에 대응하는 `docs/screens/` 파일 존재 (DOCSYNC 선행 확인)

체크리스트 전항 통과 시에만 main 병합. 부분 통과 병합("나중에 고침") 금지.

## 6. 세션 간 인수인계 규약

에이전트 세션은 언제든 끊길 수 있다 — **재개 가능 상태를 상시 유지**한다.

1. **작은 커밋 단위**: 화면/기능 1단위마다 worktree 브랜치에 커밋(WIP 커밋 허용, 병합 시 squash). 커밋 메시지에 참조 설계 절 명기(예: `feat(admin): members 상세 — 02-admin §3.2`).
2. **인수인계 노트**: 세션 종료(또는 컨텍스트 한계) 시 worktree 루트 `HANDOFF.md` 1파일에 기록 — ① 완료 항목(설계 절 번호) ② 진행 중 항목과 다음 단계 ③ 미해결 질문(ORCH 회신 대기) ④ 검증 상태(lint/test 마지막 결과). 병합 시 삭제.
3. **재개 절차**: 새 세션은 `CLAUDE.md → 담당 설계 문서 → HANDOFF.md → git log -20` 순으로 읽고 재개. 이력 질문은 git log로 해소(별도 이력 문서 없음 — [13번 §6](./13-repo-structure.md)).
4. **ORCH 인수인계**: ORCH 교체 시 최신 Phase 보고서 + 게이트 체크리스트 상태 + 미결 질문 큐가 인계 자산. Phase 보고서는 `docs/README.md`에 링크하지 않고 PR 설명으로 남긴다(문서 최소화 원칙).

## 7. 완료 기준 요약 (전 에이전트 공통 Definition of Done)

- [ ] [07-data-model.md](./07-data-model.md) 표준 스키마·RPC 계약 준수 (교차검수 §5-1)
- [ ] [12-design-system.md](./12-design-system.md) `--bcl-*` 토큰·표준 컴포넌트만 사용 (§5-2)
- [ ] CLAUDE.md 불변규칙(인증 금칙/결제 불변식/member_id 규칙) 위반 0 (REVIEW 확인)
- [ ] 담당 화면 수용 시나리오 E2E 통과 + auth.smoke 녹색 (QA 확인)
- [ ] `docs/screens/` 1:1 문서 동기화 (DOCSYNC 확인)
- [ ] [10-gaps-and-debt.md](./10-gaps-and-debt.md)의 담당 Phase P1/P2 항목 해소 확인 (ORCH 게이트)
