# admin/dashboard — 운영 홈 (KPI · 매출 구성 · 긴급 위젯)

> 라우트: `/admin/dashboard` · 상태 🟡
> 상위 설계: 02-admin §3.1 · 구현: `src/features/dashboard/`

## ① 목적
관리자가 진입 직후 시설 운영 현황(회원·출석·매출·리스크)을 한 화면에서 파악하고, 처리 필요 항목으로 딥링크 이동한다.

## ② 핵심 기능
- **KPI 스트립**: 오늘 체크인/예약 · 활성 회원(+이번 달 신규) · 이번 달 매출 · 만기 임박(D-7) · 오늘 세션 · 활동 코치. 각 카드는 소속 group `view` 권한 보유 시에만 노출(미보유 자동 숨김).
- **확인 필요(긴급 위젯)**: 가입 승인 대기 · 만기 임박 회원 · 미처리 문의 티켓 → `/admin/members`, `/admin/crm?tab=support` 딥링크. 값>0이면 accent + "처리 대기" 배지.
- **이번 달 매출 구성**: `payments.view` 보유 시만. 총매출·거래 건수(완료/환불)·평균 객단가 + 카테고리별 막대(차트 라이브러리 없이 CSS 바).
- **빠른 작업**: 회원 등록 · 세션 생성 · 공지 작성 · 수동 결제 딥링크(생성은 해당 화면에서 완결).
- ⏳ 범위 외: 위젯 DnD 배치 · AI 위젯 생성기 · 주간 시계열 차트.

## ③ 데이터 소스
- RPC: `fn_get_dashboard_kpis()`(KPI 집계) · `fn_get_revenue_stats()`(매출 구성, payments.view 보유 시만 호출)
- 권한: `useMyPermissions().can(group, action)` — `fn_my_permissions` 기반

## ④ 상태·권한 규칙
- 진입 가드·권한 컨텍스트는 `admin/layout`(AuthGuard + PermissionsProvider)에서 처리.
- 위젯/KPI/Quick Action은 group `view` 권한으로 개별 필터 — 권한 없는 위젯은 렌더 자체 생략.
- KPI 로드 실패 시 EmptyState(error) + onRetry(무한 스피너 금지). 매출 실패는 해당 카드만 error.
- **Display-Safe**: 집계 수치만 — 개별 회원 민감정보 비노출.
- 표준 컴포넌트(Card/StatCard/Badge/Button) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. admin 로그인 → `/admin/dashboard` → 보유 권한에 해당하는 KPI 카드만 표시.
2. 승인 대기 > 0 → "확인 필요"에 accent 카드 + 처리 대기 배지 → 바로가기 → `/admin/members`.
3. `payments.view` 미보유 계정 → 매출 구성 섹션·이번 달 매출 KPI 자체가 숨겨짐.
4. KPI RPC 실패 → 에러 카드 + 재시도 버튼.
