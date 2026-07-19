# apps/schedule — 수업 예약 (탭2)

> 라우트: `/apps/schedule` (하단탭2) · 상태 🟡
> 상위 설계: 03-user-app §3.2 · 구현: `src/features/member-schedule/`

## ① 목적
회원이 주간 수업 일정을 보고 예약/대기/취소하며, 본인 예약을 관리한다.

## ② 핵심 기능
- **탭**: 수업 목록 | 내 예약. 주간 캘린더(월~일) + 날짜별 세션 목록 → 세션 상세 시트.
- **세션 카드**: 잔여/예약/대기 카운트 + 본인 예약상태(my_booking_status) + WOD 유무.
- **예약/취소**(`SessionSheet`): `fn_book_with_credit`(크레딧 차감·정책 검증) · `fn_cancel_booking_with_credit`(크레딧 복원). 오류코드→한국어(`BOOKING_ERROR_KO`): 주간 한도·노쇼 제한·이미 예약 등.
- **내 예약 탭**: 본인 `bookings` 최근 60건(세션 조인).

## ③ 데이터 소스
- RPC: `fn_get_member_schedule(p_from, p_to)`(기간 세션 + 정원/예약/대기 카운트 + 본인 예약상태 — DEFINER로 Display-Safe 카운트만 반환. member RLS는 타 회원 bookings 집계 불가) · `fn_book_with_credit(p_session_id)` · `fn_cancel_booking_with_credit(p_booking_id)`
- 테이블(조회, own RLS): `bookings`(+`sessions`)
- 예약/취소/노쇼 정책은 `facilities.booking_policy` 단일 소스 — RPC 내부 집행.

## ④ 상태·권한 규칙
- 식별자(member_id)는 클라이언트가 RPC에 전달하지 않음 — RPC 내부 `current_member_id` 스코프.
- 로딩 Skeleton · 실패 EmptyState + 재시도. 예약/취소는 ConfirmModal 후 실행, 성공/실패 토스트.
- 표준 컴포넌트(Tabs/Card/Badge/Button/BottomSheet/ConfirmModal) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. member → `/apps/schedule` → 이번 주 세션 + 잔여/예약 카운트.
2. 세션 선택 → 시트 → `예약` → `fn_book_with_credit` 성공 → 상태=예약확정.
3. 주간 한도 초과 예약 → "이번 주 예약 가능 횟수를 초과했습니다".
4. 내 예약 탭 → 예약 취소 → 크레딧 복원 반영.
