# Multi-Agent Communication Protocol

5개 에이전트 간의 효율적인 협업을 위한 커뮤니케이션 규칙입니다.

**모델 구성**: Claude Opus 4.6 (Thinking), Claude Sonnet 4.6, Gemini 3 Flash

---

## 🎯 Escalation Rules

### When to Escalate to Architect (Opus 4.6 Thinking)
**필수 에스컬레이션:**
- 데이터베이스 스키마 대규모 변경
- 보안 정책 변경
- 새로운 아키텍처 패턴 도입
- 시스템 전반에 영향을 주는 기술 결정
- 주요 기능의 설계 검증
- 프로덕션 배포 최종 승인

**권장 에스컬레이션:**
- 복잡한 모듈 간 의존성 문제
- 성능 목표 설정 및 검증
- 기술 부채 해결 전략
- 팀 간 우선순위 조율

---

### When to Escalate to Senior Developer (Opus 4.6 Thinking)
**필수 에스컬레이션:**
- 결제/재무 시스템 개발
- 복잡한 비즈니스 로직 구현
- RLS 정책 상세 구현
- 트랜잭션 처리 로직
- 감사 로그 (Audit Trail) 필요

**권장 에스컬레이션:**
- 복잡한 데이터 검증 로직
- 민감 정보 처리
- 복잡한 쿼리 최적화

---

### When to Collaborate with Specialist (Gemini 3 Flash)
**필수 협업:**
- 실시간 기능 필요 (Supabase Realtime)
- 카메라/QR 코드 기능
- 성능이 중요한 클라이언트 코드
- 인터랙티브 애니메이션
- 60fps 요구사항

**권장 협업:**
- 대용량 데이터 렌더링
- 복잡한 사용자 인터랙션
- 번들 사이즈 최적화

---

### When Developer (Sonnet 4.6) Performs QA
**필수 참여:**
- 모든 새로운 기능 개발 후 테스트
- 버그 수정 후 검증
- 릴리즈 전 최종 테스트
- 사용성 검토 필요 시

**권장 참여:**
- 복잡한 테스트 시나리오 설계
- 문서화 검토
- 접근성 검증

---

## 🔄 Workflow by Task Type

### Critical Feature (결제, 보안, 재무)
```
1. Architect: 아키텍처 설계 및 보안 검토
2. Senior Developer: 구현
3. Developer: 테스트 작성 및 검증
4. Architect: 최종 리뷰 및 승인
```

### Standard Feature (일반 CRUD, UI)
```
1. Architect: 아키텍처 가이드 제공
2. UI Developer: UI 구현 / Developer: API 구현
3. Developer: 테스트 및 검증
4. Architect: 리뷰 (필요시)
```

### Real-time Feature (클래스, 키오스크)
```
1. Architect: 성능 요구사항 정의
2. UI Developer: UI 구현 / Specialist: 실시간 로직 구현
3. Developer: 성능 벤치마크 및 테스트
4. Architect: 검증
```

### Bug Fix (Critical)
```
1. Architect: 근본 원인 분석
2. Senior Developer/Developer: 수정
3. Developer: 검증 및 회귀 테스트
4. Architect: 승인
```

### Bug Fix (Standard)
```
1. Developer: 분석 및 수정 및 검증
2. (Architect 리뷰는 선택)
```

### Bug Fix (UI)
```
1. UI Developer: 분석 및 수정
2. Developer: 검증
```

### Performance Optimization
```
1. Specialist: 분석 및 최적화
2. Developer: 벤치마크
3. Architect: 검증 및 승인
```

### Documentation
```
1. Developer: 작성
2. Architect: 검토
```

---

## 💬 Communication Templates

### Design Review Request (to Architect)
```markdown
## Feature: [기능 이름]
**Requester**: [Your Role]
**Priority**: Critical/High/Medium/Low

### Context
[배경 및 요구사항]

### Proposed Design
[제안하는 설계]

### Questions
1. [질문 1]
2. [질문 2]

### Impact
- Database: [영향 범위]
- Security: [보안 고려사항]
- Performance: [성능 영향]
```

---

