# BCL Portal – Race 시스템 기획서

> **Status**: In Progress
> **Author**: Architect (Opus/Gemini)
> **Created**: 2026-02-19
> **Last Updated**: 2026-02-21 (Session 7)
> **Related**: `.docs/planning/remaining-improvements.md`, `.docs/archive/technical/race/`

---

## 1. 아키텍처 오버뷰 (명확한 역할 분담)

이 레이스 프로그램의 가장 중요하고 핵심적인 전제는 다음과 같습니다.

1. **Python (하드웨어 브릿지)**
   - 오직 **장비(PM5)의 BLE 연결 및 실시간 데이터 수신**만을 담당합니다.
   - 복잡한 레이스 로직에 관여하지 않으며, 순수하게 기계의 상태만 브로드캐스트합니다.
   - **다중 기기 및 동글 연결**: 레이스는 최대 **20개**의 기기까지 연결될 수 있습니다. 이를 위해 파이썬 시스템은 단일 블루투스를 넘어서 여러 개의 동글 인식을 통해 대규모 Connection을 스로틀링 없이 감당할 수 있도록 분산/비동기 설계가 포함됩니다.
2. **Next.js Admin (머신 정보 관리)**
   - 이미 어드민 화면에 각 머신(로잉 머신, 스키용 등)의 기본 정보(`pm5_devices` 등)가 등록 및 관리되고 있습니다.
3. **Next.js Portal (레이스 본진)**
   - 파이썬에서 보내주는 실시간 데이터를 수신하여, 실제 **레이싱 뷰(2.5D) 렌더링 및 진행 논리**를 전담합니다.

---

## 2. 개요 및 핵심 난이도

**목적**: 기존 독립 서버에서 파편화되어 동작하던 레이스 시스템을 BCL Portal (Next.js + Supabase)로 완전히 편입.

**핵심 난이도 포인트**:
1. **2.5D 레이스 화면 (⭐⭐⭐⭐⭐)**: 원근감, 애니메이션 보간(LERP), 캐릭터 동기화, 이펙트 처리가 요구됨.
2. **실시간 데이터 파이프라인 (⭐⭐⭐⭐)**: PM5 BLE → Python 로컬서버 → Supabase Realtime → 클라이언트로 0.3초 내 스트리밍.

---

## 3. 세부 시스템 설계 (To-Be)

### 2.1 아키텍처 및 상태 흐름
* **로컬 통신 (Python 서버)**: Coach PC에서 실행. `Bleak`로 PM5 스캔 및 구독, BLE 데이터를 파싱하여 Supabase Realtime 채널(`race:{event_id}`)로 Broadcast 전송. 실시간 원시 데이터는 `.jsonl` 형태로 로컬 레코딩 보관.
* **프론트엔드 (Next.js)**: `useRaceRealtime` 훅으로 상태 구독.
* **레이스 운영 주체**: Coach (`/coach/race/control` 접속으로 제어 수행). Admin은 읽기 전용으로 임베드 모니터링 가능.

### 2.2 2.5D Race Live View 애니메이션 및 동기화 (핵심)
* **상태 보간 (State Interpolation - LERP)**: Realtime 수신 주기(2~5Hz)로 인한 끊김 방지. `requestAnimationFrame` 내에서 이전 수신 거리와 목표 거리 간 LERP 처리 및 등속 예측(Prediction) 적용.
* **로잉 애니메이션 제어**: 실시간 SPM 에 반비례하여 CSS `animation-duration` 조절.
* **Edge Case 대응**: 
  - 1초 이상 수신 지연 시 Mock 전진 + `[Reconnecting]` 배지.
  - 완전 단절 시 레인 Grayscale 처리 및 정지 애니메이션(IDLE).
* **렌더링 기술 선택**: **CSS 3D Transform (원근감) + Canvas 2D (물 이펙트) 하이브리드**. MVP 특성상 PixiJS의 무거운 번들을 피함.

---

## 3. 장비 등록 및 스캔 프로세스 (Web Bluetooth ↔ Python 분업)

사용자의 뛰어난 아이디어를 적용하여, **장비 등록은 브라우저(Web Bluetooth API)**가 담당하고, **실제 레이스 하드코어 통신만 Python**이 전담하도록 설계합니다.

1. **Web Bluetooth 스캔 (Next.js Admin)**:
   - 기기 등록 모달 내에 `[장비 스캔]` 버튼을 누르면, 파이썬 서버를 호출할 필요 없이 **브라우저에 내장된 Web Bluetooth API** 창이 즉각 열립니다.
   - 관리자는 태블릿이나 핸드폰을 들고 체육관을 돌아다니며 주변의 PM5 장비를 즉석에서 스캔하고 손쉽게 모바일 환경에서 등록할 수 있습니다. (파이썬 서버 구동 불필요)

