# Agent Rules

## Project Assumptions
- Sitemap 수정 → 코드 생성 순서 강제
- Admin 데이터는 User에서 Read-only
- CSR 전제, SSR 코드 금지
- Cloudflare Pages + Supabase 고정

## Routing Rules
- **User(Apps)**: `apps/*` → URL Prefix: `/apps/*`
  - 예: `/apps/dashboard`, `/apps/schedule`
- **Admin**: `admin/*` → URL Prefix: `/admin/*`

- **인증(Auth) 라우팅**
  - 사용자: `/apps/auth/*`
    - `/apps/auth/login`
    - `/apps/auth/signup` (선택)
    - `/apps/auth/callback`
    - `/apps/auth/reset-password` (선택)
  - 관리자: `/admin/auth/*`
    - `/admin/auth/login`
    - `/admin/auth/callback`
    - `/admin/auth/reset-password` (선택)
  - 공통 로그아웃(권장): `/auth/logout` (앱/관리자에서 동일 처리)
