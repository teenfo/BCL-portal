# BCL Portal – Admin 디자인 일관성 개선 기획서

> **Status**: Draft
> **Author**: Architect (Opus)
> **Created**: 2026-02-20
> **Last Updated**: 2026-02-20
> **Related**:
>   - `src/components/layout/AdminModal.tsx` (표준 모달 컴포넌트)
>   - `src/components/layout/AdminPageHeader.tsx` (표준 페이지 헤더 컴포넌트)
>   - `src/app/globals.css` (`.admin-action-btn`, `.admin-filter-btn` 정의)

---

## 1. 개요 및 배경

### 1.1 목적
BCL Portal Admin 영역은 다수의 개발자가 기능별로 분리하여 개발하면서 **공통 컴포넌트 미사용, 인라인 스타일 혼용, 버튼/모달/간격 패턴 불일관** 문제가 누적되었다. 이를 체계적으로 파악하고 표준 패턴으로 통일함으로써 유지보수성과 사용자 경험의 일관성을 확보하는 것이 목표이다.

### 1.2 Admin 디자인 표준 패턴 (기준)

| 항목 | 표준 | 위치 |
|------|------|------|
| 페이지 헤더 | `<AdminPageHeader category subtitle actions />` | `src/components/layout/AdminPageHeader.tsx` |
| 모달 | `<AdminModal isOpen onClose title size footer />` | `src/components/layout/AdminModal.tsx` |
| 주요 액션 버튼 | `.admin-action-btn` CSS 클래스 | `src/app/globals.css:1132` |
| 필터 버튼 | `.admin-filter-btn` / `.admin-filter-btn.active` | `src/app/globals.css:1074` |
| 카드 배경 | `bg-white/[0.02] border border-white/[0.03]` | 전역 패턴 |
| 카드 테두리 반경 | `rounded-2xl` (카드), `rounded-xl` (버튼/태그) | 전역 패턴 |
| 상태 색상 | `bg-{color}-500/10 border border-{color}-500/20 text-{color}-400` | 전역 패턴 |
| Tailwind 텍스트 투명도 | `text-white/30`, `text-white/50` | Tailwind 클래스 |

### 1.3 불일관성 분류

```
심각도   페이지                              문제 유형
🔴 HIGH  admin/setup/settings/page.tsx      인라인 모달 × 3 (zIndex 하드코딩)
🔴 HIGH  admin/members/[id]/page.tsx        AdminPageHeader 미사용, inline style × 32곳
🟡 MED   admin/setup/audit/page.tsx         인라인 모달 × 1
🟡 MED   admin/members/page.tsx             solid bg-green-500 버튼, rounded-3xl 혼용
🟡 MED   admin/memberships/page.tsx         raw color 클래스 버튼 직접 사용
🟢 LOW   admin/operations/badges/page.tsx   rounded-md 소형 버튼에서만 사용
```

---

## 2. 현황 분석 (As-Is)

### 2.1 AdminPageHeader 미사용 페이지

`AdminPageHeader`는 모든 Admin 페이지에 `category`, `title`, `subtitle`, `actions` 속성을 표준화하는 컴포넌트이다.

```tsx
// 표준 사용법
<AdminPageHeader
    category="Operations"
    title="일정 관리"
    subtitle="수업 일정을 생성하고 관리합니다"
    actions={<button className="admin-action-btn">+ 수업 등록</button>}
/>
```

**이탈 케이스 — `admin/members/[id]/page.tsx`**

멤버 프로필 블록을 자체 구현하여 상단에 배치:

```
┌─────────────────────────────────────────────────────────┐
│  [프로필 이미지]  이름  [상태뱃지]  [수정 버튼]           │
│                 Email / Tel / 성별 / 생년월일             │
│                                                [이용권 카드]│
└─────────────────────────────────────────────────────────┘
```

이 헤더는 커스텀 정보가 많아 AdminPageHeader로 완전 대체는 어렵지만, **뒤로가기 버튼, breadcrumb 네비게이션** 등 공통 요소가 빠져 있어 다른 Admin 페이지와 탐색 경험이 다르다.

