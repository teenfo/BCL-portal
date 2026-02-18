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

### 2️⃣ 블루프린트 문서 갱신
**담당**: 💻 **Developer (Sonnet 4.6)**

- `.docs/project-blueprint.md` 파일을 열어 **`5. 현재 작업 컨텍스트 (Active Context)`** 섹션을 갱신합니다.
- **Developer가 수행할 것**:
  - **`Current Focus`**: 현재 진행 중인 작업의 주제를 한 줄로 요약 (예: Admin 대시보드 UI 구현)
  - **`Recent Accomplishments`**: 이번 세션에서 완료된 항목을 체크박스(`- [x]`) 형태로 추가
  - **`Next Steps`**: 다음 작업자가 바로 이어서 해야 할 구체적인 태스크 명시 (`- [ ]`)
  - **담당 에이전트 명시**: Next Steps에 담당 에이전트 표기
    ```markdown
    - [ ] 결제 모듈 API 구현 → **Senior Developer (Opus)**
    - [ ] 결제 UI 구현 → **UI Developer (Gemini)**
    - [ ] 결제 기능 테스트 → **Developer (Sonnet)**
    ```

---

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
