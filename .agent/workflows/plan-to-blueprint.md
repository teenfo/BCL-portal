---
description: 새로운 기능/아키텍처 기획 문서를 작성하고 블루프린트에 관점별 작업 항목으로 등록하는 워크플로우입니다.
---

# Plan to Blueprint Workflow

이 워크플로우는 `.docs/planning/`과 **`.docs/audit/`** 폴더를 **모두 스캔**하고, 블루프린트에 아직 등록되지 않은 항목을 **자동으로 등록**한 뒤, 등록 완료된 문서를 **아카이브로 이동**하는 절차입니다.

> 📖 **상세 스킬 가이드**: `.agent/skills/plan-to-blueprint/SKILL.md`

---

## 🤖 전담 관점

> **이 워크플로우의 모든 단계는 🏛️ Architect 관점에서 수행한다.**
> 다른 관점으로 위임하지 않는다.
> **권장 모델**: Gemini 3 Pro (High) — 1M 컨텍스트로 전체 기획/블루프린트 분석 가능

| 단계 | 관점 | 핵심 역할 |
|:-----|:-----|:---------|
| 1. Planning 폴더 스캔 | 🏛️ **Architect** | 기획 문서 전체 목록 수집 |
| 2. 블루프린트 비교 | 🏛️ **Architect** | 미등록 기획 식별 |
| 3. 블루프린트 등록 | 🏛️ **Architect** | Priority 항목 + Known Issues 추가 |
| 4. 정합성 검증 | 🏛️ **Architect** | planning ↔ blueprint 1:1 대응 확인 |
| 5. 아카이브 이동 | 🏛️ **Architect** | 등록 완료 문서를 archive/planning으로 이동 |

---

## 단계별 절차

### 1️⃣ Planning 폴더 전체 스캔
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

// turbo
`.docs/planning/`과 `.docs/audit/` 폴더의 **모든 `.md` 파일**을 읽는다.

```bash
find .docs/planning/ .docs/audit/ -name "*.md" -type f 2>/dev/null
```

#### A. 기획 문서 (`.docs/planning/`)
각 기획 문서에서 다음 정보를 추출한다:

| 추출 항목 | 위치 |
|---|---|
| **기능명** | 문서 제목 (`# BCL Portal – {기능명}`) |
| **Status** | YAML 헤더 (`Status: Approved / Draft / In Progress / Done`) |
| **관점 배분** | `## 8. 구현 단계 및 관점 배분` 또는 `## 9. 블루프린트 등록용 체크리스트` 섹션 |
| **Priority 레벨** | 문제 심각도 기반 판단 (🔴 Critical / 🟠 High / 🟡 Medium / 📄 Low) |

#### B. 감사 보고서 (`.docs/audit/`)
각 감사 보고서에서 다음 정보를 추출한다:

| 추출 항목 | 위치 |
|---|---|
| **Status** | 헤더 (`Status: PASSED / CONDITIONAL / FAILED`) |
| **🟡 등록 필요 항목** | `## 3. 발견 사항` → `### 🟡 등록 필요` 섹션 |
| **Priority 레벨** | Status 기반 (FAILED → 🔴, CONDITIONAL → 🟠, PASSED → 등록 불필요) |

> **기획 문서 + 감사 보고서가 모두 0건이면** "동기화할 문서 없음"을 보고하고 종료한다.

---

### 2️⃣ 블루프린트와 비교
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

// turbo
`.docs/project-blueprint.md`를 읽어 현재 등록된 Priority 항목 목록을 확인한다.

각 기획 문서에 대해 다음을 판단한다:

| 상태 | 판단 기준 | 액션 |
|---|---|---|
| **미등록** | 블루프린트에 해당 기획서 링크가 없음 | → **등록 대상** |
| **등록됨 + 진행 중** | 블루프린트에 `(개발 대기)` 또는 체크박스 있음 | → **스킵** (변경 불필요) |
| **등록됨 + 완료** | 모든 체크박스가 `[x]` | → **스킵** |
| **등록됨 + 내용 불일치** | 기획서의 Phase가 블루프린트와 다름 | → **갱신 대상** |

**미등록 목록**과 **갱신 대상 목록**을 정리한다.

---

### 3️⃣ 블루프린트에 일괄 등록
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

`.docs/project-blueprint.md`를 수정하여 미등록 기획을 모두 등록한다.

#### 등록 형식 (필수 준수)

```markdown
#### {이모지} Priority {N}: {기능명} (개발 대기)
  > **기획서**: `.docs/archive/planning/{파일명}.md`
  > **문제**: {한 줄 문제 요약}
  > **방안**: {한 줄 해결 방안 요약}

  - [ ] Phase 1: {작업명} → 💎 **Senior Dev (권장: Opus)**
    - [ ] {세부 작업 1}
    - [ ] {세부 작업 2}
  - [ ] Phase 2: {작업명} → 🎨 **UI Developer (권장: Pro Low)**
    - [ ] {세부 작업 1}
  - [ ] Phase 3: {작업명} → 💻 **Developer (권장: Sonnet 4.6)**
    - [ ] {세부 작업 1}
  - [ ] Phase N: 문서 동기화 → 🏛️ **Architect (권장: Pro High)**
    - [ ] sitemap 갱신
    - [ ] blueprint 반영
```

