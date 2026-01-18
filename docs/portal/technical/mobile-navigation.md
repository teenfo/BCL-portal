# Mobile Navigation Implementation

이 문서는 BCL Admin 포털의 모바일 최적화 네비게이션 구현 상세를 설명합니다.

## 1. 개요
모바일 환경(768px 미만)에서 사용자 경험을 극대화하기 위해 기존의 고정 사이드바 대신 **오버레이 드로어**와 **하단 네비게이션**을 도입했습니다.

## 2. 주요 구성 요소

### 2.1 오버레이 드로어 (Overlay Drawer)
- **트리거**: 탑바의 햄버거 메뉴 아이콘.
- **동작**: 클릭 시 사이드바가 왼쪽에서 오른쪽으로 슬라이드하며 나타남 (`show-mobile` 클래스 전환).
- **암전 효과 (Backdrop)**: 사이드바 외부 영역을 어둡게 처리하여 사이드바에 시선을 집중시킴. 백드롭 클릭 시 사이드바가 닫힘.
- **닫기 기능**: 상단의 'X' 버튼 또는 백드롭 클릭을 통해 닫기 가능.

### 2.2 하단 네비게이션 바 (Bottom Nav Bar)
- **위치**: 화면 하단에 고정 (`fixed bottom-0`).
- **주요 메뉴**:
  - 홈 (Home)
  - 회원 관리 (Members)
  - 시설 스케줄 (Schedule)
  - 설정 (Settings)
- **시각 특징**: 상단 테두리(`border-t`), 반투명 배경(`bg-white/80 backdrop-blur-md`), 활성 상태 포인트 컬러(`text-primary`).

## 3. 구현 상세

### 3.1 CSS (Tailwind + Custom)
- `.sidebar`: 모바일에서 `fixed`, `left: -240px`로 숨겨져 있으며 `transition` 적용.
- `.sidebar.show-mobile`: `left: 0`으로 화면에 표시.
- `#sidebarBackdrop`: `fixed inset-0`, `bg-black/50`, `z-index: 1040`.

### 3.2 JavaScript (Vanilla JS)
```javascript
// 사이드바 토글 로직
const sidebar = document.getElementById('accordionSidebar');
const backdrop = document.getElementById('sidebarBackdrop');
const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');

sidebarToggleMobile.addEventListener('click', function() {
    sidebar.classList.add('show-mobile');
    backdrop.classList.remove('d-none');
});

// 닫기 로직
function closeSidebar() {
    sidebar.classList.remove('show-mobile');
    backdrop.classList.add('d-none');
}
```

## 4. 레이아웃 대응
- 모바일에서 사이드바가 콘텐츠를 밀어내지 않도록 `margin-left: 0` 강제 적용.
- 하단 네비게이션 바가 콘텐츠를 가리지 않도록 `#content`에 `pb-[80px]` (모바일 전용 padding) 추가.
