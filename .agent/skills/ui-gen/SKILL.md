---
name: ui-gen
description: BCL Portal의 프리미엄 Glassmorphism UI 컴포넌트를 생성하고 스타일링하는 스킬입니다.
---

# UI Generation Skill (ui-gen)

이 스킬은 BCL Portal의 디자인 시스템을 준수하여 시각적으로 프리미엄한 UI를 일관되게 생성하는 가이드를 제공합니다.

---

## 📐 공식 디자인 시스템 참조 ⭐

**BCL Portal Design Specifications**:
- **Stitch Screen ID**: `95b2195d8ffb4e99af97d0da938f24ff`
- **위치**: `.docs/stitch-screens-mapping.md` 참조

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
- ✅ 깊이감 있는 배경 `#0D0D0E` (body background)
- ✅ 서페이스 `rgba(255,255,255,0.03)` (cards, inputs)
- ✅ 서페이스 hover `rgba(255,255,255,0.05)`
- ✅ Elevated `rgba(255,255,255,0.06)` (modals, active hover)

### 1-3. Vibrant Accent (BCL Orange)
- Primary: `#FF6B00`
- Hover: `#FF8A3D`
- Glow: `rgba(255, 107, 0, 0.2)`
- 사용처: CTA 버튼, 활성 상태, 포인트 컬러

---

## 2. 디자인 토큰 (Design Tokens) — 실제 `globals.css` 기준

### 2-1. CSS Variables (`:root`)
```css
:root {
  /* Brand */
  --primary: #FF6B00;
  --primary-hover: #FF8A3D;
  --primary-glow: rgba(255, 107, 0, 0.2);

  /* Backgrounds */
  --background: #0D0D0E;
  --surface: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.05);

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A1A1AA;
  --text-muted: #52525B;

  /* Border */
  --border: rgba(255, 255, 255, 0.08);

  /* Radius */
  --radius-xl: 16px;
  --radius-lg: 12px;
  --radius-md: 8px;

  /* Blur */
  --blur-md: 16px;
}
```

### 2-2. Typography
- **Font**: `'Lexend', sans-serif` (Google Fonts)
- **Anti-alias**: `-webkit-font-smoothing: antialiased`

### 2-3. Body Background Texture
```css
body::before {
  background-image:
    radial-gradient(circle at 5% 5%, rgba(255, 107, 0, 0.05) 0%, transparent 40%),
    radial-gradient(circle at 95% 95%, rgba(255, 107, 0, 0.03) 0%, transparent 40%);
}
```

---

## 3. 글로벌 컴포넌트 클래스 (Admin)

> ⚠️ **새 Admin 페이지를 만들 때 반드시 아래 글로벌 클래스를 사용해야 한다.**
> 인라인 스타일로 재구현하면 안 됨.

### 3-1. `.admin-filter-btn` — 필터/토글 버튼
```css
.admin-filter-btn {
  padding: 0.5rem 1rem;          /* py-2 px-4 */
  border-radius: 0.5rem;         /* rounded-lg */
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

.admin-filter-btn.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
  box-shadow: 0 0 15px var(--primary-glow);
}
```

**사용 예시:**
```tsx
<button
  onClick={() => setFilter('all')}
  className={`admin-filter-btn ${filter === 'all' ? 'active' : ''}`}
>
  전체
</button>
```

### 3-2. `.admin-search-input` — 검색/날짜 인풋
```css
.admin-search-input {
  width: 100%;
  padding: 0.5rem 1rem;          /* py-2 px-4 – filter btn과 동일 높이 */
  border-radius: 0.75rem;        /* rounded-xl */
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.875rem;           /* text-sm */
  color: #fff;
  outline: none;
  transition: all 0.3s ease;
}

/* placeholder */
.admin-search-input::placeholder {
  color: var(--text-muted);
}

/* focus */
.admin-search-input:focus {
  border-color: rgba(255, 107, 0, 0.5);
}

/* date picker 캘린더 아이콘 (다크 테마) */
.admin-search-input::-webkit-calendar-picker-indicator {
  filter: invert(1) brightness(0.8);
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}
```

