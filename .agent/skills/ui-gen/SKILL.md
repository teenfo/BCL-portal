---
name: ui-gen
description: BCL Portal의 프리미엄 Glassmorphism UI 컴포넌트를 생성하고 스타일링하는 스킬입니다.
---

# UI Generation Skill (ui-gen)

이 스킬은 BCL Portal의 디자인 시스템을 준수하여 시각적으로 프리미엄한 UI를 일관되게 생성하는 가이드를 제공합니다.

## 1. 디자인 원칙 (Design Principles)
- **Glassmorphism**: `backdrop-filter: blur(12px)`와 반투명 배경색(`rgba(255, 255, 255, 0.05)`)을 적극 활용합니다.
- **Premium Dark Mode**: 단순히 검정색(#000)이 아닌, 깊이감 있는 다크 그레이(`var(--bg-primary)`, `var(--bg-secondary)`)를 베이스로 사용합니다.
- **Vibrant Accent**: `var(--brand-primary)` (주로 오렌지색 계열)를 핵심 액션 요소에 사용하여 시선을 유도합니다.

## 2. 필수 스타일 토큰
컴포넌트 작성 시 다음 CSS 클래스 및 변수를 우선 사용합니다:
- `.premium-card`: Glassmorphism 효과가 적용된 컨테이너.
- `.badge-success`, `.badge-error`: 상태 표시용 배지.
- `var(--text-primary)`, `var(--text-secondary)`: 계층 구조가 명확한 텍스트 컬러.

## 3. 구현 체크리스트
- [ ] 컴포넌트에 `animate-fade-in` 등의 부드러운 전환 효과가 포함되었는가?
- [ ] 데이터 로딩 시 스켈레톤(Skeleton UI) 처리가 되어 있는가?
- [ ] 모바일 환경에서 터치 영역이 충분히 확보되었는가? (44x44px 이상)
- [ ] 고대비(High Contrast)를 유지하여 가독성이 확보되었는가?

## 4. 예시 코드 (React/Next.js)
```jsx
<div className="premium-card animate-fade-in">
  <h3 className="text-gradient">핵심 지표</h3>
  <div style={{ backdropFilter: 'blur(10px)', border: '1px solid var(--border-subtle)' }}>
    {/* Content */}
  </div>
</div>
```
