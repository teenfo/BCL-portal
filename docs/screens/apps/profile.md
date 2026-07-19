# apps/profile — 프로필 (요약 · 설정 시트 · 아바타)

> 라우트: `/apps/profile` (탭5, 하위 5라우트 → 단일 설정 시트로 통합) · 상태 🟡
> 상위 설계: 03-user-app §3.5 · 구현: `src/features/member-profile/`

## ① 목적
회원이 본인 요약(아바타·이름·이메일·멤버십 D-day)을 보고, 페이지 이동 없이 BottomSheet로 세부 설정을 관리한다.

## ② 핵심 기능
- **요약 카드**: 아바타(`members.avatar_url`, 없으면 이니셜 폴백) + 이름/이메일 + 멤버십 배지 + D-day(≤7일 warning).
- **섹션 행 → 시트 전환**(페이지 내비게이션 0회): 내 정보 · 멤버십 · 결제 내역 · 알림 설정 · 앱 설정 · 지점 정보 · 지원(문의·FAQ).
- **아바타 업로드**(`ProfileInfoSheet`): 이미지 선택 → `image/*` 검증 → Storage `avatars` 버킷 `{auth.uid()}/avatar.{ext}` 경로 업로드 → `getPublicUrl` → `members.avatar_url` 갱신. 경로가 `auth.uid()` 폴더라 Storage RLS(own update/delete)로 본인만 쓰기.
- **멤버십 시트**: 없으면 `구매`로 `/apps/purchase` 진입.
- 하단: 수업 피드백 바로가기 · 로그아웃(`signOut`).

## ③ 데이터 소스
- 테이블(조회, own RLS): `members`(id,name,phone,birthday,emergency_contact,avatar_url,facility_id,preferences) · `memberships`(+`membership_plans.name`) · `facilities`
- Storage: `avatars` 버킷 (정책: `avatars own update`/`avatars own delete` — `{uid}/` 폴더 기준)
- 본인 행 수정은 RLS own update/manage 정책 경유(직접 update).

## ④ 상태·권한 규칙
- `useMemberId()`로 member_id 확보 — 비즈니스 조회는 member_id 기준(auth user_id를 FK로 쓰지 않음).
- 로딩/에러 표면화(Skeleton·EmptyState onRetry). 아바타 업로드 중 버튼 loading, 비이미지 파일 거부.
- 표준 컴포넌트(Card/Button/Badge/BottomSheet/Input) + `--bcl-*` 토큰만. 아바타 `<img>`는 eslint no-img-element 예외 처리.

## ⑤ 수용 시나리오
1. member 로그인 → `/apps/profile` → 요약 카드에 이름·이메일·멤버십 D-day.
2. `내 정보` 시트 → 사진 선택(이미지) → 업로드 → 요약 카드 아바타 갱신.
3. 비이미지 파일 선택 → 거부 안내, 업로드 안 됨.
4. 멤버십 없음 상태 → 멤버십 시트에서 `구매` → `/apps/purchase`.
5. 로그아웃 → 세션 종료·로그인 화면.
