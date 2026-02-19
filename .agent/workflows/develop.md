---
description: 블루프린트의 Priority 항목을 선택하여 배정된 전체 Phase를 일괄 개발하는 표준 실행 워크플로우입니다.
---

# Development Execution Workflow

이 워크플로우는 `.docs/project-blueprint.md`에 등록된 **Priority 항목**을 선택하여, **해당 Priority에 배정된 모든 Phase를 일괄 개발**하고, 완료 후 문서 동기화 + 버전 갱신 + 커밋하는 **E2E 개발 실행 절차**입니다.

> 🚨 **핵심 규칙**: `/develop`는 **Priority 단위**로 실행합니다.
> - 선택된 Priority의 **모든 Phase를 한 세션에서 연속 개발**합니다.
> - Phase를 일부만 선택하여 실행하지 않습니다.

> 📌 **선행 워크플로우**:
> - `/plan-to-blueprint` — 기획 문서가 블루프린트에 등록되어 있어야 합니다.
> - `/design-screen` — UI가 필요한 Phase는 Stitch 디자인이 먼저 완료되어야 합니다.

---

## 🤖 멀티에이전트 배분 (단계별)

| 단계 | 담당 에이전트 | 모델 | 핵심 역할 |
|:-----|:------------|:-----|:---------|
| 1. 작업 선택 & 분석 | **Architect** | Opus 4.6 (Thinking) | Priority 항목 확인, 의존성 분석 |
| 2. 개발 환경 확인 | **Developer** | Sonnet 4.6 | 빌드 상태, 브랜치, 종속성 확인 |
| 3. 전체 Phase 일괄 실행 | **Phase별 담당** | Phase별 상이 | 모든 Phase 연속 코드 구현 |
| 4. 검증 | **Developer** | Sonnet 4.6 | 빌드 테스트, 기본 기능 회귀 |
| 5. 문서 동기화 + 버전 갱신 | **Developer** | Sonnet 4.6 | sitemap, blueprint, version.ts 갱신 |
| 6. 최종 검토 & 커밋 | **Architect** | Opus 4.6 (Thinking) | 아키텍처 일관성 확인, 커밋 승인 |

---

## 단계별 절차

### 1️⃣ 작업 선택 & 분석
**담당**: 🏛️ **Architect (Opus 4.6 Thinking)**

블루프린트에서 개발할 Priority 항목을 확인합니다.

**Architect가 수행할 것**:

// turbo
1. `.docs/project-blueprint.md`의 `Next Steps` 섹션을 읽는다.

2. 개발 대상 Priority 항목을 확인한다:
   - 사용자가 특정 Priority를 지정한 경우 → 해당 항목 선택
   - 지정하지 않은 경우 → 가장 높은 우선순위(🔴 → 🟠 → 🟡 → 📄) + 가장 낮은 번호 선택

3. 선택된 Priority의 **기획서를 읽는다** (archive 경로):
   ```
   .docs/archive/planning/{파일명}.md
   ```

4. **의존성 분석**:
   - 이 작업이 다른 미완료 Priority에 의존하는지 확인
   - 기존 구현 코드에 영향을 미치는 범위 분석

5. **작업 범위 확정**:
   - 선택된 Priority의 **모든 Phase를 일괄 실행**
   - 각 Phase의 담당 에이전트 확인 (블루프린트에 이미 명시됨)

