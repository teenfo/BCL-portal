# admin/race — Race 운영 (이벤트 · PM5 기기 · 기록 통계)

> 라우트: `/admin/race` (탭 `?tab=events|devices|records`) · 상태 🟡
> 상위 설계: 02-admin §3.9 · 15-race-system · 구현: `src/features/race-admin/`

## ① 목적
관리자가 레이스 이벤트를 편성하고, PM5 기기를 등록·관리하며, 기록 통계를 본다.
기기 등록/편집/삭제는 Admin 전용 — 코치(`/coach/race` 장비 탭)는 조회만.

## ② 핵심 기능 (3탭, `?tab=` URL SSOT)
- **이벤트**(`RaceEventsTab`): 이벤트 목록·생성/편집(`RaceEventEditModal`).
- **PM5 기기**(`RaceDevicesTab`):
  - KPI: 전체 기기 / 온라인 / 레이싱 중.
  - 목록: 시리얼(주 식별자)·종류·상태(online/offline/maintenance)·모드·BLE 이름·펌웨어·마지막 동기화.
  - `기기 등록`(`race.edit`) → `Pm5DeviceEditModal` → `fn_admin_upsert_pm5_device(p_payload)`.
  - `편집`(`race.edit`) / `삭제`(`race.delete`) → `fn_admin_delete_pm5_device(p_id)`. 레이싱 중(`current_mode='racing'`) 기기는 삭제 비활성.
  - Python 브릿지(REST `/api/ble/status`) 실시간 mode 동기화는 ⏳(브릿지 연동 후속).
- **기록 통계**(`RaceRecordsTab`): 기록 집계.

## ③ 데이터 소스
- RPC: `fn_list_pm5_devices(p_facility_id?)`(조회) · `fn_admin_upsert_pm5_device(p_payload jsonb)`(등록/편집, is_admin 게이트 + audit) · `fn_admin_delete_pm5_device(p_id uuid)`(삭제, is_admin 게이트 + audit)
- 테이블: `pm5_devices` · `race_events` · `race_records`

## ④ 상태·권한 규칙
- 기기 등록/편집: `can('race','edit')`. 삭제: `can('race','delete')`. 조회 RPC는 내부 `is_admin` 검증.
- 쓰기 RPC는 SECURITY DEFINER + audit_logs 기록 + envelope `{success,data,error}`.
- 레이싱 중 기기 삭제 차단(진행 중 세션 보호). 로딩/에러/빈 3상태(Table empty·StatCard loading).
- 표준 컴포넌트(Table/Tabs/StatCard/Badge/Modal/ConfirmModal) + `--bcl-*` 토큰만.

## ⑤ 수용 시나리오
1. admin 로그인 → `/admin/race?tab=devices` → 기기 KPI + 목록.
2. `기기 등록` → 시리얼·종류·BLE 이름 입력·저장 → 목록에 반영(audit 기록).
3. 기존 기기 `편집` → 값 수정·저장 반영.
4. `current_mode='racing'` 기기 → 삭제 버튼 비활성 + "레이싱 중에는 삭제할 수 없습니다".
5. `삭제`(race.delete) → 확인 모달 → 삭제, 목록에서 제거.
