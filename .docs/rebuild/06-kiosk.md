# 06. Kiosk (무인 체크인 단말) — 재구축 설계

> **대상**: `/kiosk/*` — 입구 태블릿/전용 단말, 지점 공용 계정으로 상시 구동
> **근거 스냅샷**: `_source/screens-inventory.md` §5, `_source/backend-inventory.md`, `_source/nonfunctional-history.md` §5(QR 규칙)
> **표준 계약**: `_source/contract.md` — 테이블 표준 명칭·상태 표기 준수
> **상태 표기**: ✅ 운영 중 · 🟡 코드완료(검증 대기) · 🧪 mock/시뮬레이션 · ⏳ 미구현(신규 설계) · 🔄 to-be에서 변경/통합

---

## 0. 명칭 통일 선언 (as-is 문서 불일치 해소)

기존 sitemap/kiosk 문서는 아래 구명칭을 혼용했다. **본 문서 및 재구축 전체는 우측 표준 명칭만 사용한다** (contract §2).

| as-is 문서 표기 (폐기) | to-be 표준 (유일 표기) |
|---|---|
| `check_ins` | **`checkins`** |
| `reservations` | **`bookings`** |
| `plans` | **`membership_plans`** |

---

## 1. 개요 · 설계 원칙

| 항목 | 내용 |
|---|---|
| 성격 | 무인 셀프 체크인 키오스크. 회원 앱(03 §3.3)이 발급한 **동적 QR을 카메라로 판독** → 서버 검증 → 결과 표시 |
| 화면 | 3화면 유지: **idle → scan → success**(as-is 구조 승계 — 단순함이 미덕인 단말) |
| 계정 | 지점 공용 계정(facility 스코프) 로그인 상시 유지 — 세션 만료 시 idle에 재로그인 안내 오버레이(무한 스피너 금지) |
| 단말 등록 | `kiosk_devices` 등록 단말만 체크인 처리 허용(device_id 로컬 보관), Admin이 `/admin` 설정(infrastructure 승계 화면)에서 원격 제어 |
| 원칙 | ① 검증·기록은 100% 서버(단말은 디코딩+표시만) ② 실패해도 줄이 밀리지 않게: 모든 오류는 3초 토스트 후 scan 복귀 ③ 대형 터치 타겟·고대비(입구 역광 환경) |

---

## 2. as-is → to-be 대조표

| 영역 | as-is | to-be | 상태 |
|---|---|---|---|
| 화면 구조 | idle / scan / success 3화면 | 동일 유지 | ✅ |
| QR 디코딩 | **수동 입력 폴백만 실동작(자동 인식 mock)** | **자동 디코딩 정식 요구로 승격**: BarcodeDetector → jsQR 폴백 (§5) | 🧪 → ⏳ 정식 설계 |
| 체크인 기록 | `checkins` INSERT (문서상 check_ins 표기 혼재) | `checkins` 단일 표준 + 원자적 RPC 처리(§4.4) | ✅→🔄 |
| 예약 감지 | ±30분 분기(구현) | 프로토콜 완결 명세로 고정(§4.2~4.3) | ✅ |
| Heartbeat | 30s(`kiosk_devices.last_heartbeat`) | 유지 + 원격 명령 Realtime 수신(§6) | ✅/🔄 |
| 오프라인 | 없음(네트워크 단절 = 기능 정지) | 로컬 큐 폴백 신설(§7) | ⏳ |

---

## 3. 화면 상세

### 3.1 `/kiosk` — idle (대기)

| 항목 | 내용 |
|---|---|
| 목적 | 상시 정보 표시 + 접근 시 즉시 스캔 유도 |
| 핵심 기능 | ① 대형 시계/날짜 ② 지점 공지 슬라이드(`notices`, `banners`) ③ "체크인 시작" 전면 터치 → scan 전환 ④ **Heartbeat 30s** 발신(§6) ⑤ 네트워크 상태 배지(오프라인 시 §7 모드 표시) ⑥ 원격 명령 수신(새로고침/유지보수 모드) |
| 데이터 | `notices`, `banners`(facility 스코프), `kiosk_devices`(heartbeat UPDATE) |
| 현재 상태 | ✅ |

