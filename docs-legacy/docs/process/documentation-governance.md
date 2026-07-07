# 문서 거버넌스 (Documentation Governance)

> **목적**: planning ↔ audit ↔ blueprint ↔ complete 사이의 참조 규칙과 갱신 책임을 통일하여 문서 드리프트를 방지한다.
> **PM 이슈 근거**: `.docs/archive/audit/audit-pm-gap-analysis-20260419.md` §3.2
> **마지막 갱신일**: 2026-04-25

---

## 1. 문서 분류와 역할

### 1.1 문서 카테고리

| 카테고리 | 위치 | 역할 | 수명 |
|---------|------|------|------|
| **Active Blueprint** | `.docs/project-blueprint.md` | 현재 활성 컨텍스트 + 미구현 항목 | 영구 (수시 갱신) |
| **Planning** | `.docs/archive/planning/<topic>.md` | 승인된 신규 기능/정비 계획서 | 작업 완료 시 archive로 이동 |
| **Active Planning** | `.docs/planning/<topic>.md` | 현재 진행 중인 작업의 계획서 | 작업 완료 시 archive로 이동 |
| **Audit** | `.docs/archive/audit/<scope>-<date>.md` | 특정 시점의 감사 스냅샷 (PM/기술/보안) | 영구 (수정 금지) |
| **Active Audit** | `.docs/audit/<vendor>/<file>.md` | 외부 벤더 감사 결과 | 후속 조치 후 archive 이동 |
| **Complete** | `.docs/archive/complete/project-complete-<date>.md` | 완료 작업 기록 (영구 히스토리) | 영구 (수정 금지) |
| **Result** | `.docs/archive/result/<topic>.md` | 작업 결과 보고서 / 검증 결과 | 영구 |
| **Reference** | `.docs/{security,testing,deployment,sitemap,database}/` | 항상 최신 상태로 유지되는 운영 레퍼런스 | 영구 (지속 갱신) |
| **Process** | `.docs/process/` | 본 문서 — 운영 절차 및 거버넌스 | 영구 (분기 단위 검토) |

### 1.2 문서 간 참조 규칙

```
Audit (스냅샷)
   │
   │ "기능 추가/정비가 필요하다" 식별
   ▼
Planning (작업 단위)
   │
   │ Architect 승인 후 작업 진행
   ▼
Code 변경
   │
   │ 작업 완료 시
   ▼
Blueprint (Active Context 갱신) + Complete (히스토리 추가)
   │
   │ Reference 문서가 영향받았다면
   ▼
Reference (지속 갱신)
```

**참조 방향 원칙:**
- Audit → Planning → Blueprint → Complete (시간 순)
- Reference는 어디서든 참조 가능하지만 **항상 코드 상태와 일치**해야 함
- Planning/Audit/Complete 문서는 작성 후 **수정 금지** — 후속 사항은 새 문서로 작성

---

## 2. 갱신 책임 매트릭스

| 이벤트 | 갱신 대상 | 담당 | 시점 |
|--------|----------|------|------|
| 신규 기능 기획 시작 | `.docs/planning/<topic>.md` 신설 | 🏛️ Architect | 작업 착수 전 |
| 기능 작업 완료 | `.docs/project-blueprint.md` Active Context | 작업자 | 커밋 직전 |
| Phase 완료 | `.docs/project-blueprint.md` 체크박스 + Last Action | 작업자 | 각 Phase 종료 시 |
| Priority 완료 | `.docs/archive/complete/project-complete-<date>.md` 추가 | 🏛️ Architect | Priority 종료 시 |
| Planning → archive 이동 | `.docs/planning/` → `.docs/archive/planning/` | 🏛️ Architect | 작업 완료 시 |
| 버전 업 | `package.json`, `src/lib/version.ts`, blueprint, README 동시 갱신 | 🏛️ Architect | 릴리즈 시 |
| 감사 수행 | `.docs/audit/<vendor>/<file>.md` 또는 `.docs/archive/audit/<scope>-<date>.md` | 감사자 | 분기 단위 또는 출시 전 |
| 감사 후속 조치 완료 | 해당 audit 파일을 `.docs/archive/audit/` 로 이동 (후속 조치 결과는 별도 result 파일) | 🏛️ Architect | 조치 완료 시 |
| DB 마이그레이션 추가 | `.docs/database-reference.md` 갱신 | 💎 Senior Dev | 마이그레이션 작성과 동시 |
| 보안 통제 변경 | `.docs/security/README.md` | 💎 Senior Dev | 변경과 동시 |
| 라우트/사이트맵 변경 | `.docs/sitemap/` 하위 문서 | 작업자 | 변경과 동시 |
| 환경 / 배포 변경 | `.docs/deployment/server-setup-guide.md` | 💻 Developer | 변경과 동시 |

> **원칙**: 갱신 책임자는 **코드 변경자와 동일** — 별도 사람이 따라가서 동기화하는 구조 금지.

---

## 3. 작성 가이드

### 3.1 Planning 문서 템플릿

```markdown
# <Topic> 기획서

> **Status**: Draft | Approved | Completed | Archived
> **Author**: <에이전트/역할>
> **Created**: YYYY-MM-DD
> **Last Updated**: YYYY-MM-DD
> **Related**: <링크>

## 1. 개요 및 배경
## 2. 현재 문제 진단 (As-Is)
## 3. 개선 설계 (To-Be)
## 4. 데이터베이스 변경 (필요 시)
## 5. 영향 범위 분석
## 6. 보안 고려사항
## 7. 구현 단계 및 에이전트 배분
## 8. 완료 판정 기준
## 9. 기대 효과
```

### 3.2 Audit 문서 명명 규칙

```
.docs/archive/audit/audit-<scope>-<YYYYMMDD>.md
```

예: `audit-pm-gap-analysis-20260419.md`, `audit-full-project-20260419.md`

### 3.3 Complete 문서 명명 규칙

```
.docs/archive/complete/project-complete-<YYYYMMDD>.md
```

여러 Priority가 같은 날 완료되면 한 파일에 모두 기록.

---

## 4. 자동 검증 가능한 정합성 항목

다음 항목은 CI 또는 정기 검사로 자동 검증 권장:

| 항목 | 검증 방법 |
|------|----------|
| `package.json` version == `src/lib/version.ts` BUILD_INFO.version | 빌드 스크립트에서 비교 |
| README의 Next.js / React 버전 == `package.json` | 수동 — 분기 단위 |
| blueprint 완료 항목 == complete 파일 항목 | 수동 — Priority 종료 시 |
| RLS 정책 누락 테이블 0건 | DB 쿼리 (`pg_class.relrowsecurity`) |

---

## 5. 분기 단위 점검 사항

매 분기마다 다음을 확인:

- [ ] README ↔ `package.json` 스택 버전 일치
- [ ] blueprint Active Context가 6개월 이상 멈춰있지 않음
- [ ] Reference 문서(`security`, `testing`, `deployment`, `sitemap`, `database`)의 최종 갱신일이 6개월 이내
- [ ] 미사용 / 더 이상 유효하지 않은 planning 파일 archive 이동
- [ ] 본 거버넌스 문서 자체의 정확성

---

## 관련 문서

- [Release Checklist](./release-checklist.md)
- [Active Blueprint](../project-blueprint.md)
- [Release Readiness 정비 기획서](../archive/planning/release-readiness-stabilization-task.md)
