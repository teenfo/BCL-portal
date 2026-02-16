# BCL Portal 디자인 시스템

**Stitch Project ID**: `432557053076320380`  
**최종 업데이트**: 2026-02-17

---

## 📐 디자인 시스템 화면

### Design System Guide
- **Screen ID**: `47c9afc2adc94a14b435cc696b90d1dc`
- **Device Type**: Desktop (2560x2048)
- **생성일**: 2026-02-17
- **목적**: 전체 디자인 시스템 참조 가이드
- **프롬프트**: [design-system.md](../stitch-prompts/design-system.md)

**포함 요소**:
- ✅ 색상 팔레트 (Primary, Dark Mode, Semantic)
- ✅ 타이포그래피 계층 (H1~Body)
- ✅ Button Components (Primary, Secondary, Tertiary)
- ✅ Card Components (Glassmorphism)
- ✅ Form Elements (Input, Dropdown, Checkbox, etc.)
- ✅ Spacing System (4px grid)
- ✅ Icon Set

---

## 🎨 핵심 디자인 토큰

### 색상
```css
/* Brand */
--bcl-orange: #ff6a00;

/* Background */
--bg-primary: #1a1a1a;
--bg-surface: #262626;
--bg-elevated: #2d2d2d;

/* Border */
--border-subtle: #404040;
--border-default: rgba(255, 255, 255, 0.1);

/* Semantic */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Text */
--text-primary: #ffffff;
--text-secondary: #a3a3a3;
--text-disabled: #737373;
```

### 타이포그래피
```css
/* Font Family */
font-family: 'Lexend', sans-serif;

/* Font Weights */
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Font Sizes */
--text-h1: 32px;
--text-h2: 24px;
--text-h3: 20px;
--text-h4: 18px;
--text-large: 16px;
--text-base: 14px;
--text-small: 12px;
```

### 간격
```css
/* Spacing Scale (4px grid) */
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
```

### Border Radius
```css
--radius-sm: 4px;
--radius-default: 8px;  /* 기본값 */
--radius-lg: 12px;
--radius-full: 9999px;
```

---

## 🧩 컴포넌트 스타일 가이드

### Glassmorphism 카드
```css
.glass-card {
  background: rgba(38, 38, 38, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
```

### Primary Button
```css
.btn-primary {
  background: linear-gradient(135deg, #ff6a00 0%, #ff8533 100%);
  color: #ffffff;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
font-family: 'Lexend', sans-serif;
  box-shadow: 0 4px 14px 0 rgba(255, 106, 0, 0.39);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px 0 rgba(255, 106, 0, 0.5);
}
```

### Input Field
```css
.input-field {
  background: rgba(38, 38, 38, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px 16px;
  color: #ffffff;
  font-family: 'Lexend', sans-serif;
  transition: all 0.2s ease;
}

.input-field:focus {
  border-color: #ff6a00;
  box-shadow: 0 0 0 3px rgba(255, 106, 0, 0.1);
  outline: none;
}
```

---

## 📱 반응형 브레이크포인트

```css
/* Mobile First */
--breakpoint-sm: 640px;   /* Small devices */
--breakpoint-md: 768px;   /* Medium devices */
--breakpoint-lg: 1024px;  /* Large devices */
--breakpoint-xl: 1280px;  /* Extra large */
--breakpoint-2xl: 1536px; /* 2X Extra large */
```

---

## 🎯 사용 가이드

### 새 화면 생성 시
1. **Stitch 디자인 시스템 참조**: Screen ID `47c9afc2adc94a14b435cc696b90d1dc` 확인
2. **색상 사용**: 정확한 hex 값 사용 (#ff6a00, #1a1a1a 등)
3. **간격**: 4px grid 시스템 준수
4. **폰트**: Lexend 전용
5. **Border Radius**: 8px 기본값

### 컴포넌트 구현 시
1. `ui-gen` 스킬 사용하여 Glassmorphism 적용
2. 디자인 시스템 토큰 값 정확히 사용
3. 반응형 디자인 필수
4. 60fps 애니메이션 목표

### 일관성 검증
- QA 단계에서 디자인 시스템 화면과 비교
- 색상, 폰트, 간격, Border Radius 일치 확인
- Glassmorphism 효과 적용 여부 확인

---

## 🔗 참조 문서
- [Stitch 프롬프트](./../stitch-prompts/design-system.md)
- [UI Gen 스킬](../.agent/skills/ui-gen/SKILL.md)
- [Stitch 통합 가이드](../.antigravity/STITCH_INTEGRATION.md)

---

**Last Updated**: 2026-02-17  
**Owner**: BCL Portal Development Team
