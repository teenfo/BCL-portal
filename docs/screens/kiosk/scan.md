# kiosk/scan — 입구 무인 체크인 (스캔 · 수동 · 결과)

> 라우트: `/kiosk/scan` (완료 화면 `/kiosk/success`는 §결과 참조) · 상태 🟡
> 상위 설계: 06-kiosk §3.2·§3.3·§4·§5 · 구현: `src/features/kiosk-checkin/`, `src/features/kiosk-shell/`

## ① 목적
입구 단말에서 회원 QR을 인식하거나 전화 뒤 4자리로 조회해 체크인을 접수한다.
멤버십 판정은 전적으로 서버(`fn_kiosk_checkin`)가 수행 — 클라이언트에 멤버십 검증 로직 없음.

## ② 핵심 기능
- **자동 스캔**: 카메라 프리뷰 + 조준 프레임(reticle) + 자동 디코딩(`useScanner`, BarcodeDetector). 디코드 → `submitScan(raw)` → 서버 검증 → 결과 전환.
- **결과 분기**(`ScanOutcome`): `success`/`duplicate`(중복 체크인)/`queued`(오프라인 접수) → `/kiosk/success`, 그 외 오류는 3초 토스트 후 스캔 재개.
- **수동 폴백**: 카메라 불가/미지원 시 전화 뒤 4자리 → `fn_kiosk_lookup_member`(anon, 마스킹 후보) → 후보 선택 시 `member_id`를 `submitManualCheckin`→`fn_kiosk_checkin`에 위임.
- **오프라인 큐**: `online=false`이면 `enqueueCheckin`으로 로컬 접수(`queued`), 복구 시 처리.
- **타임아웃**: 60초 무동작 시 `/kiosk`(idle) 복귀. 재진입 차단(processingRef) + 1.5초 쿨다운.
- **plan_kind 인식**: 성공 결과에 `membership_plan_kind`(standard/drop_in/trial) 포함 → success 화면이 드롭인/체험권 라벨 표시.

## ③ 결과 화면 (`/kiosk/success`)
- `success`: "{회원명}님 · 체크인 완료" + 요금제 종류/이름 칩.
- `duplicate`: 이미 체크인됨 안내.
- `queued`: 오프라인 접수 — 복구 시 자동 처리, 회원 정보 미표시.

## ④ 데이터 소스
- RPC: `fn_kiosk_checkin(p_payload, p_device_id, p_scanned_at)`(체크인 판정 전담) · `fn_kiosk_lookup_member(...)`(anon, 뒤 4자리 마스킹 후보)
- 테이블: `checkins`(서버 기록) · `pm5_devices`/기기 컨텍스트는 `kiosk-shell`
- 클라이언트 모듈: `payload.ts`(QR 규약) · `offline-queue.ts` · `result-store.ts` · `useScanner.ts`

## ⑤ 상태·권한 규칙
- 판정·기록은 서버 RPC 단독. 클라이언트는 원시 payload와 device/facility 컨텍스트만 전달.
- **Display-Safe**: 공개 표면 — 부상/메모/정산 비노출, 회원명 외 민감정보 없음. 수동 후보는 마스킹.
- 무한 스피너 금지 — 오류는 토스트 후 재개, 네트워크 오류는 `network_error` 메시지.
- 비회원(게스트) 드롭인 온보딩 흐름은 진행 중(⏳ — 다른 에이전트 in-flight). 현재는 drop_in **멤버십 보유** 회원 체크인까지 지원.

## ⑥ 수용 시나리오
1. `/kiosk/scan` 진입 → 카메라 프리뷰 + 조준 프레임 표시.
2. 유효 회원 QR 인식 → `/kiosk/success`에 "{이름}님 · 체크인 완료" + 요금제 칩.
3. 동일 QR 재인식 → duplicate 결과 화면.
4. 카메라 차단/미지원 → "수동 입력" → 뒤 4자리 조회 → 마스킹 후보 선택 → 체크인.
5. 오프라인(online=false) → 접수 완료(queued) 안내, 복구 시 처리.
6. 60초 무동작 → `/kiosk`(idle) 복귀.