### 3.2 `/kiosk/scan` — 스캔

| 항목 | 내용 |
|---|---|
| 목적 | 회원 QR 판독 → 검증 요청 → 분기 결과 수신 |
| 핵심 기능 | ① 카메라 프리뷰 + 조준 가이드 프레임 ② **QR 자동 디코딩(§5 — 정식 요구)** ③ 디코딩 성공 → 즉시 서버 검증(§4) → success 전환 ④ 실패/거부 사유 토스트(만료/중복/타지점/비활성 회원 — §4.2 오류표) 후 스캔 재개 ⑤ 최후 폴백: 수동 입력(전화번호 뒤 4자리 → 후보 선택, 유지하되 격하) ⑥ 60초 무동작 → idle 복귀 |
| 데이터 | 판독 페이로드 → 체크인 RPC 1회 호출(§4.4). 클라이언트 직접 테이블 쓰기 금지 |
| 현재 상태 | 화면 ✅ / 자동 디코딩 🧪→⏳ |

### 3.3 `/kiosk/success` — 완료

| 항목 | 내용 |
|---|---|
| 목적 | 체크인 결과를 회원이 지나가며 1초에 인지 |
| 핵심 기능 | ① 회원명 + 인사 ② **분기 결과 표기**: 수업 체크인(수업명·시작 시간·코치) vs 시설 체크인(자유 이용) ③ 잔여 크레딧 / 멤버십 D-Day(만료 ≤7일 경고 색) ④ 중복 체크인이었다면 "이미 체크인되었습니다"(기존 시각 표기) ⑤ **5초 후 idle 자동 복귀** |
| 데이터 | §4.4 RPC 응답 data만 사용(추가 조회 없음 — 표시 지연 방지) |
| 현재 상태 | ✅ |

---

## 4. QR 체크인 프로토콜 — 완결 명세 (SSOT)

> 회원 앱(03 §3.3)은 발급만, 키오스크는 판독만, **판정은 전부 이 절의 서버 규칙**을 따른다.

### 4.1 페이로드

QR 내용 = JSON 직렬화 문자열:

```json
{ "mid": "<member_id UUID>", "fid": "<facility_id UUID>", "ts": 1783500000, "v": 1 }
```

| 필드 | 의미 | 규칙 |
|---|---|---|
| `mid` | member_id (**auth user_id 아님** — 데이터 규칙 준수) | 서버에서 실존·`members.status` 활성·비블랙리스트 검증 |
| `fid` | 발급 시점 회원 소속 지점 | 키오스크 단말의 facility와 일치해야 함(타지점 QR 거부 — 지점공유 플랜은 서버가 `membership_plans.facility_sharing`으로 예외 허용) |
| `ts` | 발급 시각(epoch 초) | **5분(300s) 만료**. 미래 시각(+60s 초과)도 거부(시계 조작) |
| `v` | 페이로드 스키마 버전 | 현행 `1`. 미지원 버전 → "앱 업데이트 필요" 안내 |

서명 필드는 두지 않는다(as-is 계약 유지) — 5분 만료 + mid/fid 서버 대조 + 등록 단말 한정으로 위조 실익 제거. 서명(HMAC `sig`) 도입은 v2 확장 옵션으로만 남긴다.

### 4.2 검증 파이프라인 (서버, 순서 고정)

```
① 스키마: v 지원 여부, 필드 4종 존재
② 만료:   now - ts > 300s → 거부 [QR_EXPIRED]
③ 회원:   mid 실존 + status 활성 + is_blacklisted=false → 아니면 [MEMBER_INVALID]
④ 지점:   fid = 단말 facility (facility_sharing 예외) → 아니면 [FACILITY_MISMATCH]
⑤ 멤버십: 활성 memberships 존재 → 없으면 [NO_MEMBERSHIP] (체크인 거부 + 데스크 안내)
⑥ 중복:   동일 mid + 동일 facility + 최근 5분 내 checkins 존재
          → 신규 INSERT 없이 [ALREADY_CHECKED_IN] (success 화면에 기존 체크인 표기)
⑦ 예약 자동감지(±30분): 아래 4.3 분기
```