**출력**:
```
📋 개발 대상:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Priority: {N} - {기능명}
  기획서: .docs/archive/planning/{파일명}.md
  상태: 개발 대기 → 개발 진행 중
  실행 범위: 전체 Phase 일괄 개발
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Phase 목록 (전체 실행):
    - Phase 1: {작업명} → {담당 에이전트}
    - Phase 2: {작업명} → {담당 에이전트}
    - Phase N: {작업명} → {담당 에이전트}
  의존성: {있음/없음}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> ⚠️ **블루프린트 상태 갱신**: `(개발 대기)` → `(개발 진행 중)`으로 변경

---

### 2️⃣ 개발 환경 확인
**담당**: 💻 **Developer (Sonnet 4.6)**

개발을 시작하기 전 환경 상태를 확인합니다.

**Developer가 수행할 것**:

// turbo
1. **빌드 상태 확인**:
   ```bash
   npm run build
   ```
   - ❌ 빌드 실패 시 → 먼저 빌드 에러 해결 (개발 진행 중단)
   - ✅ 빌드 성공 시 → 다음 단계 진행

// turbo
2. **현재 브랜치 및 Git 상태 확인**:
   ```bash
   git status
   git branch --show-current
   ```

3. **종속성 확인**: 새로운 패키지가 필요한 경우 사전 설치 계획 수립

**확인**:
- [ ] `npm run build` 정상 (0 에러)
- [ ] Git 작업 디렉토리 깨끗함 (또는 의도된 변경만 있음)
- [ ] 필요한 종속성 파악 완료

---

### 3️⃣ 전체 Phase 일괄 개발 실행
**담당**: **블루프린트에 명시된 Phase별 에이전트**

> 🚨 **Priority의 모든 Phase를 순서대로 연속 개발합니다.**
> Phase를 나누어 별도 세션으로 분리하지 않습니다.

각 Phase를 순서대로 실행합니다. Phase별 담당 에이전트는 블루프린트에 이미 정의되어 있습니다.

#### 에이전트별 실행 가이드

##### 💎 Senior Dev (Opus) — DB/비즈니스 로직 Phase
```
1. 기획서의 DB 스키마 설계 확인
2. `db-migration` 스킬 사용하여 마이그레이션 생성
3. RLS 정책 구현
4. DB 함수 생성 (필요시)
5. database-reference.md 갱신
```

##### 🎨 UI Developer (Gemini) — UI/UX Phase
```
1. Stitch 디자인 확인 (design-screen 워크플로우 미완료 시 먼저 실행)
2. 구현 전 동일 영역 기존 페이지 코드 전체 로드 (컨텍스트)
3. ui-gen 스킬의 Glassmorphism 가이드 준수
4. 글로벌 CSS 클래스 사용 (admin-filter-btn, admin-search-input 등)
5. CSS 변수 사용 (하드코딩 금지)
6. 자체 검증 체크리스트 확인
```

##### 💻 Developer (Sonnet) — API/로직 Phase
```
1. Next.js API Routes 또는 클라이언트 로직 구현
2. Supabase 쿼리 최적화
3. Zod 입력 검증
4. 에러 핸들링 표준화
5. TypeScript strict 준수
```

##### ⚡ Specialist (Gemini) — 실시간/성능 Phase
```
1. Supabase Realtime 구독 구현
2. React 성능 최적화 (memo, callback)
3. 카메라/QR 기능 (필요시)
4. 60fps 애니메이션 보장
```

#### Phase 완료 기준
각 Phase 완료 시:
- [ ] 해당 Phase의 모든 세부 작업(`- [ ]`) 완료
- [ ] 블루프린트의 해당 Phase 체크박스 `[x]` 처리
- [ ] 다음 Phase로 즉시 진행

> 💡 **빌드 확인은 전체 Phase 완료 후 1회** 실행합니다 (Step 4).
> 단, 빌드 에러가 우려되는 대규모 변경 시 중간 확인 가능.

---

### 4️⃣ 검증 & 감사
**담당**: 💻 **Developer (Sonnet 4.6)** & 🏛️ **Architect (Opus 4.6)**

**모든 Phase 완료 후** 품질을 검증합니다.

**수행 절차**:

// turbo
1. **기술 검증**:
   ```bash
   npm run build
   ```
   - [ ] 빌드 에러 및 경고 없음 확인
   - [ ] TypeScript `any` 타입 사용 여부 재검토

2. **표준 준수 감사 (필수 수행)**:
   - `/audit` 워크플로우를 실행하여 종합 감사 보고서를 생성합니다.
   - [ ] 기획서 및 Sitemap과 구현 일치 여부 확인
   - [ ] UI 표준(Glassmorphism, Admin Global Classes) 준수 확인
   - [ ] 보안(RLS, DB 정책) 검증

3. **기능 회귀 테스트**:
   - [ ] 로그인/로그아웃 및 권한별 접근 제어 정상
   - [ ] 기존 핵심 기능(예약, 체크인 등) 영향도 확인

4. **검증 결과 조치**:
   - 발견된 사소한 이슈 → 즉시 수정
   - 구조적 이슈 또는 대규모 결함 → 감사 보고서에 기록 후 `Known Issues` 등록

---

### 5️⃣ 문서 동기화 + 버전 갱신
**담당**: 💻 **Developer (Sonnet 4.6)**

개발 완료 후 코드와 문서의 일관성을 맞추고, 버전을 갱신합니다.

**Developer가 수행할 것**:

1. **Blueprint 갱신** (`.docs/project-blueprint.md`):
   - 완료된 Phase 체크박스 전부 `[x]` 처리
   - Priority 상태: `(개발 진행 중)` → `✅ (완료)`로 분류
   - Active Context 섹션의 Current Focus 업데이트

2. **Sitemap 갱신** (`.docs/sitemap/**/*.md`):
   - 변경된 라우트, 기능, 데이터 필드 반영
   - Screen ID 매핑 확인

3. **Complete 파일 기록** (`.docs/archive/complete/project-complete-YYYYMMDD.md`):
   - 오늘 날짜 파일에 완료 세션 내역 추가

4. **버전 갱신** (필수):
   - `src/lib/version.ts`의 `APP_VERSION` 값 갱신
     - `/develop` Priority 완료 → **MINOR +1** (예: 0.1.0 → 0.2.0)
     - 핫픽스/버그 수정만 → **PATCH +1** (예: 0.1.0 → 0.1.1)
   - `src/lib/version.ts`의 `BUILD_DATE` 값을 오늘 날짜로 갱신
   - `package.json`의 `version` 필드도 동일하게 갱신

**확인**:
- [ ] Blueprint의 모든 Phase 체크박스 `[x]` 갱신 완료
- [ ] Sitemap 동기화 완료
- [ ] Complete 파일 기록 완료
- [ ] 버전 갱신 완료 (version.ts + package.json)
- [ ] 코드와 문서 간 불일치 없음

---

### 6️⃣ 최종 검토 & 커밋
**담당**: 🏛️ **Architect (Opus 4.6 Thinking)** → `commit-bot` 스킬

**Architect가 수행할 것**:

1. **아키텍처 일관성 확인**:
   - 새로운 코드가 기존 아키텍처와 충돌하지 않는지 확인
   - CSR 원칙 준수 확인
   - RLS 정책 적절성 확인

2. **문서 완전성 확인**:
   - Blueprint 상태가 정확한지 확인
   - Next Steps에 남은 작업이 명확히 기록되었는지 확인
   - 담당 에이전트 배분이 적절한지 확인

3. **버전 확인**:
   - `src/lib/version.ts`의 버전이 올바르게 갱신되었는지 확인
   - `package.json`의 버전과 일치하는지 확인

4. **최종 빌드 확인**:
   ```bash
   npm run build
   ```

5. **커밋 승인 및 실행**:
   - `commit-bot` 스킬을 사용하여 커밋
   - 커밋 메시지에 버전 번호 포함 (예: `feat(v0.2.0): Priority 13 배지 시스템 고도화`)
   - GitHub Action 확인 후 에러 시 수정

---

## 🔄 세션 중단 시 처리

개발 도중 세션을 종료해야 하는 경우:

1. **현재 진행 상황을 Blueprint에 기록**:
   - 완료된 Phase/세부 작업 `[x]` 처리
   - 미완료 작업은 `[ ]` 유지
   - `(개발 진행 중)` 상태 유지

2. **`/update-context` 워크플로우 실행**:
   - Current Focus 업데이트
   - Next Steps에 이어서 해야 할 작업 명시
   - 다음 작업자를 위한 핸드오프 메모

3. **중간 커밋** (빌드 정상인 경우에만):
   - 커밋 메시지에 `WIP:` 접두사 사용
   - 이 경우 버전은 갱신하지 않음 (완료 시에만 갱신)

---

## 📋 전체 워크플로우 다이어그램

```
┌──────────────────────────────────────────────────────────┐
│  /plan-to-blueprint (사전 완료)                           │
│  기획 문서 → 블루프린트 Priority 등록                      │
└──────────────┬───────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────┐
│  /develop (이 워크플로우)                                  │
│                                                          │
│  1️⃣ Architect: 작업 선택 & 분석                           │
│     ↓                                                    │
│  2️⃣ Developer: 개발 환경 확인                             │
│     ↓                                                    │
│  3️⃣ Phase별 에이전트: 전체 Phase 일괄 개발                  │
│     ↓ (모든 Phase 연속 실행)                               │
│  4️⃣ Developer: 검증 & 감사                               │
│     ↓                                                    │
│  5️⃣ Developer: 문서 동기화 + 버전 갱신                     │
│     ↓                                                    │
│  6️⃣ Architect: 최종 검토 & 커밋                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ 전체 체크리스트

