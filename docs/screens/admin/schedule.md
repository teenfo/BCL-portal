# admin/schedule — 스케줄 (세션 통합 패널)

> 라우트: `/admin/schedule` · 상태 🟡
> 상위 설계: 02-admin §3.6 · 구현: `src/features/schedule/`

## ① 목적
관리자가 세션을 생성·편집·취소하고, 세션별 로스터/대기/출결/WOD를 하나의 통합 패널에서 운영한다.

## ② 핵심 기능
- **뷰 토글**: week | day(버튼 토글) + 코치 색상 필터(다중 선택).
- **세션 생성/편집**: `SessionFormModal` → `fn_upsert_session`(제목·정원·코치·시간·유형).
- **세션 취소**: `fn_cancel_session`(대기 알림 등 부수효과 서버 처리).
- **통합 패널(세션 클릭)**: 로스터(RosterTab) · 대기(WaitlistTab) · WOD(WodTab).
  - 관리 예약/워크인: `fn_admin_book_session` · `fn_admin_add_walkin`.
  - 대기 승격: `fn_promote_from_waitlist`. 예약 취소: `fn_cancel_booking_with_credit`.
  - 출결 판정: `fn_mark_attendance(p_session_id, p_items[])`.
  - 세션 WOD: `fn_get_session_wod` / `fn_upsert_session_wod` / `fn_publish_session_wod`.

## ③ 데이터 소스
- 테이블(조회, admin RLS): `sessions`(+예약/대기 카운트) · `bookings` · `checkins`
- RPC: `fn_upsert_session` · `fn_cancel_session` · `fn_admin_book_session` · `fn_admin_add_walkin` · `fn_promote_from_waitlist` · `fn_cancel_booking_with_credit` · `fn_mark_attendance` · `fn_get_session_wod` · `fn_upsert_session_wod` · `fn_publish_session_wod`
- 예약/취소/노쇼 정책은 `facilities.booking_policy` 단일 소스 — RPC 내부 집행(클라이언트 하드코딩 금지).

## ④ 상태·권한 규칙
- 진입 가드·권한은 `admin/layout`. 액션별 `schedule` group 권한: view/create/edit/delete로 버튼 게이트.
- 표준 세션 테이블명 `sessions`/`bookings`/`checkins` 사용(reservations·check_ins 금지).
- 로딩/에러 표면화 + 재시도. 변경은 성공 토스트 후 refetch.
- 표준 컴포넌트(Card/Button/Modal/EmptyState/Table) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. admin → `/admin/schedule` → 이번 주 세션 그리드 + 코치 색상.
2. `세션 생성` → 모달 저장 → 그리드 반영.
3. 세션 클릭 → 통합 패널 → 대기 회원 승격 → 로스터 이동.
4. 출결 탭에서 no_show 판정 → `fn_mark_attendance` 성공 → 상태 갱신.
5. `schedule.delete` 미보유 계정 → 세션 취소 버튼 비노출.
