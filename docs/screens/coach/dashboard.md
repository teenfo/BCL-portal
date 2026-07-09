# coach/dashboard — 코치 홈 (오늘 브리핑)

> 라우트: `/coach/dashboard` (하단탭 홈, `/coach` → 여기로 리다이렉트) · 상태 🟡
> 상위 설계: 04-coach-app §3.1 · 구현: `src/features/coach-home/`

## ① 목적
코치가 "오늘 무엇이 위험한가"를 30초 안에 파악하는 브리핑. 운영 리스크·오늘 세션·후속조치 인박스·KPI 스냅샷을 요약한다.

## ② 핵심 기능
- **리스크 요약**: 대기 인원 · 미체크 확정 예약(unchecked_confirmed) · 임박 세션(starting_soon).
- **오늘 세션 리스트**: 예약/체크인/대기/미체크 카운트 + 다음 세션 CTA(→ `/coach/schedule?session_id=`).
- **후속조치 인박스**: open followups(우선순위·기한·연체 표시) → 완료 처리(`fn_complete_followup`).
- **회원 알림**: 플래그·만기 임박·장기 결석(`fn_get_coach_member_alerts`).
- **KPI 스냅샷**: 세션 수·출석률·노쇼율·정산 대상 세션 수.

## ③ 데이터 소스
- RPC: `fn_get_my_coach_dashboard()`(오늘 세션·리스크·주간 요약) · `fn_get_my_followups('open')` · `fn_get_coach_monthly_report(['kpis'])` · `fn_get_coach_member_alerts()` · `fn_complete_followup(p_followup_id)`
- 코치 식별자는 클라이언트 미전달 — RPC 내부 `auth.uid()`→coach 스코프.

## ④ 상태·권한 규칙
- 진입 가드는 `coach/layout`(role=coach). 데이터는 코치 본인 스코프만.
- **Display-Safe**: 회원 케어 컨텍스트는 코치 권한 내 — 정산/민감 재무는 KPI 요약 수치만.
- 로딩 Skeleton · 실패 EmptyState + 재시도. 후속조치 완료는 낙관적/토스트.
- 표준 컴포넌트(Card/StatCard/Badge/Button/EmptyState) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. coach 로그인 → `/coach` → `/coach/dashboard` → 리스크 요약 + 오늘 세션.
2. 미체크 확정 예약 > 0 → 리스크 카드 강조 → 세션 CTA로 보드 진입.
3. open 후속조치 → 완료 처리 → 인박스에서 제거.
4. 다음 세션 CTA → `/coach/schedule?session_id=<id>` 세션 보드.