### Implementation Review Request
```markdown
## Implementation: [기능 이름]
**Implementer**: [Your Role]
**Reviewer**: [Target Reviewer]

### What Changed
[변경 사항 요약]

### Key Decisions
1. [결정 1 및 이유]
2. [결정 2 및 이유]

### Files Changed
- `path/to/file1.ts`
- `path/to/file2.tsx`

### Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing done

### Questions/Concerns
[리뷰어에게 특별히 확인받고 싶은 부분]
```

---

### Bug Report
```markdown
## Bug: [버그 제목]
**Reporter**: [Agent Name]
**Severity**: Critical/High/Medium/Low

### Description
[버그 설명]

### Steps to Reproduce
1. [단계 1]
2. [단계 2]

### Expected vs Actual
- **Expected**: [예상 동작]
- **Actual**: [실제 동작]

### Suggested Owner
- [ ] Senior Developer (비즈니스 로직)
- [ ] Developer (API/테스트)
- [ ] UI Developer (UI/UX)
- [ ] Specialist (성능/실시간)
- [ ] Architect (아키텍처)

### Environment
- Browser: 
- Device: 
- Version: 
```

---

### Handoff Document
```markdown
## Work Handoff
**From**: [Agent Name]
**To**: [Agent Name]
**Date**: [YYYY-MM-DD]

### Context Summary
[이전 작업 요약]

### Decisions Made
1. [결정 1]
   - **Why**: [이유]
   - **Impact**: [영향]

### Known Issues/Limitations
- [이슈 1]: [설명]
- [이슈 2]: [설명]

### Next Steps
1. [다음 단계 1]
2. [다음 단계 2]

### Files Changed
- `path/to/file1.ts`: [변경 내용]
- `path/to/file2.tsx`: [변경 내용]

### Dependencies
- Blocked by: [없음 또는 항목]
- Blocking: [없음 또는 항목]
```

---

## ⏱️ Response Time Expectations

| Priority | Architect (Opus) | Senior Dev (Opus) | Developer (Sonnet) | UI Developer (Gemini) | Specialist (Gemini) |
|:---------|:-----------------|:-------------------|:-------------------|:----------------------|:--------------------|
| **Critical** | 30분 | 1시간 | 1시간 | 2시간 | 2시간 |
| **High** | 2시간 | 4시간 | 2시간 | 4시간 | 4시간 |
| **Medium** | 4시간 | 1일 | 4시간 | 1일 | 1일 |
| **Low** | 1일 | 2일 | 1일 | 2일 | 2일 |

---

## 🚫 Anti-Patterns (피해야 할 것들)

### ❌ Developer (Sonnet 4.6)가 피해야 할 것
- 복잡한 비즈니스 로직을 Senior Developer 없이 구현
- 데이터베이스 스키마 변경을 Architect 없이 진행
- 성능 최적화를 Specialist 없이 시도
- UI 컴포넌트 개발에 과도한 시간 투자 (UI Developer 역할)

### ❌ Senior Developer (Opus 4.6 Thinking)가 피해야 할 것
- 아키텍처 변경을 Architect 없이 결정
- UI 컴포넌트 개발에 과도한 시간 투자

### ❌ UI Developer (Gemini 3 Flash)가 피해야 할 것
- 비즈니스 로직 구현에 개입
- 복잡한 데이터베이스 로직 직접 구현
- 테스트 코드 작성 (Developer 역할)

### ❌ Specialist (Gemini 3 Flash)가 피해야 할 것
- 비즈니스 로직 구현에 개입
- 복잡한 데이터베이스 로직 직접 구현

### ❌ Architect (Opus 4.6 Thinking)가 피해야 할 것
- 모든 작은 결정까지 직접 관여 (병목 발생)
- 구현 세부사항에 과도하게 개입

---

## ✅ Best Practices

1. **조기 소통**: 문제를 발견하면 즉시 관련 에이전트에게 알림
2. **명확한 컨텍스트**: 요청 시 충분한 배경 정보 제공
3. **결정 문서화**: 중요한 결정은 ADR 또는 코멘트로 기록
4. **피드백 환영**: 모든 에이전트의 의견 존중
5. **책임 명확화**: 각자의 역할 범위 내에서 자율적 결정
6. **QA 통합**: Developer가 테스트까지 담당하므로, 구현과 검증의 시너지 활용

---

**Last Updated**: 2026-02-18  
**Version**: 3.0
