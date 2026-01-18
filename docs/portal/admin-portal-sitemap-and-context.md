---
trigger: always_on
---

# BCL Admin Portal Sitemap Rule (CI4 SSR + SB Admin 2)

## 저장 위치(중요)
- 이 규칙과 sitemap 산출물은 **BCL-Portal 리포의 portal 서브모듈** 기준으로 저장한다.
- 기준 경로(prefix): `portal/`
- sitemap 문서 파일 경로: `portal/docs/admin-portal-sitemap.md`

## 목적
- BCL Admin 포털의 **사이드바 메뉴 구조(sitemap)**를 단일 소스로 관리한다.
- CI4(SSR) + SB Admin 2 사이드바 생성 시, 이 sitemap을 기준으로 메뉴/라우팅을 구성한다.

## 범위/제외
- Admin 포털은 “전체 운영” 메뉴만 포함한다.
- 다음은 **포털 sitemap에서 제외**한다:
  - 레이스 관련 기능
  - 키오스크 메뉴
  - 장비·센서 메뉴
  - 번역·다국어 메뉴

## 산출물(필수)
- `portal/docs/admin-portal-sitemap.md` 파일을 생성/갱신한다.
- 문서에는 아래 항목을 반드시 포함한다:
  - 메뉴 그룹(heading) / 메뉴 / 서브메뉴(2~3 depth)
  - 각 메뉴의 slug(라우팅 경로)
  - 각 메뉴의 아이콘(Font Awesome 클래스)

## Sitemap 내용(정본)
`portal/docs/admin-portal-sitemap.md`에는 아래 구조를 그대로 작성한다.

- 0) Public (비로그인)
  - 랜딩 페이지 (`/`)

- 0-1) TopBar (User Menu)
  - Profile (`/admin/members/{currentUserId}`) icon: `fa-user`
  - Settings (`#!`) icon: `fa-cogs`
  - Logout (`#logoutModal`) icon: `fa-sign-out-alt`

- 1) 대시보드
  - HOME (`/`)
  - 대시보드 (`/admin/dashboard`) icon: `fa-tachometer-alt`

- 2) 회원관리
  - 회원 목록 (`/admin/members`) icon: `fa-users`
  - 회원 프로필 (`/admin/members/{memberId}`) icon: `fa-user`
  - 출결·체크인 로그 (`/admin/attendance`) icon: `fa-clipboard-check`
  - 멤버십·결제 (group)
    - 플랜 관리 (`/admin/memberships/plans`) icon: `fa-id-card`
    - 결제 내역 (`/admin/billing/payments`) icon: `fa-credit-card`
    - 환불·정산 (`/admin/billing/settlements`) icon: `fa-receipt`
  - 권한·그룹 (`/admin/roles`) icon: `fa-user-shield`

- 3) 시설·세션 운영
  - 세션·수업 스케줄 (`/admin/sessions/schedule`) icon: `fa-calendar-alt`
  - 예약·대기열 관리 (`/admin/sessions/bookings`) icon: `fa-list-ul`
  - 체크인 현황(실시간) (`/admin/sessions/checkins`) icon: `fa-door-open`
  - 코치 배정·교체 (`/admin/sessions/assignments`) icon: `fa-random`
  - 코치 프로필 관리 (group)
    - 코치 목록 (`/admin/coaches`) icon: `fa-user-tie`
    - 코치 프로필 (`/admin/coaches/{coachId}`) icon: `fa-address-card`

- 4) 콘텐츠·게시판
  - 공지사항 (`/admin/content/notices`) icon: `fa-bullhorn`
  - 운영 공지/배너 (`/admin/content/banners`) icon: `fa-image`
  - 게시글 관리 (`/admin/content/posts`) icon: `fa-edit`
  - 댓글/신고 관리 (`/admin/content/moderation`) icon: `fa-flag`

- 5) 보고서·분석
  - 출석 리포트 (`/admin/reports/attendance`) icon: `fa-chart-bar`
  - 세션 운영 리포트 (`/admin/reports/sessions`) icon: `fa-chart-line`
  - 매출·정산 리포트 (`/admin/reports/revenue`) icon: `fa-coins`
  - 코치 성과 리포트 (`/admin/reports/coaches`) icon: `fa-award`

- 6) 알림·메시지
  - 템플릿 관리 (`/admin/notifications/templates`) icon: `fa-envelope-open-text`
  - 발송 로그 (`/admin/notifications/logs`) icon: `fa-history`
  - 자동 발송 규칙 (`/admin/notifications/rules`) icon: `fa-cogs`

- 7) 통합·연동
  - 결제 연동 설정 (`/admin/integrations/payments`) icon: `fa-plug`
  - 외부 시스템 연동(웹훅/API 키) (`/admin/integrations/api`) icon: `fa-key`
  - 데이터 내보내기/가져오기(CSV) (`/admin/integrations/data`) icon: `fa-file-csv`

- 8) 설정
  - 지점/시설 정보 (`/admin/settings/facility`) icon: `fa-store`
  - 운영 정책(취소/환불/노쇼) (`/admin/settings/policies`) icon: `fa-gavel`
  - 멤버십 상품 정책 (`/admin/settings/memberships`) icon: `fa-tags`
  - 권한 정책/역할 관리 (`/admin/settings/access`) icon: `fa-lock`

- 9) 유지보수·로그
  - 관리자 액션 로그 (`/admin/maintenance/audit`) icon: `fa-user-clock`
  - 에러 로그 (`/admin/maintenance/errors`) icon: `fa-bug`
  - 공지/점검 이력 (`/admin/maintenance/maintenance`) icon: `fa-tools`
  - 인증 UI 가이드 (`/admin/maintenance/auth-ui`) icon: `fa-user-lock`
  - 레이아웃 & 상단바 (`/admin/ui/layout`) icon: `fa-window-maximize`

## 업데이트 규칙
- 메뉴 추가/삭제/slug 변경이 발생하면,
  1) 먼저 `portal/docs/admin-portal-sitemap.md`를 갱신하고
  2) 그 다음 레이아웃(사이드바) 생성/수정 작업을 수행한다.
- sitemap과 실제 사이드바가 불일치하면 sitemap을 정본으로 보고 사이드바를 수정한다.