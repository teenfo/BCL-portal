---
description: 새로운 기능/아키텍처 기획 문서를 작성하는 기획자(Planner) 전용 워크플로우입니다. Architect(Opus)가 현황을 분석하고 체계적인 기획서를 .docs/planning/에 작성합니다.
---

# Feature Planning Workflow (/plan)

이 워크플로우는 사용자의 요청을 받아 **기획 문서를 작성**하는 기획자(Planner) 전용 워크플로우입니다.
현황 분석 → 설계 → 관점 배분 → 기획 문서 저장 → (선택) 블루프린트 등록까지의 전체 기획 프로세스를 수행합니다.

> 📖 **상세 스킬 가이드**: `.agent/skills/feature-planning/SKILL.md`

---

## 🤖 전담 관점

> **이 워크플로우의 모든 단계는 🏛️ Architect 관점에서 수행한다.**
> 기획은 아키텍처적 판단이 필요하므로, 다른 관점으로 위임하지 않는다.
> **권장 모델**: Gemini 3 Pro (High) — 1M 컨텍스트로 전체 코드/문서 분석 가능

| 단계 | 관점 | 핵심 역할 |
|:-----|:-----|:---------| 
| 1. 요구사항 수집 | 🏛️ **Architect** | 사용자 요청 파악, 범위 확정 |
| 2. 현황 분석 | 🏛️ **Architect** | 코드/DB/문서 분석, 중복 확인 |
| 3. 설계 | 🏛️ **Architect** | As-Is → To-Be 설계, 아키텍처 결정 |
| 4. 기획 문서 작성 | 🏛️ **Architect** | 표준 템플릿 기반 문서 작성 |
| 5. 품질 검증 | 🏛️ **Architect** | 체크리스트 기반 자체 검증 |
| 6. (선택) 블루프린트 등록 | 🏛️ **Architect** | `/plan-to-blueprint` 실행 |

---

## 전체 파이프라인

```
사용자 요청
     │
     ▼
┌────────────────────────────────────────────────────────┐
│  📝 /plan (이 워크플로우)                                │
│  요구사항 → 분석 → 설계 → 기획서 작성 → .docs/planning/  │
└──────────────────┬─────────────────────────────────────┘
                   │ 기획 완료
                   ▼
┌────────────────────────────────────────────────────────┐
│  📋 /plan-to-blueprint (후속 워크플로우)                  │
│  .docs/planning/ → 블루프린트 등록                       │
└──────────────────┬─────────────────────────────────────┘
                   │ 등록 완료
                   ▼
┌────────────────────────────────────────────────────────┐
│  🚀 /develop (개발 실행 워크플로우)                       │
│  블루프린트 Priority → Phase별 개발                      │
└────────────────────────────────────────────────────────┘
```

---

## 단계별 절차

### 0️⃣ 실행 모드 판별 (신규 vs 이어쓰기)
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

`/plan` 호출 시 가장 먼저 `.docs/planning/` 폴더를 스캔한다.

// turbo
```bash
ls .docs/planning/
```

| 조건 | 액션 |
|------|------|
| 사용자가 특정 파일 지정 | 🔄 **이어쓰기 모드** — 해당 파일 로드 |
| Draft/In Progress 파일 존재 | 사용자에게 목록 제시 → 선택 또는 신규 |
| 파일 없음 / 모두 Approved | 🆕 **신규 모드** — Step 1부터 진행 |

#### 🔄 이어쓰기 모드
1. 기존 문서의 **Status**와 **Planning Log** 읽기
2. 미완성 섹션 목록을 사용자에게 보고
3. 미완성 섹션부터 작업 이어가기
4. 사용자가 새 요구사항 추가 시 기존 내용에 통합

---

### 1️⃣ 요구사항 수집 및 범위 확정
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

사용자의 요청을 정확히 이해하고 기획의 범위를 확정한다.

1. 사용자 요청의 **핵심 목적(What/Why)**을 파악한다
2. 모호한 부분이 있으면 **반드시 사용자에게 질문**한다 (추측 금지)
3. 범위가 너무 넓으면 **분할을 제안**한다

> ⚠️ **사용자가 충분한 정보를 제공한 경우, 확인 질문 없이 바로 분석으로 진행 가능**

---

### 2️⃣ 현황 분석 (As-Is)
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

기획 대상과 관련된 프로젝트의 현재 상태를 철저히 분석한다.

// turbo
1. **기존 기획 중복 확인**:
   ```bash
   ls .docs/planning/
   ls .docs/archive/planning/
   ```
   > 동일/유사 기획이 이미 존재하면 사용자에게 보고하고 중단한다.

