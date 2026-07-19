# admin/plans — 요금제 목록 · 편집 · 보관

> 라우트: `/admin/plans` · 상태 🟡
> 상위 설계: 02-admin §3.5 · 구현: `src/features/plans/`

## ① 목적
관리자가 멤버십 요금제(`membership_plans`)를 조회·생성·편집하고, 판매 중단은 물리 삭제가 아닌 보관(비활성)으로 처리한다. 결제 금액의 서버 신뢰 소스가 이 테이블의 `price`다.

## ② 핵심 기능
- **목록 Table** + 필터: `plan_kind`(standard/drop_in/trial 등) · 판매 상태.
- **편집 모달**(`PlanEditModal`): 이름·종류·가격·기간/횟수·판매 여부 → `fn_upsert_membership_plan`.
- **보관(숨김)**: `fn_archive_membership_plan`(is_active=false, 감사 동반). 활성 구독이 있으면 서버가 차단 — 물리 삭제 아님.

## ③ 데이터 소스
- 테이블(조회, admin RLS): `membership_plans`
- RPC: `fn_upsert_membership_plan(...)`(생성/수정) · `fn_archive_membership_plan(...)`(보관·차단 검증)
- 결제 계약: 클라이언트 금액 불신 — 결제 시 서버가 `membership_plans.price` 재조회 비교(08 §1).

## ④ 상태·권한 규칙
- 진입 가드·권한은 `admin/layout`. 생성/편집/보관은 `plans`(또는 payments 계열) group 권한 게이트.
- 보관은 감사 로그(audit_logs) 동반. 삭제 정책은 admin 전용.
- 로딩/에러 표면화 + 재시도. 저장 성공 토스트 후 목록 refetch.
- 표준 컴포넌트(Table/Modal/Badge/Select) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. admin → `/admin/plans` → 판매 중 요금제 목록.
2. plan_kind=drop_in 필터 → 드롭인 요금제만.
3. 편집 → 가격 변경 저장 → `fn_upsert_membership_plan` → 목록 반영.
4. 활성 구독이 있는 요금제 보관 시도 → 서버 차단 안내(비활성화 실패).
