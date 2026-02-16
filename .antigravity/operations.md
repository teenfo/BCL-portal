# Antigravity Operations Guide

이 문서는 에이전트 팀이 매일 어떻게 소통하고 협업하며 품질을 관리하는지에 대한 운영 지침을 설명합니다.

---

## 1. Daily Standup Format

에이전트 팀은 매일 작업을 시작하고 끝낼 때 다음과 같은 형식으로 상태를 공유합니다.

### Morning (Project Start)
- **Architect (Opus)**: 어제 작업물 아키텍처 검토, 잠재적 블로커 식별.
- **Developer (Sonnet)**: 오늘의 구현 태스크 계획 수립.
- **Specialist (Gemini)**: 성능 메트릭 확인, 최적화가 필요한 부분 계획.

### Evening (Before Commit)
- **Developer (Sonnet)**: 리뷰를 위해 코드를 준비하고 작업 내용 요약.
- **Architect (Opus)**: 아키텍처 일관성 및 보안 검토 수행.
- **Specialist (Gemini)**: 실시간 기능 및 인터랙션 정상 작동 여부 검증.

---

## 2. Pull Request (PR) Process

코드 품질 유지를 위한 표준 리뷰 절차입니다.

1. **Developer (Sonnet/Gemini)**: 작업 브랜치 완료 후 PR 작성 및 상세 설명 추가.
2. **Architect (Opus)**: 아키텍처 일관성, 보안, 패턴 준수 여부 리뷰.
3. **Developer**: 리뷰 피드백을 바탕으로 코드 수정 및 보완.
4. **Architect (Opus)**: 최종 승인 및 메인 브랜치 머지.

---

## 3. Emergency Bug Fix (에스컬레이션)

버그의 특성에 따라 담당 에이전트와 프로세스를 즉시 결정합니다.

| 버그 유형 | 처리 프로세스 |
| :--- | :--- |
| **Critical/Security** | Opus (원인 분석) → Sonnet (수정) → Opus (검증) |
| **UI/UX Bugs** | Sonnet (직접 수정) → 필요 시 Opus 리뷰 |
| **Performance/Real-time** | Gemini (최적화 및 수정) → Opus (검증) |
