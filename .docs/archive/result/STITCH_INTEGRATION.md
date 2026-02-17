# Stitch Integration Guide for BCL Portal

## 📌 Overview

Stitch MCP는 BCL Portal의 **디자인 참조 생성 도구**로 활용됩니다.
전체 화면을 Stitch에서 생성하는 것이 아니라, **필요한 디자인 참조만 선택적으로 생성**합니다.

### ⚠️ Stitch 사용 시 한계점

- ✅ 디자인 시스템, 컬러, 타이포그래피 정의에 탁월
- ✅ 초기 레이아웃 구조 시각화에 유용
- ❌ 여러 화면 생성 시 **일관성 유지 어려움**
- ❌ 세밀한 컴포넌트 재사용 구조 표현 제한적

---

## 🎯 Stitch 활용 전략

### 1. **디자인 시스템 정의** (1회성)

**공식 디자인 시스템** ⭐:
- **Screen ID**: `95b2195d8ffb4e99af97d0da938f24ff`
- **Title**: BCL Portal Design Specifications
- **내용**: 색상, 타이포그래피, 컴포넌트, 간격, 그림자, 애니메이션 등 모든 디자인 요소
- **스크린샷**: [View](https://lh3.googleusercontent.com/aida/AOfcidVwih63roj86ClbGe12IOFrCSBJJ-GzohWrGS72_8O_lQf0AT8kTdgL6sveHwM1hMfkv7vF1XoYyMRWEErZeyxBvvvD8oXWKBltWKMQdC9laZC9SDjoXczrhU7vGXH4hzRHHj2wQiroOK-ZekCLLMtmDBlAaNrh79BTv-H1GJ1z3WjPuOCA8k0QZX1wh2FFV_Q2pCrf9DQWhEB8YhdeZ2bfDOvE8bWikOpCgwOBtWsYUm8rpqjhLSpVEg)

추가 참조 화면:
- **Dark Mode Tokens**: `b2ddc51f0287441e9b1fda66e40d038e`
- **Light Mode Tokens**: `4d1547c666494965bdac8b3a144e24a5`

**사용 방법**:
- ✅ CSS 변수 정의 시 공식 디자인 시스템 참조
- ✅ 컴포넌트 스타일링 가이드로 활용
- ✅ 디자인 토큰 추출 및 코드화
- ✅ 개발-디자인 간 소통 도구

### 2. **핵심 레이아웃 템플릿** (소수만 생성)

이미 생성된 템플릿:
- Mobile App (Dark/Light)
- Desktop Admin (Dark/Light)
- Auth Layout (Dark/Light)
- Fullscreen Display (Dark/Light)

**사용 방법**:
- 새로운 화면 개발 시 해당 템플릿 참조
- 네비게이션 구조, 간격 시스템 확인
- **코드로 구현 시 베이스 구조로 활용**

### 3. **참조 이미지가 필요한 경우에만 생성**

**생성 기준**:
- ✅ 복잡한 데이터 시각화 (차트, 그래프)
- ✅ 특수한 인터랙션 패턴 (QR 스캔, 타이머)
- ✅ 신규 기능의 UX 플로우 검증
- ❌ 일반적인 CRUD 화면 (템플릿으로 충분)
- ❌ 기존 화면과 유사한 패턴

**생성 후 처리**:
1. Stitch에서 디자인 생성
2. 스크린샷을 `.docs/design-references/` 저장
3. Screen ID를 매핑 문서에 기록
4. **코드로 실제 구현** (Stitch HTML 직접 사용 ❌)

---

## 📂 현재 생성된 Stitch 화면 현황

### Design Systems (2개)
- [x] Dark Mode Design Tokens
- [x] Light Mode Design Tokens

### Layout Templates (8개)
- [x] Mobile App (Dark/Light)
- [x] Desktop Admin (Dark/Light)
- [x] Auth (Dark/Light)
- [x] Fullscreen Display (Dark/Light)

### Sample Screens (참조용, 약 15개)
- [x] Login (Dark)
- [x] Home Dashboard (Dark)
- [x] Admin Dashboard (Dark)
- [x] Schedule & Booking (Dark)
- [x] QR Check-in (Dark)
- [x] Members Management (Dark)
- [x] Class Schedule Admin (Dark)
- [x] Financial Reports (Dark)
- [x] CRM & Announcements (Dark)
- [x] Profile (Dark)
- [x] Facilities Guide (Dark)
- [x] Workout Records (Dark)
- [x] Kiosk Idle Screen (Dark)
- [x] TV Leaderboard (Dark)
- [x] TV WOD Timer (Dark)

**전체 매핑**: `.docs/stitch-screens-mapping.md` 참조

---

## 🛠️ 실제 개발 워크플로우

### Step 1: 디자인 확인
```markdown
1. `.docs/stitch-screens-mapping.md`에서 유사한 화면 찾기
2. 해당 Screen ID로 Stitch에서 참조 이미지 확인
3. 없으면 → 가장 유사한 템플릿 사용
4. 특수 케이스만 → 새로 Stitch 생성
```

### Step 2: 코드 구현 (UI Skill 활용)
```bash
# ui-gen skill 사용 (Glassmorphism 가이드 포함)
# 실제 React/Next.js 컴포넌트로 개발
```

**참조 문서**:
- `.agent/skills/ui-gen/SKILL.md` - Glassmorphism 디자인 가이드
- Design System 화면 - 색상, 타이포, 간격 토큰
- Layout Template 화면 - 구조 및 네비게이션

### Step 3: 일관성 검증
```markdown
- 동일한 컴포넌트 재사용 확인
- 디자인 토큰 사용 확인 (하드코딩된 색상 ❌)
- 간격 시스템 준수 (8px grid)
```

---

## 📸 디자인 참조 이미지 저장

새로운 Stitch 화면 생성 시:

1. **스크린샷 저장**:
   ```
   .docs/design-references/
   ├── auth/
   │   ├── login-dark.png
   │   └── signup-dark.png
   ├── user-app/
   │   ├── home-dashboard-dark.png
   │   └── schedule-dark.png
   ├── admin/
   │   ├── dashboard-dark.png
   │   └── members-dark.png
   └── display/
       ├── kiosk-idle-dark.png
       └── leaderboard-dark.png
   ```

2. **매핑 문서 업데이트**:
   ```markdown
   ### Screen Name
   - **Screen ID**: `abc123...`
   - **Screenshot**: `[View](.docs/design-references/path/to/image.png)`
   - **Purpose**: 디자인 참조용
   - **Implementation**: `src/app/path/to/page.tsx`
   ```

---

## 🔄 Stitch 화면 ID 조회 방법

필요 시 MCP로 조회:

```typescript
// 전체 화면 목록 조회
mcp_StitchMCP_list_screens({
  projectId: "432557053076320380"
})

// 특정 화면 상세 조회
mcp_StitchMCP_get_screen({
  projectId: "432557053076320380",
  screenId: "abc123...",
  name: "projects/432557053076320380/screens/abc123..."
})
```

---

## ✅ Best Practices

### DO ✅
- Design System과 Layout Template을 기준으로 삼기
- 특수 화면만 Stitch에서 생성
- 생성된 화면은 "참조용 이미지"로만 활용
- 실제 구현은 코드로 (컴포넌트 재사용)
- ui-gen skill의 Glassmorphism 가이드 준수

### DON'T ❌
- 모든 화면을 Stitch에서 생성하려고 하지 않기
- Stitch HTML을 그대로 복사해서 사용 ❌
- 일관성 없는 여러 버전의 같은 화면 생성
- 디자인 토큰 무시하고 하드코딩

---

## 📚 관련 문서

- **Design System**: Stitch Screen `b2ddc51f0287441e9b1fda66e40d038e` (Dark)
- **UI Skill**: `.agent/skills/ui-gen/SKILL.md`
- **Screen Mapping**: `.docs/stitch-screens-mapping.md`
- **Sitemap**: `.docs/sitemap/README.md`

---

**마지막 업데이트**: 2026-02-17
**전략**: Stitch = 디자인 참조 도구 (선택적 사용)
