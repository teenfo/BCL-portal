# admin/members — 회원 목록 · 상세 · 가입 승인

> 라우트: `/admin/members`(목록) · `/admin/members/[id]`(상세, §상세) · 상태 🟡
> 상위 설계: 02-admin §3.2 · 구현: `src/features/members/`

## ① 목적
관리자가 회원을 검색·필터하고, 등록(계정 미연결 허용)·가입 승인·상세 케어를 한다.
회원 참조는 `member_id` 기준 — 계정 미연결 회원(members.user_id NULL)도 다룬다.

## ② 핵심 기능 (목록)
- **통합 검색**: 이름/전화/이메일(300ms 디바운스) + 페이지네이션(20건).
- **뷰 필터**: 전체 · 활성 · 만기 임박 · 홀딩중 · 블랙리스트.
- **회원 등록**: `MemberRegisterModal` — 계정 없이 회원 레코드 생성 가능.
- **가입 승인 대기**: `profiles.approval_status='pending'` 목록 → 승인/반려(`fn_admin_review_signup`).
- 행 클릭 → `/admin/members/[id]` 상세.
- ⏳ 웨이버 서명 배지·미서명 필터(`member_agreements` health_waiver) — 미서명 승인 시 경고 confirm.

## ③ 상세 (`/admin/members/[id]`)
- **탭**: overview · membership · activity · notes · performance (`?tab=` URL 동기).
- **멤버십 조정**: `fn_admin_adjust_membership`(연장/차감/홀딩 등, 감사 동반).
- 상담 로그·후속조치·벤치마크 기록은 코치 화면과 통합 타임라인 공유.

## ④ 데이터 소스
- 테이블(조회, admin RLS): `members`(+`memberships`, `membership_plans.name`) · `profiles`(approval_status)
- RPC: `fn_admin_review_signup(...)`(가입 승인/반려) · `fn_admin_adjust_membership(...)`(멤버십 조정) · 권한 `fn_my_permissions`
- 목록 집계·필터는 `query()`(RLS), 상태 변경은 계약 RPC 경유만.

## ⑤ 상태·권한 규칙
- 진입 가드·권한은 `admin/layout`. 등록/승인/조정은 `members` group의 create/edit 권한 게이트.
- **Display-Safe 예외 아님**: admin 데스크탑 — 상세 케어 정보 열람 허용(공개 표면 아님).
- 로딩/에러 표면화 + 재시도. 승인·조정은 성공 토스트 후 목록 refetch.
- 표준 컴포넌트(Table/Modal/ConfirmModal/Badge/Select/Input) + `--bcl-*` 토큰만.

## ⑥ 수용 시나리오
1. admin → `/admin/members` → 활성 회원 20건 페이지 표시.
2. 검색에 전화 뒤4자리 입력 → 디바운스 후 후보 필터.
3. 가입 승인 대기 행 → 승인 → `fn_admin_review_signup` 성공 → 목록 갱신.
4. 회원 행 클릭 → `/admin/members/[id]?tab=membership` → 멤버십 조정 저장.
