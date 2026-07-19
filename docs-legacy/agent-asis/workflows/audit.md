---
description: 개발된 내용을 다른 모델이 3자 관점에서 전체 스캔하여 검증하는 독립 감사 워크플로우입니다.
---

# Audit Workflow (`/audit`)

이 워크플로우는 개발이 완료된 기능을 **개발에 참여하지 않은 다른 모델**이 3자 관점에서 전체 스캔하여, 기획서와 구현의 정합성, UI 표준, 보안, 코드 품질을 종합 검증하는 **독립 감사 절차**입니다.

> 🔑 **핵심 원칙**: 개발한 모델이 아닌 **다른 모델**이 수행합니다.
> 자기 코드를 자기가 검토하는 것은 맹점이 있습니다. 3자의 신선한 눈이 블라인드 스팟을 발견합니다.



---

## 🤖 감사 모델 선택 원칙

> ⚠️ **개발에 사용한 모델과 다른 모델을 사용하세요.**

| 개발에 사용한 모델 | 감사 권장 모델 | 이유 |
|:---|:---|:---|
| Claude Sonnet 4.6 | **Gemini 3 Pro (High)** | 1M 컨텍스트로 전체 코드+기획서 한 번에 로드, 다른 관점 |
| Gemini 3 Pro (Low) | **Claude Sonnet 4.6** | 정밀한 코드 분석, TypeScript 타입 검증에 강점 |
| Claude Opus 4.6 | **Gemini 3 Pro (High)** | 빠른 전체 스캔, UI/패턴 일관성 검증 |
| 혼합 사용 | **가장 적게 사용한 모델** | 최대한 신선한 관점 확보 |

---

## 🎯 감사 범위 및 대상

### 실행 시점
- **대규모**: Priority 단위 개발 완료 후 (필수)
- **선택적**: 복잡한 버그 수정, 보안 관련 변경 후

### 스캔 대상
감사 모델은 다음을 **처음부터 읽습니다** (개발 컨텍스트 없이):

```
1. 기준 문서 (Source of Truth — "이렇게 되어 있어야 한다")
   ├── .docs/sitemap/**/*.md              ← 화면/라우트 구조 (SSOT)
   ├── .docs/database-reference.md         ← DB 스키마 기준
   ├── .docs/design-system.md              ← 디자인 토큰/컴포넌트 스타일
   ├── .docs/security/README.md            ← 보안 아키텍처, 권한 매트릭스, 체크리스트
   ├── .agent/rules/bcl-portal.rules.md    ← 프로젝트 규칙
   └── .agent/skills/ui-gen/SKILL.md       ← UI 표준 (Glassmorphism)

2. 상세 명세 (보조 참조 — "이렇게 동작해야 한다")
   └── .docs/archive/planning/*.md         ← 완료된 기능의 상세 기획

3. 완료 보고 (교차 검증 — "이것을 했다고 보고했다")
   └── .docs/archive/complete/*.md         ← 구현 완료 기록

4. 이전 감사 및 이력 (회귀 검증 — "과거에 지적된 이슈가 해결되었는가?")
   ├── .docs/audit/*.md                              ← 이전 감사 보고서
   └── .docs/archive/result/ref-*.md                 ← 통합 참조 (감사·개발·설정 이력)

5. 구현 코드 (검증 대상 — "실제로 이렇게 되어 있다")
   └── src/app/ 해당 경로의 page.tsx, 컴포넌트, API

6. 프로덕션 DB (보안 검증 대상)
   └── Supabase 테이블 RLS 상태, 정책, 함수 (SELECT only)
```

> ⚠️ **`.docs/planning/`(미구현 기획)은 감사 대상이 아닙니다.**

### 📌 범위별 문서 선별 규칙

문서가 많으므로, **Step 1에서 결정한 감사 범위에 해당하는 문서만** 읽습니다.

| 감사 범위 | 읽어야 할 문서 |
|:---|:---|
| `/audit admin` | `sitemap/admin/`, `src/app/admin/`, 관련 planning·complete·audit만 |
| `/audit apps` | `sitemap/apps/`, `src/app/apps/`, 관련 planning·complete·audit만 |
| `/audit` (전체) | 위 전체 — 단, `sitemap/README.md` → 영역별 순차 스캔 |

