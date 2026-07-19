# race-service — PM5 BLE 브릿지

Concept2 PM5 로잉머신을 BLE로 읽어 Race 화면(Class TV·Coach)에 실시간 데이터를
공급하는 Python(asyncio) 서비스. 설계 SSOT: **`docs/15-race-system.md`**.

역할 경계(R-1): 이 서비스는 **BLE 통신·파싱·발행·레코딩·결과 적재**만 한다.
순위·팀 합산·PR 판정 등 레이스 규칙은 **계산하지 않는다**(Portal의 몫).

---

## 아키텍처 (3경로 파이프라인, docs/15 §3)

```
[PM5 ×~20]─BLE(멀티 동글)─▶ [race-service :8001 (SRK)]
                                 │
      경로1 (0.3s)              경로2 (5s)              경로3 (상시)
  Supabase Broadcast      race_live_state UPSERT     JSONL append(로컬)
  race:{event_id}         (재접속 복원, ephemeral)     recordings/{event}/{serial}.jsonl
  erg_update              (stop 시 DELETE)            (stop 시 race_records 멱등 적재)
```

- **경로1**: `race:{event_id}` 채널로 `erg_update`(≈3Hz) 발행. 채널·메시지 계약은
  포털의 `src/features/class-broadcast/contract.ts`(=`class-race/contract.ts`)와 1:1 동일.
  발행은 Supabase **Realtime HTTP Broadcast** 엔드포인트(`/realtime/v1/api/broadcast`)를 SRK로 호출.
- **경로2**: 5초마다 `race_live_state` UPSERT(재접속 시 거리 점프 복원). `stop` 시 전체 DELETE.
- **경로3**: 기기별 JSONL append(flush 1s/fsync). `stop` → 요약 → `race_records` 멱등 UPSERT.

포털 소비: Class 화면(`useRaceRealtime`)은 Broadcast를 1차로 구독하고, Broadcast
장애 시 `NEXT_PUBLIC_RACE_SERVICE_URL`이 설정돼 있으면 `GET /api/race/live`를 0.3s 폴링한다.

---

## 파일 구성

| 파일 | 역할 |
|---|---|
| `pm5.py` | PM5 GATT 상수 + 특성 파서(0x0031/0x0032/0x0033/0x0035). **바이트 파싱만** |
| `bridge.py` | BLE 멀티 어댑터 매니저(`PM5Manager`) + 레이스 오케스트레이터(`RaceBridge`) + 파이프라인 루프 |
| `supabase_io.py` | Broadcast 발행 / `race_live_state`·`race_records`·`race_recordings` 쓰기(SRK, RLS bypass) |
| `recorder.py` | JSONL 레코딩 + `_meta.json`(lane_assignments 보존) + 요약 추출 |
| `simulator.py` | 가상 레인 엔진(하드웨어 없이 L1 검증). 페이서 가상 레인도 재사용 |
| `server.py` | FastAPI(:8001) REST/WS 표면. 진입점 |
| `config.py` | 환경변수 로딩 단일 소스 |

---

## 실행

### 로컬 개발 — 시뮬레이터(하드웨어 불필요, L1)

```bash
cd race-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # SUPABASE_URL/SRK 채우면 실제 Broadcast까지 검증

# 방법 A: 부팅과 함께 자동 시뮬(6레인 + 페이서)
python server.py --simulate

# 방법 B: 서버만 띄우고 API로 제어
python server.py
curl -X POST localhost:8001/api/sim/start -d '{"lanes":8,"pacer":true}' -H 'content-type: application/json'
curl localhost:8001/api/race/live
```

`SUPABASE_URL`/`SRK` 미설정 시 Broadcast·DB 쓰기는 no-op(로컬 폴링만) — 그래도
`/api/race/live`로 앱 렌더 파이프라인 전체를 검증할 수 있다.

### 실장비 모드 (L2~L4) — BLE 필요

```bash
# 리눅스 + BlueZ + BLE 동글(hci0..). 스캔은 CAP_NET_ADMIN/권한 필요.
BLE_ADAPTERS=hci0,hci1 python server.py
curl "localhost:8001/api/ble/scan?duration=8"           # PM5 시리얼 발견
curl -X POST localhost:8001/api/ble/connect -H 'content-type: application/json' \
  -d '{"devices":[{"serial":"430123456"}]}'
```

