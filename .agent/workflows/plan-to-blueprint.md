---
description: 새로운 기능/아키텍처 기획 문서를 작성하고 블루프린트에 에이전트별 작업 항목으로 등록하는 워크플로우입니다.
---

# Plan to Blueprint Workflow

이 워크플로우는 새로운 기능이나 아키텍처 개선이 필요할 때, **코드 변경 없이** 기획 문서를 작성하고 블루프린트에 개발 대기 항목으로 등록하는 절차입니다.

> 📖 **상세 스킬 가이드**: `.agent/skills/plan-to-blueprint/SKILL.md`

---

## 🤖 멀티에이전트 배분

| 단계 | 담당 에이전트 | 모델 | 핵심 역할 |
|:-----|:------------|:-----|:---------|
| 1. 현황 분석 | **Architect** | Opus (Thinking) | 기존 코드/문서 분석, 문제 정의 |
| 2. 기획 문서 작성 | **Architect** | Opus (Thinking) | 설계 결정, As-Is/To-Be 다이어그램 |
| 3. 블루프린트 등록 | **Developer** | Sonnet | 블루프린트 편집, Known Issues 추가 |
| 4. 최종 검토 | **Architect** | Opus (Thinking) | 기획 완전성 검토, 커밋 승인 |

---

## 단계별 절차

### 1️⃣ 현황 분석
**담당**: 🏛️ **Architect (Opus Thinking)**

다음 문서와 코드를 순서대로 읽어 현재 상태를 파악한다:

1. `.docs/project-blueprint.md` — 현재 Priority 목록 및 Known Issues 확인
2. `.docs/sitemap/README.md` — 전체 라우팅 구조 확인
3. `.docs/database-reference.md` — DB 스키마 현황 확인
4. 영향받는 소스 파일 직접 확인 (grep/find 활용)

**Architect가 확인할 것**:
- 기획하려는 기능이 이미 구현되어 있지 않은지
- 기존 아키텍처와 충돌 여부
- 영향받는 파일 범위
- 현재 진행 중인 개발과의 충돌 가능성

> ⚠️ **현황 분석 없이 기획 문서를 작성하지 않는다.**

---

### 2️⃣ 기획 문서 작성
**담당**: 🏛️ **Architect (Opus Thinking)**

`plan-to-blueprint` 스킬의 템플릿을 따라 기획 문서를 작성한다.

**저장 위치**: `.docs/planning/{feature-name}.md`

**Architect가 작성할 것**:
- **As-Is**: 현재 문제를 ASCII 다이어그램으로 시각화
- **To-Be**: 개선 후 흐름을 명확히 표현
- **DB 변경**: 필요한 마이그레이션 SQL (실행 가능한 수준)
- **UI 변경**: 모달/화면 레이아웃 변경 명세
- **에이전트 배분**: Phase별 담당 에이전트와 세부 작업 목록
- **테스트 시나리오**: 정상 3건 이상, 예외 2건 이상
- **리스크**: 예상 리스크와 완화 방안

// turbo

---

### 3️⃣ 블루프린트 등록
**담당**: 💻 **Developer (Sonnet)**

`.docs/project-blueprint.md`를 수정하여 새 기획을 등록한다.

**Developer가 수행할 것**:

1. **Priority 번호 결정**: 기존 마지막 Priority 번호 + 1
2. **Next Steps 섹션에 추가**:
   ```markdown
   #### 🔴 Priority {N}: {기능명} (개발 대기)
     > **기획서**: `.docs/planning/{파일명}.md`
     > **문제**: {한 줄 요약}
     > **방안**: {한 줄 요약}

     - [ ] Phase 1: ... → 💎 **Senior Dev (Opus)**
     - [ ] Phase 2: ... → 🎨 **UI Developer (Gemini)**
     - [ ] Phase 3: ... → 💻 **Developer (Sonnet)**
     - [ ] Phase 4: 문서 동기화 → 🏛️ **Architect (Opus)**
   ```
3. **Known Issues 섹션에 추가** (현재 동작 불가 기능인 경우):
   ```markdown
   - 🔴 **{이슈명}** (ACTIVE): {설명} → [기획서](.docs/planning/{파일명}.md)
   ```

---

### 4️⃣ 최종 검토 및 커밋
**담당**: 🏛️ **Architect (Opus Thinking)**

**Architect가 검토할 것**:
- 기획 문서의 As-Is/To-Be가 명확한지
- 에이전트 배분이 적절한지 (역할에 맞는 에이전트 배정)
- 블루프린트 등록 형식이 기존 항목과 일관성이 있는지
- 코드 변경이 없는지 확인 (기획 문서와 블루프린트만 변경)

승인 후 `commit-bot` 스킬로 커밋:
```
docs: {기능명} 기획 문서 작성 및 블루프린트 등록
```

---

## ✅ 완료 체크리스트

### Architect (Opus)
- [ ] 현황 분석 완료 (기존 코드/문서 확인)
- [ ] 기획 문서 생성 완료 (`.docs/planning/`)
- [ ] As-Is / To-Be 다이어그램 포함
- [ ] 에이전트별 Phase 작업 목록 포함
- [ ] 테스트 시나리오 포함 (정상 3건 이상)
- [ ] 최종 검토 완료

### Developer (Sonnet)
- [ ] 블루프린트 Priority 항목 추가 완료
- [ ] Known Issues 항목 추가 완료 (해당 시)
- [ ] 코드 변경 없음 확인

### 공통
- [ ] `commit-bot` 스킬로 문서 커밋 완료