// turbo
2. **관련 코드 분석**:
   ```bash
   # 관련 파일 검색 (키워드 기반)
   grep -rl "{관련키워드}" src/app/ --include="*.tsx"
   ```

// turbo
3. **DB 스키마 분석**:
   ```bash
   # database-reference.md에서 관련 테이블 확인
   cat .docs/database-reference.md
   ```

// turbo
4. **Sitemap 및 블루프린트 확인**:
   ```bash
   cat .docs/sitemap/README.md
   cat .docs/project-blueprint.md
   ```

**분석 결과 요약**:
```
📊 현황 분석 결과:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  관련 코드:      {N}개 파일 확인
  관련 DB 테이블:  {테이블 목록}
  기존 기획 중복:  {없음 / 있음 (파일명)}
  블루프린트 관련: {있음 / 없음}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 3️⃣ 설계 (To-Be)
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

분석 결과를 바탕으로 개선 방안을 설계한다.

**설계 원칙 (프로젝트 규칙 준수)**:
- CSR 기반 아키텍처 (SSR 금지)
- RLS 필수 (모든 새 테이블)
- Client SDK는 anon key만 사용
- 기존 패턴 활용 (프로젝트 관례 따르기)
- 최소 변경 원칙

**설계 포함 사항**:
- 데이터 흐름 다이어그램 (ASCII)
- DB 변경 사항 (실행 가능한 SQL)
- UI 변경 사항 (화면 레이아웃 ASCII)
- 영향 범위 분석

---

### 4️⃣ 기획 문서 작성
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

`.agent/skills/feature-planning/SKILL.md`의 **문서 템플릿**을 사용하여 기획서를 작성한다.

**저장 위치**:
```
.docs/planning/{feature-name}.md
```

**파일명**: `kebab-case` (예: `payment-system.md`, `race-realtime.md`)

**필수 섹션** (11개 + Planning Log):
1~11. 상세는 `.agent/skills/feature-planning/SKILL.md` 템플릿 참조
12. **Planning Log** — 세션별 진행 기록 (이어쓰기 시 필수)

> 한 세션에 전체를 완성하지 못해도 된다.
> 작성된 섹션까지만 저장하고 Status를 `Draft` 또는 `In Progress`로 설정한다.

---

### 5️⃣ 품질 검증 (전체 완성 시만)
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

모든 섹션이 작성된 경우에만 품질 검증을 수행한다.
품질 검증 통과 시 Status를 `Approved`로 변경한다.

> 세션 중단 시에는 품질 검증을 생략하고 **Step 6️⃣ 세션 종료 처리**로 직행한다.

상세 체크리스트는 `.agent/skills/feature-planning/SKILL.md` 의 Step 6️⃣ 참조.

---

### 6️⃣ 결과 보고
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

#### 기획 완료 시 (Status: Approved)
블루프린트 등록 옵션 제안:
1. `/plan-to-blueprint` 실행 → 블루프린트 등록
2. 사용자 리뷰 후 등록
3. 추가 기획 작성

#### 세션 중단 시 (Status: Draft / In Progress)
1. 문서 내 `## 12. Planning Log`에 세션 기록 추가
2. Status를 `Draft` 또는 `In Progress`로 설정
3. `Last Updated` 날짜 갱신
4. `commit-bot` 스킬로 문서 커밋
5. "이어서 작업하려면 `/plan` 실행" 안내

---

## ✅ 완료 체크리스트

### 🏛️ Architect 관점 (권장: Gemini 3 Pro High) — 전담
- [ ] 실행 모드 판별 (신규/이어쓰기)
- [ ] 요구사항 파악 완료
- [ ] 기존 기획 중복 확인 완료
- [ ] 기획 문서 `.docs/planning/{파일명}.md` 작성/수정 완료
- [ ] 코드 변경 없음 확인 (문서만)
- [ ] **(A) 완료 시**: 품질 검증 통과 + Status: Approved
- [ ] **(B) 중단 시**: Planning Log 기록 + Status: Draft/In Progress
- [ ] 결과 보고 완료

---

## 🔗 관련 워크플로우 & 문서
- `/plan-to-blueprint` — 기획 완료 후 블루프린트 등록 (다음 단계)
- `/develop` — 블루프린트 등록 후 개발 실행
- `/design-screen` — UI Phase에서 Stitch 디자인 생성
- `.agent/skills/feature-planning/SKILL.md` — 이 워크플로우의 상세 스킬 가이드
- `.agent/skills/commit-bot/SKILL.md` — 기획 문서 커밋
