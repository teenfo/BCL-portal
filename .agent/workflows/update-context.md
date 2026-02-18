---
description: 현재 작업의 진행 상황과 컨텍스트를 프로젝트 블루프린트(.docs/project-blueprint.md)에 기록하여 다음 작업자가 원활하게 이어받을 수 있도록 합니다. (커밋 전 필수 수행)
---

# Update Context Workflow

이 워크플로우는 작업 세션을 종료하거나 커밋을 수행하기 전, 현재의 진행 상태(Context)를 명확히 기록하여 프로젝트의 연속성을 보장하는 절차입니다.

---

## 🤖 멀티에이전트 배분

| 단계 | 담당 에이전트 | 모델 | 핵심 역할 |
|:-----|:------------|:-----|:---------|
| 1. 작업 내용 분석 | **Developer** | Sonnet 4.6 | 변경 사항 요약, 누락 확인 |
| 2. 블루프린트 갱신 | **Developer** | Sonnet 4.6 | Active Context 업데이트 |
| 3. 체크리스트 동기화 | **Developer** | Sonnet 4.6 | Phase 체크박스 업데이트 |
| 4. 최종 확인 | **Architect** | Opus 4.6 (Thinking) | 컨텍스트 완전성 검토, 커밋 승인 |

---

## 단계별 절차

### 1️⃣ 작업 내용 분석
**담당**: 💻 **Developer (Sonnet 4.6)**

- 현재 세션에서 수행한 주요 작업(기능 구현, 문서 수정, 버그 픽스 등)을 요약합니다.
- **Developer가 수행할 것**:
  - `git status`나 최근 변경 파일 목록을 참고하여 누락된 사항이 없는지 확인
  - 기본 기능(로그인, 화면 표시, 링크 이동)에 영향을 준 변경 사항 별도 표시
  - 미완료 항목 및 다음 작업자를 위한 컨텍스트 정리

---

### 2️⃣ 블루프린트 문서 갱신 (이원화 구조)
**담당**: 💻 **Developer (Sonnet 4.6)**

> ⚠️ **이원화 규칙**: 블루프린트는 **미구현 항목만** 유지합니다.
> 완료된 작업은 `.docs/archive/complete/project-complete-YYYYMMDD.md`로 이동합니다.

#### A. `.docs/project-blueprint.md` (활성 문서)
- **Active Context(Section 5)만 갱신**:
  - **`Current Focus`**: 현재 진행 중인 작업의 주제를 한 줄로 요약
  - **`Next Steps`**: 다음 작업자가 바로 이어서 해야 할 미구현 태스크만 남김 (`- [ ]`)
  - **담당 에이전트 명시**: Next Steps에 담당 에이전트 표기
- **완료된 항목 제거**: `- [x]` 체크된 항목은 blueprint에서 삭제 (complete 파일로 이동)
- **구현 상태 요약(Section 3) 테이블 갱신**: 모듈 완료 상태만 간결하게 유지

#### B. `.docs/archive/complete/project-complete-YYYYMMDD.md` (히스토리)
- **오늘 날짜 파일 확인**: `.docs/archive/complete/project-complete-YYYYMMDD.md` (예: `project-complete-20260218.md`)
  - 파일이 없으면 새로 생성 (날짜가 바뀌 경우)
  - 파일이 이미 있으면 하단에 **이번 세션 작업 내역 추가**
- **기록 형식**:
  ```markdown
  ## YYYY-MM-DD HH:MM 세션 작업 내역
  ### [작업 주제]
  - [x] 완료 항목 1
  - [x] 완료 항목 2
  ```
- **Agent 자동 참조 금지**: 이 파일은 사용자가 명시적으로 요청한 경우에만 참조

### 3️⃣ 체크리스트 동기화 (선택)
**담당**: 💻 **Developer (Sonnet 4.6)**

- 만약 `Phase 1, 2, 3` 등의 상위 체크리스트에 해당하는 항목이 완료되었다면 해당 부분도 함께 체크(`[x]`) 처리합니다.

---

### 4️⃣ 최종 확인 및 커밋
**담당**: 🏛️ **Architect (Opus 4.6 Thinking)**

- **Architect가 수행할 것**:
  - 기록된 내용이 다음 작업자가 봤을 때 충분히 이해할 수 있는 수준인지 검토
  - Next Steps의 에이전트 배분이 적절한지 확인
  - 기본 기능 영향 사항이 명확히 기록되었는지 확인
  - 승인 후 `commit-bot` 스킬로 커밋

---

## ✅ 체크리스트

### Developer (Sonnet)
- [ ] 변경 파일 목록 확인 완료
- [ ] Current Focus 업데이트 완료
- [ ] Recent Accomplishments 추가 완료
- [ ] Next Steps 작성 완료 (담당 에이전트 명시)
- [ ] 기본 기능 영향 사항 기록 완료

### Architect (Opus)
- [ ] 컨텍스트 완전성 검토 완료
- [ ] Next Steps 에이전트 배분 적절성 확인
- [ ] 커밋 승인 완료
