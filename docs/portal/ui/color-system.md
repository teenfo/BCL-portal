# BCL Portal Color System v2
(Sample-Optimized Aesthetic)

## 1) 목적
- 색상 값을 직접 쓰지 않고(팔레트/hex), 의미 기반 토큰(semantic tokens)으로 통일한다.
- Light/Dark 모두 동일한 컴포넌트 클래스로 테마 전환이 가능해야 한다.

## 2) 정본 파일
- `portal/assets/theme/colors.css` : CSS 변수 토큰 (Light/Dark)
- `portal/assets/theme/tailwind-config.js` : Tailwind CDN용 토큰 매핑
- 본 문서: 사용 규칙 & 치환 가이드

## 3) HTML에 포함 순서(권장)
```html
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<script src="/assets/theme/tailwind-config.js"></script>
<link rel="stylesheet" href="/assets/theme/colors.css" />
```

## 4) 직접 색상 클래스 금지
금지 예:
- `bg-white`, `bg-gray-100`, `text-gray-800`, `border-gray-200`, `text-navy`
- 임의 HEX/rgba를 class/style에 직접 지정

허용 예(토큰):
- `bg-bg`, `bg-surface`, `bg-surface2`
- `text-fg`, `text-muted`, `text-subtle`
- `border-border`
- `text-primary`, `bg-primary`, `bg-primarySoft`, `bg-primaryHover`

## 5) 치환 규칙(자주 쓰는 패턴)
- `bg-white` → `bg-surface`
- `bg-gray-50/100` → `bg-bg` 또는 `bg-surface2`
- `text-gray-900/800/navy` → `text-fg`
- `text-gray-600/500` → `text-muted`
- `text-gray-400` → `text-subtle`
- `border-gray-100/200` → `border-border`

## 6) 컴포넌트 표준 클래스
### Page Root
- `class="bg-bg min-h-screen text-fg"`

### Card
- `class="bg-surface border border-border rounded-3xl shadow-card"`

### Input / Search Bar
- `class="bg-surface2 border border-border rounded-2xl text-fg placeholder:text-subtle"`

### Tabs / Chips
- 기본: `bg-surface2 text-muted font-medium rounded-2xl px-4 py-2`
- 활성: `bg-primary text-onPrimary font-semibold rounded-2xl px-4 py-2`

### Primary Button / FAB
- `class="bg-primary text-onPrimary hover:bg-primaryHover transition-colors"`

### Accent Icon Background
- `class="bg-primarySoft text-primary"`

## 7) Status Badge (ACTIVE/EXPIRED/PENDING)
- ACTIVE:
  - `bg-successSoft text-success font-bold rounded-pill px-3 py-1 text-xs`
- EXPIRED:
  - `bg-dangerSoft text-danger font-bold rounded-pill px-3 py-1 text-xs`
- PENDING/NEUTRAL:
  - `bg-surface2 text-subtle font-bold rounded-pill px-3 py-1 text-xs`

## 8) Dark Mode
- `<html class="dark">` 또는 `<body class="dark">`로 다크 적용
- 다크 토큰은 Iron Pulse 톤(딥 슬레이트 bg + 블루슬레이트 카드 + 오렌지 포인트)
