# UI Development Workflow

BCL Portal의 UI 개발 워크플로우입니다.

---

## 🎨 1. 디자인 확인

새로운 화면을 개발하기 전:

### 1-1. 공식 디자인 시스템 참조 ⭐
**BCL Portal Design Specifications** (필수 참조):
- **Screen ID**: `95b2195d8ffb4e99af97d0da938f24ff`
- **위치**: [Stitch 화면](https://lh3.googleusercontent.com/aida/AOfcidVwih63roj86ClbGe12IOFrCSBJJ-GzohWrGS72_8O_lQf0AT8kTdgL6sveHwM1hMfkv7vF1XoYyMRWEErZeyxBvvvD8oXWKBltWKMQdC9laZC9SDjoXczrhU7vGXH4hzRHHj2wQiroOK-ZekCLLMtmDBlAaNrh79BTv-H1GJ1z3WjPuOCA8k0QZX1wh2FFV_Q2pCrf9DQWhEB8YhdeZ2bfDOvE8bWikOpCgwOBtWsYUm8rpqjhLSpVEg)
- **매핑 문서**: `.docs/stitch-screens-mapping.md`

**포함 내용**:
- ✅ 색상 팔레트 (Primary, Surface, Text, Semantic colors)
- ✅ 타이포그래피 스케일 (Lexend font, 6 levels)
- ✅ 간격 시스템 (8px grid)
- ✅ 컴포넌트 스타일 (Button, Card, Input, Badge 등)
- ✅ 그림자 및 Glassmorphism 효과
- ✅ 애니메이션 타이밍

### 1-2. 유사 화면 찾기
```markdown
1. `.docs/sitemap/README.md`에서 해당 화면의 기획 확인
2. `.docs/stitch-screens-mapping.md`에서 유사한 참조 화면 찾기
3. 해당 템플릿 카테고리 확인:
   - Mobile App → `d97f6e555b434791906bb1203c9b48f6` (Dark)
   - Desktop Admin → `59fa62844a9449459c2678c734be4d1a` (Dark)
   - Auth → `f135d9e6a7c346a69bb25aac647f67f8` (Dark)
   - Display → `a5902b8e809644f08fcb79e62d4157e5` (Dark)
```

### 1-3. 디자인 참조 이미지 확인
- `.docs/design-references/` 폴더에서 스크린샷 확인
- 없으면 Stitch 웹에서 해당 Screen ID로 확인

### 1-4. 새로운 참조 생성 필요 시
**생성 조건** (다음 중 하나):
- ✅ 복잡한 데이터 시각화 (차트, 대시보드)
- ✅ 특수한 인터랙션 (QR 스캔, 타이머, 애니메이션)
- ✅ 완전히 새로운 UX 패턴
- ❌ 일반적인 리스트/폼/상세 화면 → 템플릿으로 충분

**생성 방법**:
```bash
# Stitch 웹 UI에서 직접 생성 (빠름)
# 또는 MCP 사용:
mcp_StitchMCP_generate_screen_from_text({
  projectId: "432557053076320380",
  deviceType: "MOBILE" | "DESKTOP",
  prompt: "..."
})
```

---

## 💻 2. 코드 구현

### 2-1. UI Skill 활용 (Glassmorphism)
```bash
# .agent/skills/ui-gen/SKILL.md 참조
# BCL Portal의 프리미엄 Glassmorphism 디자인 시스템
```

**필수 요소**:
- ✅ 다크/라이트 모드 대응
- ✅ 8px 그리드 시스템
- ✅ BCL Orange (#FF6B00) 포인트 컬러
- ✅ Glassmorphism 카드 스타일
- ✅ Lexend 폰트

### 2-2. 디자인 토큰 사용

**공식 디자인 시스템 참조**: Screen `95b2195d8ffb4e99af97d0da938f24ff`

```css
/* ❌ 하드코딩 (절대 금지) */
background: #262626;
color: #FFFFFF;
font-size: 16px;
padding: 16px;

/* ✅ 디자인 토큰 사용 (권장) */
background: var(--surface);
color: var(--text-primary);
font-size: var(--text-body);
padding: var(--spacing-md);
```

**디자인 토큰 정의 예시** (from Design Specifications):
```css
:root {
  /* Colors - Dark Mode */
  --primary: #FF6B00;           /* BCL Orange */
  --background: #1A1A1A;        /* Deep Charcoal */
  --surface: #262626;           /* Card background */
  --surface-elevated: #2D2D2D;  /* Modal, hover */
  --text-primary: #FFFFFF;
  --text-secondary: #B0B0B0;
  --border: #333333;
  
  /* Typography - Lexend */
  --text-h1: 32px;
  --text-h2: 24px;
  --text-h3: 20px;
  --text-body: 16px;
  --text-small: 14px;
  --text-caption: 12px;
  
  /* Spacing - 8px Grid */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Shadows - Glassmorphism */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

**참조 화면**:
- **공식 디자인 시스템**: `95b2195d8ffb4e99af97d0da938f24ff`
- Dark Mode Tokens: `b2ddc51f0287441e9b1fda66e40d038e`
- Light Mode Tokens: `4d1547c666494965bdac8b3a144e24a5`

### 2-3. 컴포넌트 재사용
```tsx
// Bad ❌: 각 화면마다 새로운 버튼
<button className="bg-orange-500 ...">

// Good ✅: 공통 컴포넌트 재사용
import { Button } from '@/components/ui/button'
<Button variant="primary">
```

---

## 🔍 3. 일관성 검증

### 3-1. 체크리스트
- [ ] 디자인 토큰 사용 (하드코딩 색상 없음)
- [ ] 8px 그리드 준수
- [ ] 공통 컴포넌트 재사용
- [ ] 다크/라이트 모드 모두 동작
- [ ] 반응형 디자인 (모바일 우선)
- [ ] 접근성 기준 충족 (ARIA, keyboard nav)

### 3-2. 비교 확인
```markdown
1. 참조 이미지와 구현 결과 비교
2. 다른 화면과의 일관성 확인
3. 디자인 시스템 준수 확인
```

---

## 📸 4. 참조 이미지 저장 (필요시)

새로운 Stitch 화면 생성 시:

```bash
# 1. Stitch에서 스크린샷 다운로드
# 2. 저장 위치
.docs/design-references/
├── auth/[화면명]-[테마].png
├── user-app/[화면명]-[테마].png
├── admin/[화면명]-[테마].png
└── display/[화면명]-[테마].png

# 3. 매핑 문서 업데이트
# .docs/stitch-screens-mapping.md
```

---

## 🚀 5. 배포 전 최종 확인

### 5-1. 빌드 검증
```bash
npm run build
# 빌드 에러 없음 확인
```

### 5-2. 디자인 QA
- [ ] 모든 화면이 디자인 시스템 준수
- [ ] 색상, 간격, 타이포 일관성
- [ ] 다크/라이트 모드 전환 이슈 없음
- [ ] 반응형 레이아웃 정상 동작

### 5-3. 접근성 검증
```bash
# Lighthouse 또는 axe DevTools 사용
npm run test:a11y
```

---

## 📚 관련 문서

- **Stitch 통합**: `.antigravity/STITCH_INTEGRATION.md`
- **UI Skill**: `.agent/skills/ui-gen/SKILL.md`
- **Design System**: Stitch Screen `b2ddc51f0287441e9b1fda66e40d038e`
- **Sitemap**: `.docs/sitemap/README.md`

---

## 💡 Best Practices

### DO ✅
- Stitch를 디자인 **참조**로만 활용
- 코드로 직접 구현 (컴포넌트 재사용)
- 디자인 토큰과 공통 컴포넌트 사용
- 일관성 검증 프로세스 준수

### DON'T ❌
- Stitch HTML을 그대로 복사 붙여넣기
- 모든 화면을 Stitch에서 생성
- 하드코딩된 색상/간격 사용
- 일관성 없는 개별 스타일링

---

**마지막 업데이트**: 2026-02-17
