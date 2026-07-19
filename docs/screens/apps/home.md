# apps/home — 회원 홈 (탭1)

> 라우트: `/apps/home` (하단탭1) · 상태 🟡
> 상위 설계: 03-user-app §3.1 · 구현: `src/features/member-home/`
> `/apps`, `/apps/dashboard`, `/apps/facilities`는 이 화면으로 리다이렉트(as-is 호환).

## ① 목적
회원이 진입 직후 오늘의 운동 현황(예약·체크인)·멤버십 상태·공지·지점 정보·최근 PR을 한 화면에서 본다.

## ② 핵심 기능
- **멤버십 요약**: 활성 멤버십 이름 + D-day/잔여 크레딧. 만료 임박(≤7일) 시 accent 카드 + "멤버십 연장" CTA(`/apps/purchase`). 활성 멤버십 없음 → 요금제 구매 CTA(상태 게이트).
- **오늘 상태**: 오늘 체크인/예약 카운트 + "다음 수업" 카드(→ `/apps/schedule`).
- **최근 신기록(PR)**: `fn_get_member_performance_profile`의 recent_results 중 PR → "성과 보기"(`/apps/performance`).
- **공지**: 게시 공지 5건(고정/긴급 배지). **지점 정보**(facilities 흡수): 주소·오늘 운영시간·전화.
- **알림 벨**: 미읽음 카운트 배지 → `/apps/notifications`.

## ③ 데이터 소스
- 테이블(조회, own/RLS): `members` · `memberships`(+`membership_plans`) · `bookings`(+`sessions`) · `checkins` · `notices` · `notifications`(미읽음) · `facilities`
- RPC: `fn_get_member_performance_profile(p_member_id)`(최근 PR)
- `useMemberId()`로 member_id 확보 — 비즈니스 조회는 member_id 기준.

## ④ 상태·권한 규칙
- 계정 미연결(member_id 없음) → "계정에 연결된 회원 정보가 없습니다" 에러 표면화.
- 로드 실패 시 EmptyState(error) + onRetry(무한 스피너 금지). 로딩 중 Skeleton.
- **멤버십 없음 게이트**: 예약/체크인 유도 대신 구매 CTA.
- 표준 컴포넌트(Card/Button/Badge/StatCard/EmptyState/Skeleton) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. member 로그인 → `/apps/home` → 인사 + 멤버십 D-day + 오늘 예약/체크인.
2. 멤버십 D-7 이하 → accent 배너 + "멤버십 연장" → `/apps/purchase`.
3. 활성 멤버십 없음 → "활성 멤버십이 없습니다" + 요금제 보기 CTA.
4. 알림 벨 미읽음 > 0 → 배지 표시 → 탭 → `/apps/notifications`.
5. `/apps/facilities` 직접 진입 → `/apps/home` 리다이렉트.