**공통 필수** (범위 무관하게 항상 읽음):
- `.agent/rules/bcl-portal.rules.md`
- `.agent/skills/ui-gen/SKILL.md`
- `.docs/database-reference.md`
- `.docs/design-system.md`
- `.docs/security/README.md`

---

## 단계별 절차

### 1️⃣ 감사 범위 결정
**수행**: 유저가 지정한 감사 범위를 확인합니다. 지정이 없으면 전체 프로젝트를 대상으로 합니다.

| 범위 | 대상 | 예시 |
|:---|:---|:---|
| **전체** | 모든 영역 (admin + apps + coach + class + kiosk) | `/audit` |
| **영역 지정** | 특정 영역 1~2개 | `/audit admin`, `/audit apps` |
| **라우트 지정** | 특정 라우트 | `/audit admin/operations/coaches` |

1. Sitemap 전체 구조 파악:
   ```bash
   cat .docs/sitemap/README.md
   ```

2. 감사 대상 영역의 **실제 라우트 파일** 목록 확인:
   ```bash
   ls src/app/{대상영역}/
   ```

3. 해당 영역의 **Sitemap 상세 기준 문서** 확인:
   ```bash
   ls .docs/sitemap/{대상영역}/
   ```

---

### 2️⃣ 전체 스캔 (Fresh Eyes)

> 💡 **핵심**: 개발 히스토리를 모르는 상태에서, 기준 문서와 코드를 처음부터 읽고 비교합니다.

#### A. Sitemap-코드 정합성 (🏛️ Architect 관점)
- [ ] Sitemap에 정의된 화면/기능이 **실제로** 구현되어 있는가?
- [ ] Sitemap의 라우트 구조와 실제 파일 구조가 일치하는가?
- [ ] Sitemap에 명시된 Edge Case/예외 상황이 코드에 반영되었는가?
- [ ] Sitemap에 없는 기능이 임의로 추가되지 않았는가?

#### B. UI/UX 표준 준수 (🎨 UI Developer 관점)
- [ ] `ui-gen/SKILL.md`의 Glassmorphism 가이드를 준수하는가?
- [ ] Admin 페이지에서 글로벌 CSS 클래스(`.admin-filter-btn`, `.admin-search-input`, `.admin-action-btn`)를 사용하는가?
- [ ] 색상, 패딩, 폰트가 하드코딩되지 않고 CSS 변수를 사용하는가?
- [ ] 모바일(apps) / 데스크탑(admin) 반응형 레이아웃이 적절한가?
- [ ] Empty State, Loading State(Skeleton)가 구현되어 있는가?

#### C. 보안/DB 검증 (💎 Senior Dev 관점)
- [ ] 새로운 테이블에 RLS 정책이 설정되어 있는가?
- [ ] Client 코드에서 `service_role` 키를 사용하지 않는가?
- [ ] 모든 API 호출에 적절한 권한 검증이 포함되어 있는가?
- [ ] `database-reference.md`에 변경 사항이 반영되어 있는가?

#### D. 코드 품질 (💻 Developer 관점)
// turbo
```bash
npm run build
```
- [ ] 빌드 에러 없음
- [ ] TypeScript `any` 타입 미사용
- [ ] `console.log` 제거
- [ ] 컴포넌트 분리 및 재사용성 적절

### 3️⃣ 감사 보고서 작성

감사 결과를 `.docs/audit/`에 보고서로 작성합니다. 기획서와 유사한 구조를 따릅니다.

#### 파일 명명 규칙
```
.docs/audit/audit-{대상기능}-YYYYMMDD.md
```
예시: `.docs/audit/audit-payment-system-20260218.md`

#### 보고서 템플릿