### 🏛️ Architect (Opus) — 시작 & 종료
- [ ] 개발 대상 Priority 확인
- [ ] 의존성 분석 완료
- [ ] 블루프린트 상태 → `(개발 진행 중)` 갱신
- [ ] 최종 아키텍처 일관성 확인
- [ ] 버전 확인 (version.ts + package.json 일치)
- [ ] 문서 완전성 확인
- [ ] 커밋 승인 완료

### 💎 Senior Dev (Opus) — DB/로직 Phase (해당 시)
- [ ] DB 마이그레이션 적용 완료
- [ ] RLS 정책 구현 완료
- [ ] DB 함수 생성 완료 (필요시)
- [ ] database-reference.md 갱신 완료

### 🎨 UI Developer (Gemini) — UI Phase (해당 시)
- [ ] Stitch 디자인 참조 완료
- [ ] 글로벌 CSS 클래스 사용 확인
- [ ] CSS 변수 사용 확인 (하드코딩 없음)
- [ ] 자체 검증 체크리스트 통과

### 💻 Developer (Sonnet) — API/검증
- [ ] 빌드 정상 확인 (`npm run build`)
- [ ] 기본 기능 회귀 테스트 통과
- [ ] 코드 품질 검증 통과
- [ ] Sitemap 동기화 완료
- [ ] Blueprint 모든 Phase 체크박스 `[x]` 갱신 완료
- [ ] Complete 파일 기록 완료
- [ ] 버전 갱신 완료 (version.ts + package.json)

### ⚡ Specialist (Gemini) — 실시간/성능 Phase (해당 시)
- [ ] 실시간 기능 구현 완료
- [ ] 성능 목표 달성 (60fps, Lighthouse > 90)

---

## 🔗 관련 워크플로우 & 문서
- `/audit` — 개발 품질 감사 및 보고서 생성
- `/plan-to-blueprint` — 기획 → 블루프린트 등록 (선행)
- `/design-screen` — Stitch 디자인 생성 (UI Phase 선행)
- `/add-page` — 새 화면 추가 상세 절차
- `/sync-docs` — 코드-문서 정합성 동기화
- `/update-context` — 세션 종료 시 컨텍스트 기록
- `src/lib/version.ts` — 버전 관리 SSOT
- `.agent/skills/commit-bot/SKILL.md` — 커밋 자동화
- `.agent/skills/db-migration/SKILL.md` — DB 마이그레이션
- `.agent/skills/ui-gen/SKILL.md` — Glassmorphism UI 생성
