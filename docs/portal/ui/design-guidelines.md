# BCL Admin Design Guidelines

이 문서는 제공된 샘플 이미지를 분석하여 수립된 BCL 관리자 포털의 시각적 언어와 디자인 원칙을 정의합니다.

## 1. 전반적인 무드 및 스타일
- **Clean & Vibrant**: 밝은 배경과 생동감 넘치는 포인트 컬러(Orange)의 조합.
- **Soft Geometry**: 넉넉한 둥근 모서리와 여백을 통해 사용자 친화적인 느낌을 강조.
- **Premium Detail**: 미세한 그림자(Shadow)와 부드러운 트랜지션을 통해 완성도를 높임.

## 2. 타이포그래피 (Typography)
- **주 폰트**: **Lexend** (Google Fonts)
- **원칙**:
    - 제목(Heading): `font-semibold`, `text-fg` (Slate 900)
    - 본문(Body): `font-normal`, `text-muted` (Slate 600)
    - 캡션/보조(Caption): `text-xs`, `text-subtle` (Slate 400)

## 3. 기하학적 정의 (Geometry)
- **Border Radius**:
    - 큰 카드: `rounded-3xl` (약 24px)
    - 일반 카드/입력창/버튼: `rounded-2xl` (약 16px)
    - 배지: `rounded-full` (Pill style)
- **Shadows**:
    - `shadow-card`: `0 4px 20px -2px rgba(0, 0, 0, 0.05)` (매우 부드러운 그림자)

## 4. 컴포넌트 패턴 (Component Patterns)

### 4.1 카드 (Cards)
- **배경**: `bg-surface`
- **테두리**: `border border-border` (극히 얇고 부드러운 회색)
- **내부 여백**: 보통 `p-6` 이상 사용

### 4.2 상태 배지 (Status Badges)
- **Active**: `bg-successSoft text-success` + `font-semibold`
- **Expired**: `bg-dangerSoft text-danger` + `font-semibold`
- **Header Badge (Neutral)**: `bg-surface2 text-muted`

### 4.3 포인트 요소 (Accent Elements)
- **그래프**: 포인트 컬러(`primary`) 선과 보조 회색(`subtle`) 점선의 조합.
- **포인트 버튼 (FAB)**: 화면 우측 하단의 오렌지색 플로팅 버튼 (`bg-primary`, 호버 시 `bg-primaryHover`).

### 4.4 모바일 네비게이션 (Mobile Navigation)
- **오버레이 드로어 (Overlay Drawer)**: 햄버거 메뉴 클릭 시 좌측에서 나타나며, 배경에 암전 효과(`bg-navy/40 backdrop-blur-sm`)를 적용.
- **하단 네비게이션 (Bottom Nav)**: 주요 메뉴(Home, Members, Schedule, Settings)를 하단에 고정 배치.
- **사이드바 상태 유지 (Sidebar Persistence)**:
    - 현재 접속 중인 메뉴가 속한 섹션이 자동으로 펼쳐진(`show`) 상태 유지.
    - 현재 페이지에 해당하는 메뉴 아이템에 `active` 클래스 자동 적용.
- **트랜지션**: 모든 메뉴 열림/닫힘은 `duration-300`의 부드러운 애니메이션을 사용.

## 5. 테마 (Theming)

### 라이트 모드 (Sample Optimized)
- `bg-bg`: Light Gray (Slate 50)
- `bg-surface`: Pure White

### 다크 모드 (Iron Pulse)
- `bg-bg`: Deep Navy/Slate
- `bg-surface`: Blue-Slate Card
- 포인트 컬러는 동일하게 Orange 유지

## 6. 스페이싱 (Spacing)
- 컴포넌트 간 간격: 주로 `gap-4` 또는 `gap-6`
- 그룹 간 구분: 넉넉한 `py-8` 또는 `mb-8` 사용