**사용 예시:**
```tsx
{/* 텍스트 검색 */}
<input
  type="text"
  className="admin-search-input"
  placeholder="이름, 이메일로 검색..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>

{/* 날짜 선택 */}
<input
  type="date"
  className="admin-search-input w-auto"
  value={date}
  onChange={(e) => setDate(e.target.value)}
/>
```

### 3-3. `.admin-action-btn` — 액션 버튼 (추가/생성)
```css
.admin-action-btn {
  padding: 0.75rem 1.5rem;       /* py-3 px-6 */
  border-radius: 0.75rem;        /* rounded-xl */
  font-size: 0.6875rem;          /* ~11px */
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  background: var(--primary);
  color: #fff;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px var(--primary-glow);
}

.admin-action-btn:hover {
  transform: scale(1.05);
}

.admin-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
```

**사용 예시:**
```tsx
<button onClick={openModal} className="admin-action-btn">
  + 회원 추가
</button>
```

---

## 4. 기타 글로벌 컴포넌트

### 4-1. `.glass-card` — 카드 컨테이너
```css
.glass-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
}
```

### 4-2. `.bcl-input` — 폼 인풋 (모달/폼 용)
```css
.bcl-input {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: white;
  padding: 0.75rem 1rem;
  outline: none;
  font-size: 0.875rem;
}

.bcl-input:focus {
  border-color: var(--primary);
}
```

### 4-3. `.badge` 시리즈
```css
.badge          { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; }
.badge-success  { background: rgba(34,197,94,0.1); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
.badge-warning  { background: rgba(234,179,8,0.1); color: #facc15; border: 1px solid rgba(234,179,8,0.2); }
```

### 4-4. Animations
| 클래스 | 효과 |
|---|---|
| `.animate-premium-fade` | 아래→위 fade in (0.8s) |
| `.animate-slide-in` | 왼쪽→오른쪽 slide (0.6s) |
| `.animate-scale-in` | 확대 등장 (0.5s) |
| `.animate-pulse` | 깜빡임 (2s 반복) |
| `.animate-spin` | 360° 회전 (1s 반복) |
| `.transition-all` | all 0.3s ease |

### 4-5. Sidebar
```css
.sidebar-category-btn       { background: #71717a; color: #18181b; }
.sidebar-category-btn:hover { background: #ffffff; }
.sidebar-category-active    { outline: 1.5px solid var(--primary); }
```

---

## 5. Admin 페이지 레이아웃 패턴

### 5-1. 표준 헤더 영역
```
┌─────────────────────────────────────────────────────┐
│  ● SECTION LABEL                                    │
│  PAGE TITLE  SUBTITLE          [+ Action Btn]       │
│                                                     │
│  [전체] [활성] [만료]   [ 🔍 검색...        ] N건   │
└─────────────────────────────────────────────────────┘
```

**구현 패턴:**
```tsx
{/* Section Label */}
<p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)] mb-1">
  ● Section Name
</p>

{/* Title + Action */}
<div className="flex items-center justify-between mb-6">
  <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider">
    <span className="text-white">PAGE</span>{' '}
    <span className="text-white/20">TITLE</span>
  </h1>
  <button className="admin-action-btn">+ 추가</button>
</div>

{/* Filters + Search */}
<div className="flex items-center gap-3 mb-6">
  <div className="flex gap-2">
    {filters.map(f => (
      <button
        key={f}
        className={`admin-filter-btn ${filter === f ? 'active' : ''}`}
        onClick={() => setFilter(f)}
      >{f}</button>
    ))}
  </div>
  <input className="admin-search-input" placeholder="검색..." />
  <span className="text-xs text-white/30 whitespace-nowrap">{count}건</span>
</div>
```

### 5-2. 테이블 헤더
```tsx
<div className="grid grid-cols-N px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/5">
  <span>컬럼1</span>
  <span>컬럼2</span>
  ...
</div>
```

### 5-3. 테이블 행
```tsx
<div className="grid grid-cols-N items-center px-6 py-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all cursor-pointer">
  ...
</div>
```