| 오류 코드 | 키오스크 표시 |
|---|---|
| QR_EXPIRED | "QR이 만료되었습니다. 앱에서 새로 열어주세요" |
| MEMBER_INVALID / NO_MEMBERSHIP | "데스크에 문의해주세요" (사유 상세는 비노출 — 개인정보) |
| FACILITY_MISMATCH | "이 지점에서 사용할 수 없는 QR입니다" |
| ALREADY_CHECKED_IN | success 화면 경유(중복 표기) — 오류 아님 |

### 4.3 예약 자동감지 분기 — 시설 vs 수업 체크인

```
후보 = mid의 bookings(status=confirmed)
       AND 세션 start_time이 [now-30분, now+30분] 구간
┌ 후보 1건 이상 → [수업 체크인]  (복수면 |start_time - now| 최소 세션 선택)
│   · checkins INSERT (member_id, session_id, checkin_method='kiosk_qr')  ← 사실 기록
│   · 해당 booking.attendance_outcome: pending → checked_in 자동 반영     ← 판정 초기값
│     (attendance_marked_by=NULL·marked_at=now, "kiosk 자동" 표기 — 코치가 세션보드에서
│      override 가능: 사실(checkins) vs 판정(attendance_outcome) 분리 원칙상 판정은 코치가 최종)
└ 후보 0건 → [시설 체크인]
    · checkins INSERT (session_id=NULL, checkin_method='kiosk_qr')
    · 예약 없이 수업 참여한 경우의 walk_in 판정은 코치 세션보드 권한(키오스크는 승격하지 않음)
```

### 4.4 서버 처리 — 원자적 RPC

- ⏳ **`fn_kiosk_checkin(p_payload jsonb, p_device_id uuid)`** — SECURITY DEFINER, §4.2~4.3 전체를 단일 트랜잭션으로 수행(중복 판정은 advisory lock 또는 UNIQUE 부분 인덱스로 동시 스캔 경합 차단). 반환 envelope `{success, data:{member_name, checkin_type: 'session'|'facility', session?, remaining_credits, membership_dday, duplicated}, error:{code}}`.
- ※ 본 RPC는 contract §4의 30종 목록 외 **신규 제안** — 07-data-model 확정 시 표준 목록 등재 필요(교차검수 항목). 근거: 검증 7단계+이중 쓰기(checkins+bookings)를 클라이언트 다중 쿼리로 두면 경합·부분실패가 구조적으로 발생.
- 체크인 성공 시 `notifications` INSERT(회원 앱 Realtime 토스트의 원천 — 03 §3.3 ④).

### 4.5 보조 경로 — 고정 QR (`qr_codes`)

시설 부착 인쇄형 고정 QR(Admin이 발급·관리)은 **역방향 경로**: 회원 폰 카메라로 스캔 → `/apps/checkin` 딥링크(동적 QR 화면 오픈). 고정 QR 자체는 체크인을 발생시키지 않는다 — 키오스크 프로토콜과 분리 유지.

---

## 5. QR 자동 디코딩 — 🧪 → ⏳ **정식 요구로 승격**

as-is는 자동 인식이 mock(수동 입력만 실동작)이었다. 재구축에서는 자동 디코딩을 **기본 경로·릴리즈 필수 요건**으로 승격한다.