2. **기존 모달 Select Box 연동 (Next.js 내부)**:
   - Web Bluetooth 스캔으로 식별된 기기 중, **이미 DB(`pm5_devices`)에 등록된 시리얼/MAC 주소는 제외**합니다.
   - 신규 기기 정보(MAC 주소 또는 시리얼 포함 기기명)만이 모달 내의 **셀렉트박스(Select Box)**에 나타납니다.

3. **고유 식별자 저장 (Admin UI → Supabase)**:
   - 선택된 기기의 지점, 장비 종류(Rower/Ski), 초기 상태 등을 지정하고 저장합니다.
   - *주의점(Edge Case)*: Mac/iOS 계열의 Web Bluetooth는 보안상 실제 MAC 주소 대신 임의의 UUID를 반환합니다. 이를 방어하기 위해 기기명에 포함된 **PM5 고유 시리얼 넘버(예: PM5 430123456)**를 주 식별자로 파싱하여 `pm5_devices`에 저장합니다.

4. **실전 레이스 통신 (Python 서버의 책임)**:
   - 레이스 전용 운영 PC에 설치된 파이썬 서버는 DB에 저장된 `pm5_devices` 명단(시리얼/MAC 기반)을 읽어들입니다.
   - 이후 실제 레이스가 가동될 때는 파이썬이 다중 동글들을 활용해 해당 명단의 머신들과 강력한 스로틀링 없는 다중 연결(Connection)을 수행합니다.

---

## 4. 데이터베이스 및 채널 변경사항

### 4.1 신규 및 확장 테이블
1. **`race_live_state`**: 레이스 중 실시간 상태 저장 (event_id, erg_id, distance_m, power_w 등).
2. **`race_recordings`**: Python 서버가 기록한 JSONL 파일의 메타데이터 요약 정보 보관.
3. **`pm5_devices` (기존 테이블 확장)**: 
   - BLE 스캔/식별용 `mac_address`, `ble_name` 컬럼 추가.
   - **QR 인식용 식별자**: 각 기기의 `id(UUID)` 또는 식별 해시 값을 생성하여 물리적 QR 코드로 부착.
   - **현재 상태(`current_mode`)**: `idle`, `racing`, `personal_recording` 등의 상태를 추가하여, 레이스 진행 중인 기기에 개인 기록용 스캔이 개입하지 못하도록 충돌을 방어.

### 4.2 Personal Recording (QR 바인딩) 연동을 위한 레이스 시스템의 요구사항
추후 도입될 **사용자 QR 스캔 기반 개인 기록 시스템**과 레이스 시스템이 매끄럽게 호환되기 위해 다음 메커니즘이 사전에 고려/반영되어야 합니다.

1. **기기 고유 식별 주소 체계**:
   - 기기 등록 시, 어드민 화면에서 기기별 고유 접속 URL(예: `/apps/erg/bind?device_id=UUID`)이 담긴 QR 코드 이미지를 생성/출력할 수 있는 기능이 필요합니다.
2. **레이스 대기방(Lobby) 자율 배정(Realtime)**:
   - 코치가 수동으로 레인에 사람을 배정하는 방식뿐만 아니라, **QR 자율 배정 모드**가 필요합니다.
   - 코치가 레이스 방을 열면, 참가자들이 각자 자리에 앉아 기기 앞의 QR을 찍습니다.
   - 레이스 시스템(`Next.js`)은 `Supabase Realtime`을 통해 누가 어떤 기기(레인)에 앉았는지 즉각 수신하여 화면에 프로필을 동적으로 띄워주어야 합니다.
3. **세션 충돌 제어 (Locking)**:
   - 기기가 '레이스 진행 중(racing)' 상태일 때, 외부 사용자가 실수로 QR을 스캔하여 개인 기록(Personal Recording) 모드로 탈취가 일어나지 않도록 막는 **Lock 메커니즘**이 필요합니다.

### 4.3 Realtime Channel
* **이름**: `race:{event_id}`
* **Events**: `race_start`, `race_finish`, `race_reset`, `erg_update`, `state_snapshot`

---

## 5. 프론트엔드 화면 구성

| 구분 | 화면 로케이션 | 주요 역할 |
|---|---|---|
| **운영** | `🆕 /coach/race/control` | Coach 전용. 레이스 설정, BLE 연결, 전체 시작/종료, 레인 배정 |
| **관전** | `🆕 /class/race/live` | 2.5D 레이싱 뷰, 대형 스크린(TV) 렌더링 목적 |
| **관전** | `🆕 /class/race/run` | 데이터 중심의 ERG 실시간 상황 그리드 |
| **운영** | `🔄 /admin/operations/race` | Coach 레이스 제어 화면 임베드, 이벤트 CRUD |
| **결과** | `🆕 /class/race/result` | 종료 후 최종 리더보드 및 PR 표기 |

