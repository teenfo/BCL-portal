# Antigravity Operations Guide

이 문서는 에이전트 팀이 매일 어떻게 소통하고 협업하며 품질을 관리하는지에 대한 운영 지침을 설명합니다.

**모델 구성**: Claude Opus 4.6 (Thinking), Claude Sonnet 4.6, Gemini 3 Flash

---

## 1. Daily Standup Format

에이전트 팀은 매일 작업을 시작하고 끝낼 때 다음과 같은 형식으로 상태를 공유합니다.

### Morning (Project Start)
- **Architect (Opus 4.6 Thinking)**: 어제 작업물 아키텍처 검토, 잠재적 블로커 식별.
- **Senior Developer (Opus 4.6 Thinking)**: 복잡한 로직 설계 검토, 보안 이슈 확인.
- **Developer (Sonnet 4.6)**: 오늘의 구현 태스크 계획 수립, 테스트 대상 파악.
- **UI Developer (Gemini 3 Flash)**: UI/UX 작업 계획, 디자인 일관성 확인.
- **Specialist (Gemini 3 Flash)**: 성능 메트릭 확인, 최적화가 필요한 부분 계획.

### Evening (Before Commit)
- **Developer (Sonnet 4.6)**: 리뷰를 위해 코드를 준비, 작업 내용 요약, 테스트 결과 보고.
- **UI Developer (Gemini 3 Flash)**: UI 구현 결과물 공유, 디자인 시스템 준수 확인.
- **Architect (Opus 4.6 Thinking)**: 아키텍처 일관성 및 보안 검토 수행.
- **Specialist (Gemini 3 Flash)**: 실시간 기능 및 인터랙션 정상 작동 여부 검증.

---

## 2. Pull Request (PR) Process

코드 품질 유지를 위한 표준 리뷰 절차입니다.

1. **구현 에이전트** (UI Developer/Developer/Specialist): 작업 브랜치 완료 후 PR 작성 및 상세 설명 추가.
2. **Developer (Sonnet 4.6)**: 테스트 작성 및 품질 검증. (자기 구현물은 자체 검증)
3. **Architect (Opus 4.6 Thinking)**: 아키텍처 일관성, 보안, 패턴 준수 여부 리뷰.
4. **구현 에이전트**: 리뷰 피드백을 바탕으로 코드 수정 및 보완.
5. **Architect (Opus 4.6 Thinking)**: 최종 승인 및 메인 브랜치 머지.

---

## 3. Emergency Bug Fix (에스컬레이션)

버그의 특성에 따라 담당 에이전트와 프로세스를 즉시 결정합니다.

| 버그 유형 | 처리 프로세스 |
| :--- | :--- |
| **Critical/Security** | Architect (원인 분석) → Senior Dev (수정) → Developer (검증) → Architect (승인) |
| **Business Logic** | Developer (분석 & 수정 & 검증) → 필요 시 Architect 리뷰 |
| **UI/UX Bugs** | UI Developer (수정) → Developer (검증) |
| **Performance/Real-time** | Specialist (최적화 및 수정) → Developer (벤치마크) → Architect (검증) |

---

**Last Updated**: 2026-02-18  
**Version**: 3.0
