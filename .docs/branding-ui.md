# Branding & Design System

## 테마 컨셉: BCL Orange
본 프로젝트는 **BCL(Bright Creative Lifestyle)**의 브랜드 아이덴티티를 투영하기 위해 활기차고 역동적인 **Orange** 컬러를 메인 테마로 채택했다.

## 1. 컬러 팔레트 (Design Tokens)
- **Brand Primary**: `#FF6B00` (BCL Orange)
- **Brand Secondary**: `#FF9100`
- **Brand Accent**: `#FF5000`
- **Background**: Dark Mode 기반의 고급스러운 컬러 조합 (`#0f172a`, `#1e293b`)

## 2. UI 구성 원칙
- **Glassmorphism**: 헤더와 네비게이션 바에 반투명 유리 질감 효과를 적용하여 현대적이고 프리미엄한 느낌을 강조한다.
- **Micro-interactions**: 버튼 호버(Hover), 페이지 페이드인(Fade-in) 등 부드러운 애니메이션을 통해 사용자 경험을 향상시킨다.
- **Consistent Icons**: 각 기능의 의미를 직관적으로 전달하는 이모지 및 아이콘 시스템을 통일성 있게 사용한다.

## 3. 레이아웃 구조
- **Admin Side**: 복잡한 관리를 위해 고정형 사이드바(`var(--sidebar-width)`)를 사용하여 넓은 작업 영역을 확보한다.
- **App Side**: 모바일 환경에 최적화된 하단 탭 바(`var(--bottom-nav-height)`)를 제공하여 엄지손가락 하나로 모든 주요 메뉴에 접근할 수 있게 설계했다.

## 4. CSS 변수 관리
모든 스타일은 `src/app/globals.css`의 루트 변수를 통해 관리되므로, 테마 변경 시 이 파일의 변수값만 수정하면 서비스 전체에 즉시 반영된다.