---

## 6. 구현 단계 및 관점 배분

*(참고: Phase 5 핵심 렌더링은 세분화되어 진행)*

| Phase | 내용 | 담당 주체 | 소요기한 |
|---|---|---|---|
| **Phase A** | `pm5_devices` 컬럼 확장 및 `race_recordings` 마이그레이션 | 💎 Senior Dev | 0.5일 |
| **Phase B** | Python FastAPI + Bleak 인프라 구성 및 JSONL 레코더 구현 | ⚡ Specialist | 1.5일 |
| **Phase C** | 프론트엔드 기기 등록, 레코딩 제어 UI, Realtime 바인딩 기본 | 🎨 UI Developer | 1.0일 |
| **Phase 1** | 기반 인프라 (`race_live_state` 생성, Realtime 훅 구현) | 💻 Developer | 1.0일 |
| **Phase 2~4** | 레코딩 기반 시뮬레이터 재생, 그리드 뷰 화면, BLE 연동 안정화 | ⚡ Specialist | 3.5일 |
| **Phase 5-A** | 2.5D 개발 준비 - HUD 바인딩 프레임 기반 평면 LERP 이동 | ⚡ Specialist | 1.0일 |
| **Phase 5-B** | 2.5D 그래픽 적용 - CSS 3D 적용, 캐릭터 애니메이션, 물 파티클 | ⚡ Specialist | 2.0일 |
| **Phase 5-C** | 2.5D 폴리싱 - 선두 이펙트, 예외(Edge Case) 처리, 메모리 최적화 | ⚡ Specialist | 1.0일 |
| **Phase 6~7** | 최종 결과 자동 기록 연동, 프로젝트 블루프린트 및 문서 동기화 | 🏛️ Architect / 💻 Dev | 1.0일 |

---

## 7. 테스트 및 검증 시나리오

1. **로컬 모킹을 통한 시뮬레이션 E2E**: 기존 레코딩된 jsonl을 Replay 하여 9개의 다중 레인 브로드캐스트 부하 및 동기화 무결점 검증(300ms 랙 내 LERP 보정).
2. **Edge Case 발현**: 강제 네트워크 단절 1초 / 10초 대기에 따른 Grayscale 및 반투명 텍스트 전환 검증.
3. **BLE 실기기 연동**: Python 스캔 → 프론트엔드 확정 → `pm5_devices` 병합 → 라이브 레이스 세일.

---

## 8. 리스크 및 완화

* **BLE 동시 연결 한계 (다중 기기)**: 하나의 일반적인 블루투스 동글이 안정적으로 관리할 수 있는 동시 연결은 7~10대입니다. 20대를 수용하기 위해 파이썬 환경에서 다수의 동글(또는 어댑터)을 분산하여 스캔/연결하는 로직을 고도화해야 합니다.
* **보간법 최적화 실패/성능 저하**: React 렌더링 비용이 클 시 `requestAnimationFrame` 레벨에서 직접 DOM 객체를 통제하여 React State 변경 사이클을 Bypass 구성.
* **BLE 환경 문제 및 식별자 불일치**: Apple 기기(Mac/iOS)의 Web Bluetooth는 하드웨어 고유 MAC을 숨깁니다. 따라서 Admin(웹)과 파이썬 간의 매칭 키를 MAC이 아닌 **기기 이름에 포함된 PM5 시리얼 넘버**로 통일하도록 로직 방어를 구축해야 합니다.

---

## 9. Planning Log

### Session 1~4 (2026-02-19 ~ 21) 요약
- 레거시 아키텍처 분석(FastAPI 통신 프로토콜, Python BLE 패킷 수신 등) 결과, 연산과 데이터 표출은 BCL-Portal 생태계(Next.js+Supabase) 내로 편입하기로 설계 확정.
- Coach 중심의 실시간 운영 통제가 가능하게 프론트엔드 구조 채택. DB(`race_live_state` 및 `race_recordings`) 구조 신설안 추가 완료.

### Session 5 (2026-02-21) 요약
- 가장 큰 난이도인 '2.5D 레이스 뷰' 해결을 위해 LERP 위치 보간 프레임 이동 및 에지 케이스 정책 상세 설정 완료. 작업 단위를 Phase 5-A, B, C로 세분화.

### Session 7 (2026-02-21)
- **변경 사항**: 장황했던 레거시 사양 설명 및 파이썬 로직, 자잘한 컴포넌트 구조 묘사를 제거하고, 일관성 있는 **가독성 중심의 정보 압축 재편**을 진행함 (1080라인 -> 130라인 대규모 압축).
- **Status**: **In Progress**
- **TODO (진행 중)**: 사용자 요구사항을 집중 반영하여 기획을 추가 고도화할 부분 대기 중.
