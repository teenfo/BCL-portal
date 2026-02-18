---
name: plan-to-blueprint
description: 새로운 기능/아키텍처 기획 문서를 작성하고, 블루프린트에 에이전트별 작업 항목으로 등록하는 표준 스킬입니다.
---

# Plan to Blueprint Skill (plan-to-blueprint)

이 스킬은 새로운 기능이나 아키텍처 개선이 필요할 때, **기획 문서 작성 → 블루프린트 등록**까지의 표준 절차를 정의합니다.
현재 진행 중인 개발과 충돌하지 않도록 **코드 변경 없이** 기획과 작업 분배만 수행합니다.

---

## 언제 이 스킬을 사용하는가?

- 새로운 기능/모듈을 기획할 때 (즉시 개발하지 않고 나중에 착수)
- 아키텍처 개선이 필요하지만 다른 개발이 진행 중일 때
- 복잡한 기능을 여러 에이전트에게 분배하여 병렬 개발할 때
- 기획 내용을 문서로 남겨 다음 작업자가 이어받을 수 있도록 할 때

---

## 스킬 실행 절차

### 1️⃣ 현황 분석 (필수 선행)

기획 문서 작성 전, 다음 문서를 반드시 읽어 현재 상태를 파악한다:

```
1. .agent/rules/bcl-portal.rules.md     ← 프로젝트 절대 규칙
2. .docs/project-blueprint.md           ← 현재 개발 상태 및 Priority 목록
3. .docs/sitemap/README.md              ← 전체 라우팅 구조
4. .docs/database-reference.md          ← DB 스키마 현황
5. 관련 소스 파일                        ← 영향받는 코드 직접 확인
```

> ⚠️ **현황 분석 없이 기획 문서를 작성하면 안 된다.**
> 기존 구현과 충돌하거나 이미 완료된 작업을 중복 기획할 수 있다.

---

### 2️⃣ 기획 문서 작성

#### 저장 위치
```
.docs/planning/{feature-name}.md
```

#### 파일명 규칙
- `snake_case` 사용
- 기능/모듈명을 명확히 표현
- 예: `coach-account-architecture.md`, `payment-flow.md`, `race-realtime.md`

#### 필수 포함 섹션 (템플릿)

```markdown
# BCL Portal – {기능명} 기획서

> **Status**: Approved (기획 승인 — 개발 대기)
> **Author**: Agent ({역할})
> **Date**: {YYYY-MM-DD}
> **Related**: {관련 문서/파일 링크}

---

## 1. 개요 및 배경
### 1.1 목적
### 1.2 핵심 제약 조건

## 2. 현재 문제 진단 (As-Is)
- 현재 데이터/코드 흐름 다이어그램
- 문제점 목록 (테이블 형식)

## 3. 개선 설계 (To-Be)
- 핵심 설계 원칙
- 개선된 흐름 다이어그램

## 4. 데이터베이스 변경 (필요 시)
- 마이그레이션 SQL
- RLS 정책

## 5. UI 변경 상세 (필요 시)
- 화면 레이아웃 (ASCII 다이어그램)
- 변경 명세 테이블

## 6. 영향 범위 분석
- 영향받는 파일/모듈 목록
- 변경 필요 여부

## 7. 보안 고려사항

## 8. 구현 단계 및 에이전트 배분
- Phase별 작업 목록
- 담당 에이전트 명시

## 9. 블루프린트 등록용 체크리스트
(섹션 3️⃣에서 그대로 복사하여 블루프린트에 붙여넣을 내용)

## 10. 테스트 시나리오
- 정상 흐름
- 예외 흐름

## 11. 리스크 및 완화

---
**문서 버전**: 1.0.0
**최종 업데이트**: {날짜}
```

#### 작성 품질 기준

| 항목 | 기준 |
|---|---|
| **As-Is 다이어그램** | ASCII 또는 텍스트 흐름도로 현재 문제를 시각화 |
| **To-Be 다이어그램** | 개선 후 흐름을 명확히 표현 |
| **에이전트 배분** | 각 Phase마다 담당 에이전트와 모델 명시 |
| **SQL 예시** | DB 변경이 있으면 실제 실행 가능한 SQL 포함 |
| **테스트 시나리오** | 정상 흐름 최소 3건, 예외 흐름 최소 2건 |

---

### 3️⃣ 블루프린트에 등록

`.docs/project-blueprint.md`의 **`Next Steps`** 섹션에 새 Priority 항목을 추가한다.

#### 등록 형식 (필수 준수)

