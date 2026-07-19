# 디자인 시스템 - 컴포넌트 라이브러리 Stitch 생성 프롬프트

## 메타데이터
- **Screen ID**: `47c9afc2adc94a14b435cc696b90d1dc`
- **생성일**: 2026-02-17
- **Device Type**: DESKTOP
- **경로**: 참조용 (실제 라우트 아님)
- **Sitemap 참조**: 디자인 시스템 참조 화면
- **목적**: 개발자와 디자이너가 참조할 디자인 시스템 가이드

---

## 생성 프롬프트

BCL Portal 디자인 시스템 - 컴포넌트 라이브러리

데스크탑용 디자인 시스템 참조 화면을 생성해주세요.

**디자인 테마** (고정):
- Color Mode: DARK
- Font: Lexend
- Roundness: 8px (ROUND_EIGHT)
- Primary Color: #ff6a00 (오렌지)
- Saturation: 2

**레이아웃**:
- 상단: "BCL Portal Design System" 타이틀
- 좌측 사이드바: 디자인 시스템 카테고리 네비게이션
  - Colors
  - Typography
  - Spacing
  - Components
  - Icons
  - Layouts
  
**메인 콘텐츠 영역 - 컴포넌트 섹션**:

1. **Color Palette 섹션**:
   - Primary: #ff6a00 (큰 색상 스와치와 hex 코드)
   - Dark Mode Background 계열:
     * Background: #1a1a1a
     * Surface: #262626
     * Border: #404040
   - Semantic Colors:
     * Success: #10b981
     * Warning: #f59e0b
     * Error: #ef4444
     * Info: #3b82f6
   - 각 색상마다 스와치 + hex code + 사용 예시

2. **Typography 섹션**:
   - Font Family: Lexend (모든 weight 예시)
   - Heading 계층:
     * H1: Lexend Bold 32px
     * H2: Lexend Bold 24px
     * H3: Lexend SemiBold 20px
     * H4: Lexend Medium 18px
   - Body Text:
     * Large: 16px
     * Regular: 14px
     * Small: 12px
   - 각 스타일 실제 텍스트 예시 표시

3. **Button Components 섹션**:
   - Primary Button (Orange #ff6a00 배경)
   - Secondary Button (아웃라인)
   - Tertiary Button (텍스트만)
   - Disabled State
   - 각 버튼의 다양한 크기 (Large, Medium, Small)
   - Glassmorphism 효과 적용

4. **Card Components 섹션**:
   - 기본 Card (Glassmorphism)
   - 정보 Card (아이콘 + 제목 + 내용)
   - 통계 Card (숫자 강조)
   - 각 카드는 backdrop-filter blur 효과

5. **Form Elements 섹션**:
   - Input Field (Focus/Default/Error 상태)
   - Dropdown/Select
   - Checkbox
   - Radio Button
   - Toggle Switch
   - 모두 Dark Mode + 8px roundness

6. **Spacing System**:
   - 4px 단위 그리드 시스템 시각화
   - xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px
   - 실제 간격을 보여주는 예시 박스들

7. **Icons 섹션**:
   - 주요 아이콘 세트 (Home, Schedule, User, Settings, etc.)
   - 아이콘 크기: 16px, 20px, 24px, 32px
   - Orange accent와 White 버전

**스타일링**:
- 모든 컴포넌트는 Glassmorphism 효과
- Dark 배경 위에 반투명 카드
- 8px border radius 일관성
- Orange (#ff6a00) accent color 강조
- 세련되고 프리미엄한 느낌
- 실제 사용 예시를 함께 표시

**목적**:
개발자와 디자이너가 참조할 수 있는 완전한 디자인 시스템 가이드

---

## 생성 결과
- **상태**: ✅ 성공
- **최종 확정일**: 2026-02-17
- **Stitch 타이틀**: "BCL Portal Design System Guide"
- **크기**: 2560x2048 (Desktop)

---

## 디자인 시스템 구성 요소

### 색상 팔레트
```css
/* Primary */
--bcl-orange: #ff6a00;

/* Dark Mode */
--bg-primary: #1a1a1a;
--bg-surface: #262626;
--border: #404040;

/* Semantic */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### 타이포그래피
```css
/* Font Family */
font-family: 'Lexend', sans-serif;

/* Headings */
h1: 32px / Bold
h2: 24px / Bold
h3: 20px / SemiBold
h4: 18px / Medium

/* Body */
large: 16px
regular: 14px
small: 12px
```

### 간격 시스템
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

### Glassmorphism 효과
```css
backdrop-filter: blur(10px);
background: rgba(38, 38, 38, 0.8);
border-radius: 8px;
border: 1px solid rgba(255, 255, 255, 0.1);
```

---

## 사용 가이드

### 개발 시 참조 방법
1. Stitch 프로젝트에서 Screen ID로 화면 조회
2. 각 컴포넌트 스타일 참고
3. `ui-gen` 스킬과 결합하여 구현
4. 일관성 유지를 위해 정확한 색상/간격 값 사용

### 새 컴포넌트 추가 시
- 디자인 시스템의 색상 팔레트만 사용
- 8px roundness 유지
- Glassmorphism 효과 적용
- Lexend 폰트 사용

---

## 참고 사항
- 이 화면은 참조용이며 실제 라우트가 아님
- 모든 BCL Portal 화면은 이 디자인 시스템을 따름
- 일관성 검증 시 이 화면을 기준으로 사용
