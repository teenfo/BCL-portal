"""bridge.py — BLE 멀티 어댑터 매니저 + 레이스 오케스트레이션 (docs/15 §1·§2).

역할 R-1: BLE 스캔/연결/구독·파싱·발행·스냅샷·레코딩·종료 적재만. 순위/팀
합산/PR은 계산하지 않는다. 파서 이후 코드는 실장비/시뮬레이터가 100% 공유
(§6.4) — 두 입력 모두 on_sample()로 수렴한다.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable

import pm5
from config import Config
from recorder import LaneAssignment, Recorder
from supabase_io import SupabaseIO

log = logging.getLogger("race.bridge")

LobbyStatus = str  # setup | lobby | countdown | racing | finished


# ── BLE 스캔/연결 매니저 (멀티 동글 §1.2) ────────────────────────────────────
@dataclass
class ConnectedDevice:
    serial: str
    adapter: str
    client: Any  # bleak.BleakClient
    address: str


class PM5Manager:
    """어댑터별 라운드로빈 분산으로 PM5를 연결·구독한다.

    bleak는 메서드 내부에서 지연 import — BLE 스택(BlueZ)이 없는 환경(순수
    시뮬레이터 컨테이너)에서도 서버가 기동되도록.
    """

    def __init__(self, cfg: Config, on_notification: Callable[[str, str, bytes], None]) -> None:
        self.cfg = cfg
        self._on_notification = on_notification
        self._connected: dict[str, ConnectedDevice] = {}
        self._adapter_load: dict[str, int] = {a: 0 for a in cfg.ble_adapters}
        self._connect_count = 0
        self._disconnect_count = 0

    # 연결 누수 게이트(수용 5-3): connect == disconnect 카운트
    @property
    def leak_check(self) -> dict[str, int]:
        return {"connects": self._connect_count, "disconnects": self._disconnect_count}

    def _least_loaded_adapter(self) -> str:
        if not self.cfg.ble_adapters:
            return "hci0"
        return min(self._adapter_load, key=lambda a: self._adapter_load[a])

    async def scan(self, duration: int | None = None) -> list[dict[str, Any]]:
        """전 어댑터로 스캔 → PM5 광고만 필터, 시리얼 파싱(R-5)."""
        try:
            from bleak import BleakScanner
        except ImportError:
            log.error("bleak 미설치 — BLE 스캔 불가")
            return []
        dur = duration or self.cfg.scan_seconds
        found: dict[str, dict[str, Any]] = {}
        for adapter in self.cfg.ble_adapters:
            try:
                devices = await BleakScanner.discover(timeout=dur, adapter=adapter, return_adv=True)
            except Exception as exc:  # 어댑터 장애는 해당 어댑터만 스킵(§1.2)
                log.warning("scan on %s failed: %s", adapter, exc)
                continue
            for _addr, (dev, adv) in devices.items():
                name = adv.local_name or dev.name
                serial = pm5.parse_serial_from_name(name)
                if not serial:
                    continue
                found[serial] = {
                    "serial": serial,
                    "ble_name": name,
                    "mac": dev.address,
                    "rssi": adv.rssi,
                    "adapter": adapter,
                }
        return list(found.values())

    async def connect(self, devices: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """명단 기반 연결. adapter 미지정 시 최소부하 어댑터 배정(M-4)."""
        try:
            from bleak import BleakClient
        except ImportError:
            return [{"serial": d.get("serial"), "connected": False, "error": "bleak 미설치"} for d in devices]

        results: list[dict[str, Any]] = []
        for d in devices:
            serial = str(d.get("serial"))
            if serial in self._connected:
                results.append({"serial": serial, "connected": True, "adapter": self._connected[serial].adapter})
                continue
            adapter = d.get("adapter") or self._least_loaded_adapter()
            address = d.get("mac")
            try:
                if not address:
                    # MAC 미지정(iOS/Mac 은닉) → 시리얼로 재스캔하여 주소 확보
                    address = await self._resolve_address(serial, adapter)
                if not address:
                    raise RuntimeError("주소 미확인")
                client = BleakClient(address, adapter=adapter)
                await client.connect()
                await self._subscribe(client, serial)
                self._connected[serial] = ConnectedDevice(serial, adapter, client, address)
                self._adapter_load[adapter] = self._adapter_load.get(adapter, 0) + 1
                self._connect_count += 1
                results.append({"serial": serial, "connected": True, "adapter": adapter})
            except Exception as exc:
                log.warning("connect %s failed: %s", serial, exc)
                results.append({"serial": serial, "connected": False, "error": str(exc)})
        return results

    async def _resolve_address(self, serial: str, adapter: str) -> str | None:
        from bleak import BleakScanner

        dev = await BleakScanner.find_device_by_filter(
            lambda d, adv: pm5.parse_serial_from_name(adv.local_name or d.name) == serial,
            timeout=self.cfg.scan_seconds,
            adapter=adapter,
        )
        return dev.address if dev else None

    async def _subscribe(self, client: Any, serial: str) -> None:
        def _make_handler(char_uuid: str):
            def _handler(_sender: Any, data: bytearray) -> None:
                self._on_notification(serial, char_uuid, bytes(data))
            return _handler

        for char in pm5.SUBSCRIBE_CHARACTERISTICS:
            try:
                await client.start_notify(char, _make_handler(char))
            except Exception as exc:  # 특성 미지원 펌웨어는 스킵(관대)
                log.debug("start_notify %s on %s skipped: %s", char, serial, exc)

    async def disconnect(self, serial: str) -> bool:
        dev = self._connected.pop(serial, None)
        if not dev:
            return False
        try:
            await dev.client.disconnect()
        except Exception as exc:
            log.debug("disconnect %s error: %s", serial, exc)
        self._adapter_load[dev.adapter] = max(0, self._adapter_load.get(dev.adapter, 1) - 1)
        self._disconnect_count += 1
        return True

    async def disconnect_all(self) -> int:
        serials = list(self._connected.keys())
        n = 0
        for s in serials:
            if await self.disconnect(s):
                n += 1
        return n

    def status(self) -> list[dict[str, Any]]:
        return [
            {"serial": d.serial, "adapter": d.adapter, "address": d.address, "connected": True}
            for d in self._connected.values()
        ]


# ── 레이스 오케스트레이터 ────────────────────────────────────────────────────
@dataclass
class LaneState:
    assignment: LaneAssignment
    sample: pm5.PM5Sample = field(default_factory=pm5.PM5Sample)
    offset_m: float = 0.0        # start 시 0점 오프셋(READY 스킵 §2.4)
    last_seen: float = 0.0       # 마지막 수신 monotonic — 단절 판정
    virtual: bool = False        # 페이스보트 가상 레인(렌더 전용 §4b.5)


class RaceBridge:
    def __init__(self, cfg: Config, io: SupabaseIO) -> None:
        self.cfg = cfg
        self.io = io
        self.manager = PM5Manager(cfg, self.on_notification)

        self.event_id: str | None = None
        self.facility_id: str = cfg.facility_id
        self.race_format: str = "individual"
        self.target_distance_m: int | None = None
        self.duration_s: int | None = None
        self.heat_no: int = 1
        self.lobby_status: LobbyStatus = "setup"
        self.started_at: float | None = None  # epoch ms(broadcast 기준)

        # serial → LaneState
        self.lanes: dict[str, LaneState] = {}
        self.recorder: Recorder | None = None
        self._tasks: list[asyncio.Task] = []
        self._lock = asyncio.Lock()

    # ── 파서 콜백(실장비/시뮬 공통 수렴점) ──
    def on_notification(self, serial: str, char_uuid: str, data: bytes) -> None:
        lane = self.lanes.get(serial)
        if lane is None:
            return
        pm5.apply_notification(lane.sample, char_uuid, data)
        lane.last_seen = time.monotonic()

    def ingest_sample(self, serial: str, sample: pm5.PM5Sample, *, virtual: bool = False) -> None:
        """시뮬레이터 전용 진입점 — 완성된 PM5Sample을 직접 주입(파서 우회)."""
        lane = self.lanes.get(serial)
        if lane is None:
            # 시뮬/페이서가 setup 없이 넣는 경우 임시 레인 생성
            lane = LaneState(assignment=LaneAssignment(lane=len(self.lanes) + 1, device_serial=serial), virtual=virtual)
            self.lanes[serial] = lane
        lane.sample = sample
        lane.virtual = virtual
        lane.last_seen = time.monotonic()

    # ── 진행 거리(READY 스킵·0점 오프셋 §2.4) ──
    def _distance(self, lane: LaneState) -> float:
        if self.lobby_status != "racing":
            return 0.0
        return max(0.0, lane.sample.distance_m - lane.offset_m)

    def _connection_status(self, lane: LaneState) -> str:
        if lane.last_seen == 0.0:
            return "idle"
        age = time.monotonic() - lane.last_seen
        if age > 120:      # 2분+ 무동작 = PM5 절전(§3.4)
            return "offline"
        if age > 3:        # 완전 단절
            return "disconnected"
        return "racing" if self.lobby_status == "racing" else "connected"

    def _erg_payload(self, serial: str, lane: LaneState) -> dict[str, Any]:
        """class-race/contract.ts ErgUpdate와 동일 축약 필드."""
        s = lane.sample
        payload: dict[str, Any] = {
            "device_serial": serial,
            "device_id": lane.assignment.device_id,
            "lane": lane.assignment.lane,
            "d": round(self._distance(lane), 2),
            "p": round(s.power_w, 1),
            "spm": round(s.stroke_rate_spm, 1),
            "hr": s.hr_bpm,
            "cal": s.calories,
            "max_w": round(s.max_w, 1),
            "ts": int(time.time() * 1000),
        }
        if lane.virtual:
            payload["virtual_lane"] = True  # 렌더 전용(§4b.5)
        return payload

    # ── setup / control ──
    async def setup(self, payload: dict[str, Any]) -> dict[str, Any]:
        async with self._lock:
            self.event_id = str(payload["event_id"])
            self.race_format = payload.get("race_format", "individual")
            self.target_distance_m = payload.get("target_distance_m")
            self.duration_s = payload.get("duration_s")
            self.heat_no = int(payload.get("heat_no", 1) or 1)
            self.lanes.clear()
            assignments: list[LaneAssignment] = []
            for la in payload.get("lane_assignments", []):
                a = LaneAssignment(
                    lane=int(la["lane"]),
                    device_serial=str(la["device_serial"]),
                    device_id=la.get("device_id"),
                    member_id=la.get("member_id"),
                    member_name=la.get("member_name"),
                    team_id=la.get("team_id"),
                )
                assignments.append(a)
                self.lanes[a.device_serial] = LaneState(assignment=a)
            self.lobby_status = "setup"
            # 참여 기기 모드락 racing 전환(§4.2)
            serials = [a.device_serial for a in assignments if not a.device_serial.startswith(("SIM-", "PACER-"))]
            if serials:
                await self.io.set_device_mode(serials, "racing")
            return self._status_snapshot()

    async def control(self, action: str) -> dict[str, Any]:
        if not self.event_id:
            return {"error": "no active event"}
        async with self._lock:
            if action == "lobby":
                self.lobby_status = "lobby"
            elif action == "countdown":
                self.lobby_status = "countdown"
                # TV 신호등·승선 연출 트리거 — broadcast 없이는 실이벤트에서 countdown 상태
                # 도달 불가(데모 전용이 됨). TV CountdownOverlay는 3초 고정 표시 연출.
                await self.io.broadcast(
                    self.event_id,
                    "race_countdown",
                    {"event_id": self.event_id, "seconds": 3, "ts": int(time.time() * 1000)},
                )
            elif action == "start":
                await self._do_start()
            elif action == "stop":
                await self._do_stop()
            elif action == "reset":
                await self._do_reset()
            else:
                return {"error": f"unknown action: {action}"}
            return self._status_snapshot()

    async def _do_start(self) -> None:
        # 0점 오프셋 캡처(§2.4) — start 순간 raw 누적거리를 기준점으로
        for lane in self.lanes.values():
            lane.offset_m = lane.sample.distance_m
        self.lobby_status = "racing"
        self.started_at = time.time() * 1000
        # 레코더 open
        self.recorder = Recorder(self.cfg.recordings_dir, self.event_id, self.cfg.flush_interval_s)
        self.recorder.start(
            [l.assignment for l in self.lanes.values() if not l.virtual],
            self.race_format,
            self.heat_no,
        )
        assert self.event_id
        await self.io.broadcast(self.event_id, "race_start", {"event_id": self.event_id, "ts": int(self.started_at)})

    async def _do_stop(self) -> None:
        self.lobby_status = "finished"
        assert self.event_id
        await self.io.broadcast(self.event_id, "race_finish", {"event_id": self.event_id, "ts": int(time.time() * 1000)})
        # 종료 시 자동 load-results 트리거(M-1) + live_state DELETE
        await self._load_results()
        await self.io.delete_live_state(self.event_id)

    async def _do_reset(self) -> None:
        self.lobby_status = "lobby"
        self.started_at = None
        for lane in self.lanes.values():
            lane.offset_m = lane.sample.distance_m
        assert self.event_id
        await self.io.broadcast(self.event_id, "race_reset", {"event_id": self.event_id, "ts": int(time.time() * 1000)})

    async def load_results(self) -> dict[str, Any]:
        """수동 재시도 가능한 결과 적재(멱등)."""
        async with self._lock:
            n = await self._load_results()
            return {"loaded": n}

    async def _load_results(self) -> int:
        if not self.recorder or not self.event_id:
            return 0
        self.recorder.close()
        summaries = self.recorder.summarize()
        rows: list[dict[str, Any]] = []
        # serial → assignment 역참조(가상 레인 제외 — §4b.5)
        by_serial = {s: l for s, l in self.lanes.items() if not l.virtual}
        for serial, summ in summaries.items():
            lane = by_serial.get(serial)
            if not lane or not lane.assignment.member_id:
                continue  # member 미배정 레인은 결과 적재 대상 아님
            rows.append(
                {
                    "event_id": self.event_id,
                    "member_id": lane.assignment.member_id,
                    "team_id": lane.assignment.team_id,
                    "device_serial": serial,
                    "lane_number": lane.assignment.lane,
                    "result_distance": summ["result_distance"],
                    "result_time": _interval(summ["duration_seconds"]),
                    "calories_burned": summ["calories_burned"],
                    "avg_watts": summ["avg_watts"],
                    "max_watts": summ["max_watts"],
                    "avg_spm": summ["avg_spm"],
                    "avg_hr_bpm": summ["avg_hr_bpm"],
                    "max_hr_bpm": summ["max_hr_bpm"],
                    # finish_rank·is_pr은 Portal의 fn_finish_race_event가 계산(R-1)
                }
            )
        return await self.io.upsert_records(rows)

    async def disconnect_all_and_idle(self) -> dict[str, Any]:
        """[레이스 룸 종료] — BLE 일괄 해제 + 기기 idle 복귀(§1.4)."""
        n = await self.manager.disconnect_all()
        serials = [s for s in self.lanes if not s.startswith(("SIM-", "PACER-"))]
        if serials:
            await self.io.set_device_mode(serials, "idle")
        return {"disconnected": n}

    # ── 라이브 스냅샷(폴백 폴링 & Broadcast 공용) ──
    def live_snapshot(self) -> list[dict[str, Any]]:
        return [self._erg_payload(s, l) for s, l in self.lanes.items()]

    def _status_snapshot(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "facility_id": self.facility_id,
            "lobby_status": self.lobby_status,
            "race_format": self.race_format,
            "target_distance_m": self.target_distance_m,
            "heat_no": self.heat_no,
            "elapsed": (time.time() * 1000 - self.started_at) / 1000 if self.started_at else 0,
            "lanes": len(self.lanes),
        }

    def status(self) -> dict[str, Any]:
        return self._status_snapshot()

    # ── 파이프라인 루프 ──
    def start_loops(self) -> None:
        self._tasks = [
            asyncio.create_task(self._broadcast_loop()),
            asyncio.create_task(self._snapshot_loop()),
        ]

    async def stop_loops(self) -> None:
        for t in self._tasks:
            t.cancel()
        for t in self._tasks:
            try:
                await t
            except asyncio.CancelledError:
                pass
        self._tasks = []

    async def _broadcast_loop(self) -> None:
        """경로1: erg_update 0.3s(≈3Hz). racing 중에만 JSONL append."""
        interval = 1.0 / max(self.cfg.broadcast_hz, 0.5)
        while True:
            try:
                if self.event_id and self.lobby_status == "racing":
                    msgs: list[tuple[str, str, dict[str, Any]]] = []
                    for serial, lane in self.lanes.items():
                        payload = self._erg_payload(serial, lane)
                        msgs.append((self.event_id, "erg_update", payload))
                        # 경로3: 실레인만 기록(가상 레인 제외 §4b.5)
                        if self.recorder and not lane.virtual:
                            self.recorder.append(
                                serial,
                                {
                                    "ts": payload["ts"],
                                    "d": payload["d"],
                                    "p": payload["p"],
                                    "spm": payload["spm"],
                                    "hr": payload["hr"],
                                    "cal": payload["cal"],
                                    "max_w": payload["max_w"],
                                },
                            )
                    if msgs:
                        await self.io.broadcast_many(msgs)
            except Exception as exc:  # 루프 죽지 않도록
                log.warning("broadcast loop error: %s", exc)
            await asyncio.sleep(interval)

    async def _snapshot_loop(self) -> None:
        """경로2: race_live_state 5s UPSERT(재접속 복원, ephemeral)."""
        while True:
            await asyncio.sleep(self.cfg.snapshot_interval_s)
            try:
                if not (self.event_id and self.lobby_status == "racing"):
                    continue
                rows = []
                for serial, lane in self.lanes.items():
                    if lane.virtual or not lane.assignment.device_id:
                        continue  # 가상 레인/미등록 device_id 제외
                    rows.append(
                        {
                            "event_id": self.event_id,
                            "device_id": lane.assignment.device_id,
                            "member_id": lane.assignment.member_id,
                            "team_id": lane.assignment.team_id,
                            "lane_number": lane.assignment.lane,
                            "distance_m": round(self._distance(lane), 2),
                            "power_w": round(lane.sample.power_w, 2),
                            "stroke_rate_spm": round(lane.sample.stroke_rate_spm, 1),
                            "hr_bpm": lane.sample.hr_bpm,
                            "calories_burned": lane.sample.calories,
                            "max_watts": round(lane.sample.max_w, 2),
                            "connection_status": self._connection_status(lane),
                        }
                    )
                if rows:
                    await self.io.upsert_live_state(rows)
                    # state_snapshot broadcast(§3.1) — 재접속 즉시 반영용
                    await self.io.broadcast(
                        self.event_id, "state_snapshot", {"lanes": self.live_snapshot()}
                    )
            except Exception as exc:
                log.warning("snapshot loop error: %s", exc)


def _interval(seconds: float) -> str:
    """초 → Postgres INTERVAL 문자열(HH:MM:SS.ss)."""
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:05.2f}"