### 5-4. Empty State
```tsx
<div className="text-center py-16">
  <div className="text-4xl mb-4 opacity-30">{emoji}</div>
  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
    No Data Found
  </p>
</div>
```

### 5-5. Stats Card
```tsx
<div className="glass-card">
  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">
    STAT LABEL
  </p>
  <p className="text-3xl font-black text-white">{value}</p>
  <p className="text-xs text-[var(--primary)] mt-1">{subLabel}</p>
</div>
```

---

## 6. 구현 체크리스트

UI 컴포넌트를 만들 때 **반드시** 확인:

### 필수 ✅
- [ ] **글로벌 클래스 사용**: `admin-filter-btn`, `admin-search-input`, `admin-action-btn` 사용
- [ ] **CSS 변수 사용**: `var(--primary)`, `var(--surface)` 등 — 하드코딩 금지
- [ ] **Glassmorphism 효과**: Card, Modal에 적용
- [ ] **BCL Orange 포인트**: CTA/활성 상태에만 사용
- [ ] **Empty State**: 데이터 없을 때 안내 메시지
- [ ] **로딩 상태**: Skeleton or spinner 표시
- [ ] **Transition**: 모든 interactive 요소에 `transition: all 0.3s ease`

### 금지 ❌
- [ ] 필터 버튼 인라인 스타일 재작성 (→ `admin-filter-btn`)
- [ ] 검색 인풋 인라인 스타일 재작성 (→ `admin-search-input`)
- [ ] 액션 버튼 인라인 스타일 재작성 (→ `admin-action-btn`)
- [ ] `input[type="date"]`에 별도 캘린더 아이콘 처리 (→ 글로벌 CSS에서 처리됨)
- [ ] 하드코딩 색상 (`#FF6B00` 직접 사용 대신 `var(--primary)`)
- [ ] Tailwind의 `bg-orange-500` 등 Tailwind 색상 유틸리티 (→ CSS 변수 사용)

---

## 7. 색상 사용 규칙 요약

| 용도 | 값 | 사용법 |
|---|---|---|
| 배경 | `#0D0D0E` | `var(--background)` |
| 서페이스 | `rgba(255,255,255,0.03)` | `var(--surface)` or `bg-white/[0.03]` |
| 서페이스 hover | `rgba(255,255,255,0.05)` | `var(--surface-hover)` or `hover:bg-white/[0.05]` |
| 테두리 | `rgba(255,255,255,0.08)` | `var(--border)` or `border-white/[0.08]` |
| 미묘한 테두리 | `rgba(255,255,255,0.05)` | `border-white/5` |
| 텍스트 1차 | `#FFFFFF` | `text-white` |
| 텍스트 2차 | `#A1A1AA` | `var(--text-secondary)` or `text-white/60` |
| 텍스트 약함 | `#52525B` | `var(--text-muted)` or `text-white/30` |
| 강조 (CTA) | `#FF6B00` | `var(--primary)` |
| 강조 glow | `rgba(255,107,0,0.2)` | `var(--primary-glow)` |
| 성공 | `#4ade80` | `.badge-success` |
| 경고 | `#facc15` | `.badge-warning` |

---

## ⚠️ 주의사항

### DO ✅
- **글로벌 클래스 재사용** — 기존 `admin-*` 클래스 활용
- **CSS 변수 사용** — 하드코딩 절대 금지
- **Glassmorphism 효과** — 카드/모달에 적용
- **공식 디자인 시스템 참조** — 스타일 결정 전 확인
- **Height Matching** — 같은 행의 필터/인풋/버튼은 높이 일치

### DON'T ❌
- **인라인 스타일 재구현** — 글로벌 클래스가 있으면 사용
- **Stitch HTML 직접 복사** — 프로젝트 디자인 토큰에 맞게 변환
- **디자인 시스템 무시** — 새 색상/패턴 임의 도입 금지
- **개별 페이지 전용 스타일** — 재사용 가능한 글로벌 클래스로 추출