**정상 케이스 — `admin/page.tsx`**: 단순 리다이렉트 페이지(`return null`), 헤더 불필요.

---

### 2.2 AdminModal 미사용 페이지

`AdminModal`은 `createPortal`로 z-index 충돌을 방지하고, `Escape` 키 닫기, backdrop 클릭 닫기, 콘텐츠 영역 제한 등을 표준화한다.

```tsx
// 표준 사용법
<AdminModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    title="항목 추가"
    size="md"
    footer={<button>저장</button>}
>
    {/* 모달 내용 */}
</AdminModal>
```

**이탈 케이스 1 — `admin/setup/settings/page.tsx`** (심각도 높음)

```tsx
// 인라인 모달 × 3개 — zIndex 하드코딩
<div className="fixed inset-0 flex items-center justify-center"
     style={{ zIndex: 10000 }}
     onClick={() => setCreatePathModal(null)}>

<div className="fixed inset-0 flex items-center justify-center"
     style={{ zIndex: 9999 }}
     onClick={() => setShowSaveModal(false)}>

<div className="fixed inset-0 flex items-center justify-center"
     style={{ zIndex: 9999 }}
     onClick={() => { if (!restoring) { setPreviewSnap(null); } }}>
```

문제점:
- `AdminModal`의 `createPortal`과 `zIndex` 관리 충돌 가능성
- backdrop blur, Escape 키 지원 없음
- 배경 dimming 방식 제각각

**이탈 케이스 2 — `admin/setup/audit/page.tsx`**

```tsx
// z-50 + bg-black/60 인라인 — AdminModal 미사용
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
     onClick={() => setSelectedLog(null)}>
```

backdrop 스타일이 다른 AdminModal과 다름 (`bg-black/60` vs AdminModal 내부 기준).

---

### 2.3 버튼 스타일 불일관

**표준 버튼 패턴 (`globals.css`)**:

```
.admin-action-btn  → var(--primary) 색상, border, uppercase tracking
.admin-filter-btn  → 비활성/활성 상태 토글
상태 버튼          → bg-{color}-500/10 border border-{color}-500/20 text-{color}-400
```

**이탈 케이스**:

| 페이지 | 줄 | 비표준 패턴 | 문제 |
|--------|-----|------------|------|
| `members/page.tsx` | 367 | `bg-green-500 text-white shadow-lg shadow-green-500/20` | Solid 색상 — 프로젝트 전체 유일 |
| `members/page.tsx` | 360 | `border border-red-500/20 text-red-400` raw 클래스 | `admin-filter-btn` 대신 직접 작성 |
| `members/[id]/page.tsx` | 692 | `rounded-md` + `style={{ border: '1px solid rgba(255,107,0,0.25)' }}` | 인라인 border + 비표준 rounded |
| `memberships/page.tsx` | 489 | `bg-blue-500/20 border border-blue-500/30 text-blue-400` raw 클래스 | 상태 패턴 직접 작성 |

---

### 2.4 inline style vs Tailwind 불일관

`admin/members/[id]/page.tsx`는 Tailwind 클래스 대신 인라인 스타일을 32곳에서 사용:

```tsx
// 이탈: inline style
style={{ color: 'rgba(255,255,255,0.3)' }}
style={{ color: 'rgba(255,255,255,0.5)' }}
style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}

// 표준: Tailwind 클래스
className="text-white/30"
className="text-white/50"
className="bg-white/[0.02] border border-white/[0.05]"
```

---

### 2.5 `rounded` 크기 불일관

Admin 표준: `rounded-xl` (버튼/태그), `rounded-2xl` (카드)

| 비표준 rounded | 위치 | 개수 | 판단 |
|---------------|------|------|------|
| `rounded-3xl` | `members/page.tsx` | 1 | ⚠️ 이탈 — 카드가 아닌 행 요소에 사용 |
| `rounded-md` | `members/[id]/page.tsx`, `badges/page.tsx` | 4 | ⚠️ 이탈 — 일반 버튼에 사용 |
| `rounded-sm` | `operations/schedule/page.tsx` | 2 | ✅ 허용 — 캘린더 셀 특수 컨텍스트 |
| `rounded-lg` | 여러 페이지 | 101 | ✅ 소형 태그에서 허용 패턴 |