```markdown
#### 🔴 Priority {N}: {기능명} (개발 대기)
  > **기획서**: `.docs/planning/{파일명}.md`
  > **문제**: {한 줄 문제 요약}
  > **방안**: {한 줄 해결 방안 요약}

  - [ ] Phase 1: {작업명} → 💎 **Senior Dev (Opus)**
    - [ ] {세부 작업 1}
    - [ ] {세부 작업 2}
  - [ ] Phase 2: {작업명} → 🎨 **UI Developer (Gemini)**
    - [ ] {세부 작업 1}
  - [ ] Phase 3: {작업명} → 💻 **Developer (Sonnet)**
    - [ ] {세부 작업 1}
  - [ ] Phase 4: 문서 동기화 → 🏛️ **Architect (Opus)**
    - [ ] sitemap 갱신
    - [ ] blueprint 반영
```

#### Priority 레벨 기준

| 레벨 | 이모지 | 기준 |
|---|---|---|
| Critical | 🔴 | 현재 기능이 동작하지 않거나 보안 취약점 |
| High | 🟠 | 핵심 사용자 경험에 영향 |
| Medium | 🟡 | 품질 개선, UX 향상 |
| Low | 📄 | 문서화, 리팩토링 |

#### Priority 번호 결정

블루프린트의 기존 Priority 목록을 확인하고, **가장 마지막 번호 + 1**을 사용한다.

---

### 4️⃣ Known Issues 등록 (해당 시)

현재 동작하지 않는 기능이 있다면 블루프린트 `Known Issues` 섹션에 추가한다:

```markdown
- 🔴 **{이슈명}** (ACTIVE): {한 줄 설명} → [기획서](.docs/planning/{파일명}.md)
```

---

### 5️⃣ 완료 확인 체크리스트

```
[ ] .docs/planning/{파일명}.md 생성 완료
[ ] 기획서에 As-Is / To-Be 다이어그램 포함
[ ] 기획서에 에이전트별 Phase 작업 목록 포함
[ ] 기획서에 테스트 시나리오 포함
[ ] 블루프린트 Next Steps에 Priority 항목 추가
[ ] 블루프린트 Known Issues에 항목 추가 (해당 시)
[ ] 기획서 기반 코드 변경 없음 확인 (기획만 수행)
```

---

## 에이전트 역할 참조

| 에이전트 | 모델 | 담당 작업 |
|---|---|---|
| 🏛️ **Architect (Opus)** | Claude Opus | 설계, 구조 결정, 문서 동기화, 최종 승인 |
| 💎 **Senior Dev (Opus)** | Claude Opus | DB 스키마, RLS, 복잡한 비즈니스 로직, 보안 |
| 💻 **Developer (Sonnet)** | Claude Sonnet | API, 일반 로직, 버그 수정, 테스트/QA |
| 🎨 **UI Developer (Gemini)** | Gemini Flash | 화면 UI/UX, 컴포넌트, Stitch 디자인 |
| ⚡ **Specialist (Gemini)** | Gemini Flash | 실시간 기능, 성능 최적화, 카메라/QR |

---

## 실제 사용 예시

### 예시 1: 코치 계정 아키텍처 강화
```
1. 현황 분석:
   - coaches 테이블 확인 → user_id = NULL 문제 발견
   - AuthGuard 확인 → coach role 지원 확인
   - Coach App 코드 확인 → user_id 의존 확인

2. 기획 문서 작성:
   .docs/planning/coach-account-architecture.md

3. 블루프린트 등록:
   Priority 6: 코치 계정 아키텍처 강화 (개발 대기)
   - Phase 1: DB 스키마 → Senior Dev
   - Phase 2: Admin UI → UI Developer
   - Phase 3: 로직 변경 → Developer
   - Phase 4: 문서 동기화 → Architect

4. Known Issues 추가:
   🔴 코치 계정 미연결 (ACTIVE)
```

### 예시 2: 결제 시스템 도입
```
1. 현황 분석:
   - 현재 즉시 활성화 방식 확인
   - transactions 테이블 구조 확인

2. 기획 문서 작성:
   .docs/planning/payment-system.md

3. 블루프린트 등록:
   Priority 7: 결제 시스템 도입 (개발 대기)
   - Phase 1: PG사 선정 및 DB 설계 → Senior Dev
   - Phase 2: 결제 UI → UI Developer
   - Phase 3: 결제 API → Developer
   - Phase 4: 테스트 → Developer
   - Phase 5: 문서 동기화 → Architect
```

---

## 주의사항

- ❌ 기획 문서 작성 중 코드를 수정하지 않는다
- ❌ 블루프린트에 등록하지 않고 기획 문서만 작성하지 않는다
- ❌ 에이전트 배분 없이 Phase를 정의하지 않는다
- ✅ 기획 문서는 항상 `.docs/planning/` 에 저장한다
- ✅ 블루프린트 Priority 번호는 항상 순차적으로 증가한다
- ✅ 기획 완료 후 `commit-bot` 스킬로 문서만 커밋한다