### Docker (운영, docker-compose `--profile race`)

레포 루트 `docker-compose.yml`이 `build: ./race-service`로 참조한다. BLE 접근을 위해
`privileged: true`(운영 호스트 전용). 실행:

```bash
docker compose --profile race up -d race-service
```

권장: JSONL 영속화를 위해 `/data/recordings` 볼륨 마운트, `/dev` 및 D-Bus 소켓 노출.

---

## REST/WS API (docs/15 §2.3)

| Method Path | 용도 |
|---|---|
| `GET /` · `GET /health` | 버전·어댑터·연결누수 카운트 |
| `GET /api/ble/scan?duration=8` | PM5 스캔(시리얼 파싱) |
| `POST /api/ble/connect` `{devices:[{serial,adapter?}]}` | 명단 기반 연결(adapter 자동 분산) |
| `POST /api/ble/disconnect/{serial}` · `POST /api/ble/disconnect-all` | 해제 |
| `GET /api/ble/status` | 연결 상태·어댑터 |
| `POST /api/race/setup` | 편성 확정(lane_assignments) + 기기 racing 전환 |
| `POST /api/race/control` `{action}` | `lobby`\|`countdown`\|`start`\|`stop`\|`reset` |
| `GET /api/race/status?facility_id` | 이벤트/상태 폴백 조회 |
| `GET /api/race/live` | 현재 레인 스냅샷(Broadcast 폴백 폴링) |
| `GET /api/recordings` · `/{event_id}/summary` | JSONL 목록/요약 |
| `POST /api/recordings/{event_id}/load-results` | JSONL→race_records 멱등 적재(수동 재시도) |
| `POST /api/sim/{start,stop,reset}` · `GET /api/sim/status` | 시뮬레이터 제어(L1) |
| `WS /ws/race` | erg 스트림 폴백 채널 |

응답 봉투: `{success, data, error}`.

---

## PM5 GATT 파싱 — 하드웨어 검증 주의

`pm5.py`의 바이트 오프셋·스케일은 Concept2 "PM Bluetooth Smart Interface Definition"
공개 규격 **참조값**이다. 각 파서에 `[HW]` 주석으로 검증 포인트를 표기했다.

- **General Status (0x0031)**: elapsed(0.01s)·distance(0.1m)·workout_state — 진행 거리·상태 1차 소스
- **Additional Status 1 (0x0032)**: stroke_rate(SPM)·hr(255=무효)·pace(0.01s/500m)
- **Additional Status 2 (0x0033)**: avg power(W)·calories
- **Stroke Data (0x0035)**: 거리 보간 보강(파워/SPM는 Additional Status가 더 안정)

> **L2(단일 장비) 검증 필수**: 실제 PM5 firmware의 notify 페이로드를 로깅해 위 오프셋을
> 대조·확정할 것. `spm` 필드는 기기 종류별로 SPM/RPM/케이던스를 담는다(Concept2 규격
> 그대로, docs/15 §5b.3b) — 파서 분기 불필요, 화면 라벨만 교체.

READY 스킵(§2.4): `countdown` 중 데이터는 거리 산정에서 제외(조용히 무시). `start`
순간의 raw 누적거리를 0점 오프셋으로 저장 → 이후 `d = raw - offset`, GO 후 첫 값 `d≈0`.

---

## systemd (호스트 직접 구동 시 대안)

```ini
# /etc/systemd/system/race-service.service
[Unit]
Description=BCL PM5 BLE bridge
After=bluetooth.target network-online.target

[Service]
WorkingDirectory=/opt/bcl-portal/race-service
EnvironmentFile=/opt/bcl-portal/.env
ExecStart=/opt/bcl-portal/race-service/.venv/bin/python server.py
Restart=on-failure
# BLE 접근 권한
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_RAW

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now race-service
journalctl -u race-service -f
```

---

## 결과 적재와 순위 계산의 경계 (R-1)

`load-results`는 JSONL 요약을 `race_records`에 **집계 컬럼만**(거리·시간·watts·spm·hr·cal)
멱등 UPSERT한다. `finish_rank`·`is_pr`은 **Python이 계산하지 않는다** — Portal이
`fn_finish_race_event(event_id)`를 호출해 순위/PR을 확정한다(docs/15 §5.1·§6.2).