---

## 3. 개선 설계 (To-Be)

### 3.1 수정 원칙

```
규칙 1: 모든 Admin 페이지는 AdminPageHeader를 사용한다
         → 단, 특수 레이아웃(members/[id] 같은 프로필 뷰)은 AdminPageHeader를
           breadcrumb 네비게이션 용도로 상단에 보조 배치한다.

규칙 2: 모든 Admin 모달은 AdminModal 컴포넌트를 사용한다
         → fixed inset-0 인라인 모달을 완전 제거한다.

규칙 3: 버튼은 admin-action-btn, admin-filter-btn, 상태 클래스(opacity 변형) 중 선택한다
         → solid bg-{color}-500 버튼은 사용하지 않는다.

규칙 4: Tailwind 투명도 클래스를 사용한다
         → style={{ color: 'rgba(...)' }} → text-white/{n} 으로 변환

규칙 5: rounded는 rounded-xl (버튼) / rounded-2xl (카드) 를 기본으로 한다
```

### 3.2 `admin/members/[id]/page.tsx` 개선 방향

현재의 커스텀 프로필 헤더를 유지하되, **뒤로가기 네비게이션 행**을 상단에 추가:

```
┌─────────────────────────────────────────────────────────┐
│ ← Members  /  홍길동                         [admin-nav] │  ← 추가
├─────────────────────────────────────────────────────────┤
│  [프로필 이미지]  이름  [상태뱃지]  [수정 버튼]           │  ← 기존 유지
│                 Email / Tel / 성별 / 생년월일             │
│                                            [이용권 카드] │
└─────────────────────────────────────────────────────────┘
```

또한 `style={{ color: 'rgba(255,255,255,0.3)' }}` 32곳을 `text-white/30` 등 Tailwind 클래스로 일괄 치환.

### 3.3 `admin/setup/settings/page.tsx` 개선 방향

```tsx
// Before
<div className="fixed inset-0 flex items-center justify-center"
     style={{ zIndex: 10000 }}
     onClick={() => setCreatePathModal(null)}>
  <div onClick={e => e.stopPropagation()}>
    {/* 내용 */}
  </div>
</div>

// After
<AdminModal
    isOpen={!!createPathModal}
    onClose={() => setCreatePathModal(null)}
    title="경로 생성"
    size="md"
>
    {/* 내용 */}
</AdminModal>
```

3개의 인라인 모달 → `AdminModal` 3개로 교체.

### 3.4 `admin/members/page.tsx` 승인 버튼 개선

```tsx
// Before — solid bg-green-500 (유일한 케이스)
<button className="px-6 py-2.5 rounded-xl bg-green-500 text-white text-[10px] font-black
                   uppercase tracking-widest hover:scale-105 transition-all
                   shadow-lg shadow-green-500/20">
  승인
</button>

// After — 상태 opacity 패턴으로 통일
<button className="px-6 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30
                   text-green-400 text-[10px] font-black uppercase tracking-widest
                   hover:bg-green-500/25 transition-all">
  승인
</button>
```

---

## 4. 영향 범위

| 파일 | 변경 유형 | 수정 항목 수 |
|------|-----------|:-----------:|
| `admin/setup/settings/page.tsx` | 인라인 모달 → AdminModal | 3개 모달 |
| `admin/members/[id]/page.tsx` | breadcrumb 추가, inline style → Tailwind | 32곳 |
| `admin/setup/audit/page.tsx` | 인라인 모달 → AdminModal | 1개 모달 |
| `admin/members/page.tsx` | 승인 버튼 색상, rounded-3xl → rounded-2xl | 2곳 |
| `admin/memberships/page.tsx` | 토글 버튼 raw 클래스 → 상태 패턴 | 3곳 |
| `admin/operations/badges/page.tsx` | rounded-md → rounded-xl | 2곳 |

---

## 5. 구현 단계

### Phase 1: 고위험 모달 수정
> **담당**: 💻 Developer (Sonnet) | **공수**: 반나절

