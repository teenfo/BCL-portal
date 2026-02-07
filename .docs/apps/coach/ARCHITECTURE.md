# Coach App - 기술 아키텍처

코치 앱은 BCL Portal의 일부로, Next.js 프레임워크와 Supabase 백엔드를 사용하여 구현되었습니다.

## 1. 경로 체계
- **URL**: `/coach/*`
- **소스 코드**: `src/app/coach/*`

## 2. 인증 및 보안
- **AuthGuard**: 모든 코치 페이지는 `AuthGuard` 컴포넌트로 보호됩니다.
- **역할 기반 접근**: 세션 정보를 확인하여 코치 권한이 있는 사용자만 접근할 수 있도록 설계되었습니다. (현재는 세션 유무로 가드 처리)

## 3. 주요 컴포넌트 구조
- **Layout (`layout.js`)**: 모바일 최적화된 바텀 탭 네비게이션을 포함합니다.
- **State Management**: React `useState`, `useEffect` 및 Supabase 실시간 쿼리를 사용하여 데이터를 관리합니다.

## 4. 데이터베이스 연동
- **coaches**: 코치 프로필 정보.
- **sessions**: 수업 일정 및 예약 인원 정보.
- **members**: 회원 정보 및 코칭 노트(`coaching_notes`) 필드.