| 계층 | 설계 |
|---|---|
| 1차: `BarcodeDetector` | 지원 브라우저(Chromium 계열 — 키오스크 표준 런타임)에서 네이티브 API 사용. `getUserMedia`(후면 카메라, 1280×720) → `requestAnimationFrame` 루프에서 `detect()` — 초당 ~10회 스로틀 |
| 2차: `jsQR` 폴백 | BarcodeDetector 미지원 시 canvas 프레임 캡처 → **Web Worker에서 jsQR 디코딩**(메인 스레드 블로킹 금지, 250ms 간격) |
| 3차: 수동 입력 | 카메라 권한 거부/하드웨어 고장 시에만 노출(전화번호 뒤 4자리 조회) — 상시 버튼에서 격하 |
| 판독 후 처리 | 동일 페이로드 3초 내 재판독 무시(단말 로컬 디바운스 — 서버 5분 중복 방지와 별개), 성공 시 비프음+햅틱 |
| 수용 기준 | 실내 조명에서 제시~success까지 **2초 이내**, 연속 10명 스캔 무실패, 카메라 스트림 24h 연속 구동 메모리 누수 없음(idle 복귀 시 스트림 해제 후 재획득) |

---

## 6. Heartbeat · 원격 제어 (`kiosk_devices`)

| 항목 | 설계 |
|---|---|
| Heartbeat | **30초 주기** `kiosk_devices.last_heartbeat=now()` UPDATE(단말 자신의 행만 — RLS: 지점 계정+device_id 일치). 페이지 어느 화면에서든 발신(앱 셸 레벨) |
| 상태 판정 | Admin 설정 화면: last_heartbeat 90초(3주기) 초과 → offline 표기 |
| 원격 명령 | Realtime 구독(`kiosk:{device_id}`): `reload`(강제 새로고침) / `to_idle` / `maintenance`(점검 오버레이) — Admin infrastructure 승계 화면에서 발행 |
| 현재 상태 | Heartbeat ✅ · 원격 명령 🔄(kiosk_devices 기반 정식화) |

---

## 7. 오프라인 폴백 ⏳ (신설)

네트워크 단절 시에도 입장 줄이 멈추지 않도록 로컬 큐를 둔다.

```
감지: heartbeat/체크인 요청 연속 실패 → 오프라인 모드 배지(idle·scan 공통)
스캔: ① 단말 로컬에서 §4.2 ①②만 검증(만료는 "스캔 시각" 기준)
      ② IndexedDB 큐에 {payload, scanned_at, device_id} 저장 (보존 24h, 초과분 폐기)
      ③ success 변형 화면: "체크인 접수됨 — 동기화 대기" (회원명·예약 정보는 표시 불가 명시)
복구: 큐 순서대로 fn_kiosk_checkin 재전송 — p_scanned_at 파라미터 추가 전달,
      서버는 만료(§4.2②)·중복(⑥)·±30분(§4.3)을 모두 scanned_at 기준으로 판정
      (등록된 kiosk_devices 단말의 요청에만 scanned_at 소급 허용 — 임의 클라이언트의 시각 조작 차단)
한계: 오프라인 중에는 멤버십/블랙리스트 검증 불가 → 동기화 시 거부되면 checkins 미기록
      + Admin 알림(사후 데스크 처리). 이 잔여 위험은 수용(입장 흐름 > 완전 검증)
```

## 8. 수용 시나리오 (재구축 완료 기준)

1. 회원 앱 QR 제시 → 자동 디코딩 → 2초 내 success(수업 체크인: 수업명 표기, `bookings.attendance_outcome=checked_in` 반영) → 코치 세션보드에 즉시 표시
2. 예약 없는 회원 → 시설 체크인(`checkins.session_id=NULL`) 분기 확인
3. 5분 경과 QR → QR_EXPIRED 토스트 후 스캔 재개(체크인 0건)
4. 동일 회원 3분 내 재스캔 → 중복 안내(신규 `checkins` 0건)
5. 네트워크 차단 → 오프라인 스캔 2건 큐잉 → 복구 → 서버 기록 2건·중복 0건, scanned_at 기준 판정 확인
6. Heartbeat 중단 90초 → Admin 화면 offline 표기 → `reload` 원격 명령 수신·재기동