| # | 작업 | 상세 |
|---|------|------|
| 1-1 | `setup/settings` 인라인 모달 3개 → AdminModal 교체 | zIndex 하드코딩 제거 |
| 1-2 | `setup/audit` 인라인 모달 1개 → AdminModal 교체 | backdrop 스타일 통일 |

### Phase 2: members/[id] 개선
> **담당**: 💻 Developer (Sonnet) | **공수**: 반나절

| # | 작업 | 상세 |
|---|------|------|
| 2-1 | 상단 breadcrumb 네비게이션 추가 | `← Members / {name}` 형태 |
| 2-2 | inline style 32곳 → Tailwind 클래스 일괄 치환 | `rgba(255,255,255,0.3)` → `text-white/30` 등 |
| 2-3 | `rounded-md` → `rounded-xl` 치환 | 4곳 |

### Phase 3: 버튼 스타일 통일
> **담당**: 💻 Developer (Sonnet) | **공수**: 2시간

| # | 작업 | 상세 |
|---|------|------|
| 3-1 | `members/page.tsx` 승인 버튼 solid → opacity 패턴 | 1곳 |
| 3-2 | `memberships/page.tsx` 토글 버튼 raw 클래스 정리 | 3곳 |
| 3-3 | `badges/page.tsx` rounded-md → rounded-xl | 2곳 |

### Phase 4: 문서 및 린트 규칙 추가
> **담당**: 🏛️ Architect (Opus) | **공수**: 1시간

| # | 작업 | 상세 |
|---|------|------|
| 4-1 | Admin 디자인 가이드 문서 작성 | `.docs/` 내 컴포넌트 사용 가이드 |
| 4-2 | ESLint 규칙 검토 | `no-inline-styles` 유사 규칙 적용 가능성 검토 |

---

## 6. 테스트 시나리오

### 정상 흐름
1. `setup/settings` 페이지에서 경로 생성/저장/복원 모달이 AdminModal 형태로 정상 열림/닫힘
2. `setup/audit` 로그 상세 모달이 AdminModal로 Escape 키 닫기 지원
3. `members/[id]` 페이지 상단에 breadcrumb 네비게이션 표시 및 Members 목록으로 복귀 동작

### 회귀 방지
1. 기존 모달 내 폼 데이터가 AdminModal 교체 후에도 정상 동작 (저장/취소)
2. inline style 제거 후 시각적 차이 없음 (동일한 투명도 값)
3. 승인 버튼 hover/focus 상태 정상 동작

---

## 7. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| `setup/settings` 모달 내부 로직 복잡 (createPath, snapshot) | 교체 중 기능 깨짐 | 한 번에 1개씩 교체, 각 교체 후 즉시 테스트 |
| `members/[id]` inline style 32곳 일괄 치환 | 시각적 회귀 가능성 | rgba 값과 Tailwind 클래스 대응표 작성 후 치환 |
| AdminModal size prop 제한 | 기존 인라인 모달보다 좁을 수 있음 | `size="lg"` 또는 `width` prop으로 조절 |

---

## 8. Planning Log

### Session 1 — 2026-02-20
- **작성 범위**: 섹션 1~7 전체 (초안)
- **분석 방법**: 전체 Admin page.tsx 파일 대상 grep 패턴 분석
- **Status**: Draft
- **메모**:
  - 불일관성의 90%가 Admin 포털에 집중, User App / Coach / Class는 포털 내 일관성 양호
  - `setup/settings`가 가장 복잡한 케이스 (zIndex 10000 하드코딩)
  - `members/[id]`는 32곳 inline style로 가장 많은 수정이 필요
  - Phase별 수정 순서: 모달(위험) → 헤더/스타일(안전) → 버튼 → 문서
- **TODO (다음 세션)**:
  - [ ] Phase 1 실행 (setup/settings, setup/audit AdminModal 교체)
  - [ ] Phase 2 실행 (members/[id] breadcrumb + Tailwind 치환)
  - [ ] 수정 후 Admin 전체 페이지 시각 회귀 확인

---
**문서 버전**: 0.1.0 (Draft)
**최종 업데이트**: 2026-02-20
