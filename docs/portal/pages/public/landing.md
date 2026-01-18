# Landing Page (랜딩 페이지)

> **URL**: `/`
> **Access**: Public (비로그인 접근 가능)

## 1. 개요
BCL Portal의 퍼블릭 엔트리 포인트입니다. "Start Bootstrap - Personal" 테마의 모던한 스타일을 차용하여, 방문자에게 피트니스 센터 관리 시스템의 핵심 가치를 전달하고 관리자 로그인을 유도합니다.

## 2. 주요 기능 및 섹션

### 2.1 Hero Section (상단)
- **서비스 슬로건**: "Automate Your Gym Operations" 등 핵심 가치 문구 노출
- **CTA 버튼**:
  - **비로그인 시**: `Log In`, `Explore Features` 버튼 노출
  - **로그인 시**: `Enter Dashboard` (관리자 대시보드 바로가기) 버튼 노출

### 2.2 Navigation (네비게이션)
- 스크롤 시 상단에 고정된 Sticky 네비게이션
- 주요 섹션(`Features`, `About`, `Contact`)으로의 앵커 링크 제공
- **Admin Login/Go to Admin** 버튼: 현재 인증 상태(`auth()->loggedIn()`)에 따라 동적으로 텍스트와 링크 변경

### 2.3 Features Section
- 3가지 핵심 기능(회원 관리, 데이터 분석, 세션 스케줄링)을 카드 형태로 소개
- 아이콘과 간략한 설명으로 직관적인 이해 도모

### 2.4 About/Stats Section
- 다크 모드 스타일의 섹션으로 시각적 대비 제공
- 서비스 신뢰도를 높이기 위한 통계 수치(Uptime, Monitoring 등) 및 특장점(보안, 반응형 등) 나열

## 3. UI/UX 디자인
- **테마**: "Start Bootstrap - Personal" (Gradient Text, Rounded Buttons, Blob Backgrounds)
- **컬러 시스템**: BCL Portal의 **Iron Pulse** 아이덴티티 적용
  - Primary: Orange Gradient (`from-[#EC7A3C] to-[#D35400]`)
  - Accent: Blue (`bg-blue-100`, `text-blue-600`)
- **라이브러리**: Tailwind CSS (CDN)
- **폰트**: Plus Jakarta Sans (구글 폰트 적용)

## 4. 관련 파일
- **View**: `app/Views/landing.php`
- **Controller**: `app/Controllers/Dashboard.php` (루트 라우트 처리)