> ⚠️ **기획서 링크는 반드시 아카이브 경로**를 사용한다: `.docs/archive/planning/{파일명}.md`
> (Step 5에서 파일이 이동되므로, 등록 시점부터 아카이브 경로로 작성)

#### Priority 번호 결정
- 블루프린트의 기존 마지막 Priority 번호 + 1부터 순차 부여

#### Priority 레벨 이모지 기준
| 레벨 | 이모지 | 기준 |
|---|---|---|
| Critical | 🔴 | 현재 기능 동작 불가 또는 보안 취약점 |
| High | 🟠 | 핵심 사용자 경험 영향 |
| Medium | 🟡 | 품질 개선, UX 향상 |
| Low | 📄 | 문서화, 리팩토링 |

#### Known Issues 등록 (해당 시)
현재 동작하지 않는 기능이 있으면 `Known Issues` 섹션에도 추가:
```markdown
- 🔴 **{이슈명}** (ACTIVE): {설명} → [기획서](.docs/archive/planning/{파일명}.md)
```

#### 감사 보고서 이슈 등록
감사 보고서의 🟡 항목은 **정식 Priority**로 등록한다:
```markdown
#### {이모지} Priority {N}: [Audit] {이슈명} (개발 대기)
  > **감사보고서**: `.docs/archive/audit/{파일명}.md`
  > **문제**: {한 줄 문제 요약}
  > **방안**: {한 줄 해결 방안 요약}

  - [ ] Phase 1: {작업명} → {관점}
    - [ ] {세부 작업}
```
> Priority 레벨 이모지는 감사 보고서 Status 기준: FAILED → 🔴, CONDITIONAL → 🟠

---

### 4️⃣ 정합성 최종 검증
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

등록 완료 후 다음을 최종 확인한다:

```
[ ] .docs/planning/ 의 모든 기획 문서가 블루프린트에 1:1 대응됨
[ ] Priority 번호가 순차적으로 증가함 (중복/누락 없음)
[ ] 각 Priority 항목에 기획서 링크가 올바르게 걸려있음 (archive/planning 경로)
[ ] 관점 배분이 기획서 내용과 일치함
[ ] 코드 변경 없음 확인 (문서만 변경)
```

---

### 5️⃣ 아카이브 이동
**관점**: 🏛️ **Architect** (권장: Gemini 3 Pro High)

블루프린트 등록이 완료된 기획 문서와 감사 보고서를 각각의 아카이브로 이동한다.

```bash
# 아카이브 폴더 생성 (없으면)
mkdir -p .docs/archive/planning
mkdir -p .docs/archive/audit

# 등록 완료된 기획 문서를 아카이브로 이동
mv .docs/planning/{파일명}.md .docs/archive/planning/

# 처리 완료된 감사 보고서를 아카이브로 이동
mv .docs/audit/{파일명}.md .docs/archive/audit/
```

> ⚠️ **planning / audit 폴더에는 아직 블루프린트에 등록되지 않은 문서만 남아야 한다.**
> 동기화가 정상 완료되면 두 폴더 모두 비어있어야 한다.

이동 후 최종 확인:
```bash
ls .docs/planning/
ls .docs/audit/
ls .docs/archive/planning/
ls .docs/archive/audit/
```

---

### 결과 보고

모든 단계 완료 후 사용자에게 결과를 보고한다:

```
📋 Planning → Blueprint 동기화 결과:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  전체 기획 문서:  N건
  ✅ 신규 등록:    N건
  ⏭️ 이미 등록됨:  N건
  🔄 갱신:         N건
  📦 아카이브 이동: N건
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Planning ↔ Blueprint 정합성: ✅ 일치
  .docs/planning/ 상태: ✅ 비어있음 (모든 문서 아카이브 완료)
```

---

## ✅ 완료 체크리스트

### 🏛️ Architect 관점 (권장: Gemini 3 Pro High) — 전담
- [ ] `.docs/planning/` 전체 스캔 완료
- [ ] `.docs/audit/` 전체 스캔 완료 (감사 보고서 🟡 항목 추출)
- [ ] 미등록 기획 문서 식별 완료
- [ ] 블루프린트 Priority 항목 일괄 등록 완료 (archive 경로로 링크)
- [ ] Known Issues 항목 추가 완료 (기획 + 감사 이슈)
- [ ] Planning ↔ Blueprint 1:1 정합성 검증 통과
- [ ] 등록 완료 기획 문서 → `.docs/archive/planning/` 이동 완료
- [ ] 처리 완료 감사 보고서 → `.docs/archive/audit/` 이동 완료
- [ ] `.docs/planning/` + `.docs/audit/` 폴더 비어있음 확인
- [ ] 코드 변경 없음 확인
- [ ] 스캔 결과 보고 완료
