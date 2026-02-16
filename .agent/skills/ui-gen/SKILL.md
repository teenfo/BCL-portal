---
name: ui-gen
description: BCL Portal의 프리미엄 Glassmorphism UI 컴포넌트를 생성하고 스타일링하는 스킬입니다.
---

# UI Generation Skill (ui-gen)

이 스킬은 BCL Portal의 디자인 시스템을 준수하여 시각적으로 프리미엄한 UI를 일관되게 생성하는 가이드를 제공합니다.

## 📐 공식 디자인 시스템 참조 ⭐

**BCL Portal Design Specifications**:
- **Stitch Screen ID**: `95b2195d8ffb4e99af97d0da938f24ff`
- **위치**: `.docs/stitch-screens-mapping.md` 참조
- **스크린샷**: [View Design System](https://lh3.googleusercontent.com/aida/AOfcidVwih63roj86ClbGe12IOFrCSBJJ-GzohWrGS72_8O_lQf0AT8kTdgL6sveHwM1hMfkv7vF1XoYyMRWEErZeyxBvvvD8oXWKBltWKMQdC9laZC9SDjoXczrhU7vGXH4hzRHHj2wQiroOK-ZekCLLMtmDBlAaNrh79BTv-H1GJ1z3WjPuOCA8k0QZX1wh2FFV_Q2pCrf9DQWhEB8YhdeZ2bfDOvE8bWikOpCgwOBtWsYUm8rpqjhLSpVEg)

**포함 내용**: 색상, 타이포, 간격, 컴포넌트, 그림자, 애니메이션 등 모든 디자인 요소

---

## 1. 디자인 원칙 (Design Principles)

### 1-1. Glassmorphism (유리 형태)
```css
.premium-card {
  background: rgba(38, 38, 38, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
```

### 1-2. Premium Dark Mode
- ❌ 단순 검정색 `#000000`
- ✅ 깊이감 있는 차콜 `#1A1A1A` (background)
- ✅ 서페이스 `#262626` (cards)
- ✅ Elevated `#2D2D2D` (modals, hover)

### 1-3. Vibrant Accent (BCL Orange)
- Primary: `#FF6B00`
- 사용처: CTA 버튼, 활성 상태, 포인트 컬러

---

## 2. 디자인 토큰 (Design Tokens)

**디자인 시스템 참조**: Screen `95b2195d8ffb4e99af97d0da938f24ff`

### 2-1. Colors (Dark Mode)
```css
:root {
  /* Primary */
  --primary: #FF6B00;           /* BCL Orange */
  
  /* Backgrounds */
  --background: #1A1A1A;        /* Deep Charcoal */
  --surface: #262626;           /* Cards */
  --surface-elevated: #2D2D2D;  /* Modals, Hover */
  
  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #B0B0B0;
  --text-disabled: #666666;
  
  /* Borders */
  --border: #333333;
  
  /* Semantic */
  --success: #7ED321;
  --warning: #FFA500;
  --error: #E94D4D;
}
```

### 2-2. Typography (Lexend Font)
```css
:root {
  /* Font Family */
  --font-primary: 'Lexend', sans-serif;
  
  /* Font Sizes */
  --text-h1: 32px;
  --text-h2: 24px;
  --text-h3: 20px;
  --text-body: 16px;
  --text-small: 14px;
  --text-caption: 12px;
  
  /* Font Weights */
  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;
}
```

### 2-3. Spacing (8px Grid)
```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
}
```

### 2-4. Border Radius
```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;    /* Standard */
  --radius-lg: 12px;
  --radius-full: 9999px;  /* Pills, Badges */
}
```

### 2-5. Shadows (Glassmorphism)
```css
:root {
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.4);
  
  /* Glassmorphism blur */
  --blur-sm: 8px;
  --blur-md: 12px;
  --blur-lg: 16px;
}
```

---

## 3. 필수 컴포넌트 스타일

### 3-1. Button
```tsx
// Primary Button (CTA)
<button className="btn-primary">
  Book Class
</button>

// CSS
.btn-primary {
  background: linear-gradient(135deg, #FF6B00 0%, #FF8A3D 100%);
  color: var(--text-primary);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  box-shadow: var(--shadow-md);
  transition: transform 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

### 3-2. Card (Glassmorphism)
```tsx
<div className="premium-card">
  <h3>Card Title</h3>
  <p>Content</p>
</div>

// CSS
.premium-card {
  background: rgba(38, 38, 38, 0.8);
  backdrop-filter: blur(var(--blur-md));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}
```

### 3-3. Badge/Pill
```tsx
<span className="badge-success">Active</span>
<span className="badge-error">Expired</span>

// CSS
.badge-success {
  background: rgba(126, 211, 33, 0.2);
  color: var(--success);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--text-small);
}
```

---

## 4. 구현 체크리스트

UI 컴포넌트를 만들 때 다음을 확인하세요:

- [ ] **디자인 토큰 사용**: 하드코딩된 색상/간격 없음
- [ ] **Glassmorphism 효과**: Card, Modal 등에 적용
- [ ] **8px Grid 준수**: 모든 간격이 8의 배수
- [ ] **BCL Orange 포인트**: 중요한 CTA에만 사용
- [ ] **Animations**: `animate-fade-in`, `hover:` 효과 포함
- [ ] **Skeleton UI**: 로딩 상태 처리
- [ ] **Touch Target**: 모바일 터치 영역 44x44px 이상
- [ ] **High Contrast**: 가독성 확보 (WCAG AA 이상)
- [ ] **Responsive**: 모바일 우선 디자인
- [ ] **Dark/Light 모드**: 양쪽 모두 동작

---

## 5. 예시 코드

### 5-1. Premium Card with Stats
```tsx
import { Card } from '@/components/ui/card'

export function StatsCard({ title, value, change }) {
  return (
    <Card className="premium-card animate-fade-in">
      <h3 className="text-gradient" style={{
        fontSize: 'var(--text-h3)',
        fontWeight: 'var(--weight-bold)',
        marginBottom: 'var(--spacing-sm)'
      }}>
        {title}
      </h3>
      
      <div className="flex items-center justify-between">
        <p className="text-4xl font-bold" style={{
          color: 'var(--text-primary)'
        }}>
          {value}
        </p>
        
        <span className={`badge ${change >= 0 ? 'badge-success' : 'badge-error'}`}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
      </div>
    </Card>
  )
}
```

### 5-2. Bottom Navigation (Mobile)
```tsx
export function BottomNav({ activeTab }) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      width: '100%',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      padding: 'var(--spacing-sm) 0'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'tab-active' : 'tab-inactive'}
          style={{
            flex: 1,
            padding: 'var(--spacing-md)',
            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
```

---

## 📚 추가 참조

- **공식 디자인 시스템**: Stitch Screen `95b2195d8ffb4e99af97d0da938f24ff`
- **Stitch 통합 가이드**: `.antigravity/STITCH_INTEGRATION.md`
- **UI 개발 워크플로우**: `.antigravity/workflows/ui-development.md`
- **Screen Mapping**: `.docs/stitch-screens-mapping.md`

---

## ⚠️ 주의사항

### DO ✅
- 디자인 토큰 사용 (CSS 변수)
- Glassmorphism 효과 활용
- 8px Grid 시스템 준수
- 공식 디자인 시스템 참조

### DON'T ❌
- 하드코딩된 색상/간격 사용
- Stitch HTML 직접 복사
- 디자인 시스템 무시
- 일관성 없는 개별 스타일링