```markdown
# Audit Report: {대상 기능명}

**Status**: 🟢 PASSED / 🟡 CONDITIONAL / 🔴 FAILED
**Date**: YYYY-MM-DD
**Target**: {감사 대상 Priority 또는 기능 설명}
**Auditor**: {감사 모델명} (예: Gemini 3 Pro High)
**Developer**: {개발 모델명} (예: Claude Sonnet 4.6)

---

## 1. 감사 범위
- 기획서: {기획서 경로}
- 코드 범위: {대상 라우트/파일}
- 기준 문서: Sitemap, ui-gen, bcl-portal.rules

---

## 2. 영역별 평가

| 영역 | 상태 | 핵심 소견 |
|:---|:---:|:---|
| **기획 준수** | 🟢/🟡/🔴 | {한 줄 요약} |
| **UI/UX 표준** | 🟢/🟡/🔴 | {한 줄 요약} |
| **보안 (RLS/권한)** | 🟢/🟡/🔴 | {한 줄 요약} |
| **코드 품질** | 🟢/🟡/🔴 | {한 줄 요약} |

---

## 3. 발견 사항

### 🔴 Critical (보안/데이터 무결성 위협)
1. {이슈}: {설명} → {영향 범위}

### 🟡 Major (기획 불일치/기능 결함)
1. {이슈}: {설명} → {영향 범위}

### 🟢 Minor (권장 개선/참고 사항)
1. {이슈}: {설명}

---

## 4. 조치 요약
- 🔴 Critical: {N}건 → `/develop`로 **우선 수정** (감사자는 수정하지 않음)
- 🟡 Major: {N}건 → `/plan-to-blueprint` 실행 시 정식 Priority로 등록
- 🟢 Minor: {N}건 → 다음 개발 시 참고
```

---

### 4️⃣ 결과 처리

> ⛔ **절대 규칙: 감사 세션에서는 코드, DB, 인프라를 수정하지 않습니다.**
> 감사자의 역할은 **"발견과 보고"**에 한정됩니다.
> 수정은 반드시 **별도 세션**에서 `/develop` 워크플로우를 통해 진행합니다.

감사에서 발견한 이슈는 심각도에 따라 **보고서에 기록만** 합니다:

| 심각도 | 처리 방법 |
|:-------|:---------|
| 🔴 **Critical** | 보고서에 기록 → 보고 후 **즉시 `/develop`로 수정 착수** (감사자가 아닌 개발자가 수행) |
| 🟡 **Major** | 보고서에 기록 → `/plan-to-blueprint` 실행 시 **정식 Priority로 등록** |
| 🟢 **Minor** | 보고서에 기록 (다음 개발 시 참고) |

### 감사자 금지 행위
- ❌ 소스 코드 수정 (코드 편집 도구 사용 금지)
- ❌ DB 마이그레이션 적용 (`apply_migration` 사용 금지)
- ❌ DB 데이터 변경 (`INSERT`, `UPDATE`, `DELETE` 실행 금지 — `SELECT`만 허용)
- ❌ 패키지 설치/삭제
- ❌ 설정 파일 변경

> 📌 **`/plan-to-blueprint`와의 연동**:
> `/plan-to-blueprint`는 `.docs/planning/`뿐 아니라 **`.docs/audit/`도 스캔**합니다.
> 감사 보고서의 🟡 항목은 블루프린트에 **정식 Priority 항목으로 등록**되어 `/develop`로 개발됩니다.
> 등록 완료된 보고서는 `.docs/archive/audit/`로 이동합니다.

---

## ✅ 감사 완료 체크리스트

- [ ] 기획서(Planning Doc)를 **처음부터** 읽었는가?
- [ ] 구현 코드를 **개발 컨텍스트 없이** 스캔했는가?
- [ ] 기획-코드 정합성 확인 완료
- [ ] UI/UX 표준 준수 확인 완료
- [ ] RLS/보안 검증 완료
- [ ] 빌드 및 코드 품질 확인 완료
- [ ] ⛔ **코드/DB/인프라를 일체 수정하지 않았는가?**
- [ ] 감사 보고서 `.docs/audit/`에 작성 완료

---

## 🔗 관련 문서
- `/plan-to-blueprint` — 감사 보고서의 🟡 항목을 블루프린트에 등록
- `.agent/skills/ui-gen/SKILL.md` — UI 표준 가이드
- `.agent/rules/bcl-portal.rules.md` — 프로젝트 규칙

