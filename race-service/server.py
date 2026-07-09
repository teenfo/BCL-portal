"""server.py — race-service FastAPI (:8001) (docs/15 §2.3).

REST 제어 표면 + Broadcast 폴백(/api/race/live 폴링, WS /ws/race). CORS는
내부망 전용(수용 6-2). SRK는 config env로만(R-6).

실행:
  python server.py                 # 실장비 모드(BLE)
  python server.py --simulate      # 하드웨어 없이 시뮬레이터(L1)
  RACE_SIMULATE=1 python server.py # env로 시뮬 토글
  uvicorn server:app --port 8001   # ASGI 직접 기동
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import logging
import os
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from bridge import RaceBridge
from config import load_config
from recorder import cleanup_old_recordings
from simulator import Simulator
from supabase_io import SupabaseIO

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("race.server")

VERSION = "1.0.0"

cfg = load_config()
io = SupabaseIO(cfg.supabase_url, cfg.service_role_key)
bridge = RaceBridge(cfg, io)
simulator = Simulator(bridge)


def _ok(data: Any = None) -> JSONResponse:
    return JSONResponse({"success": True, "data": data, "error": None})


def _err(message: str, status: int = 400) -> JSONResponse:
    return JSONResponse({"success": False, "data": None, "error": message}, status_code=status)


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI):
    bridge.start_loops()
    if cfg.simulate:
        log.info("SIMULATE 모드 — 가상 레인 기동")
        simulator.build(lane_count=6, with_pacer=True, event_id="sim-event")
        # 시뮬은 racing으로 바로 전이(오프셋 0 = raw 거리 그대로 브로드캐스트)
        bridge.lobby_status = "racing"
        await simulator.start()
    # 레코딩 보관 정리(기동 시 1회)
    with contextlib.suppress(Exception):
        removed = cleanup_old_recordings(cfg.recordings_dir, cfg.recording_retention_days)
        if removed:
            log.info("오래된 레코딩 %d개 정리", removed)
    yield
    await simulator.stop()
    await bridge.stop_loops()
    await io.aclose()


app = FastAPI(title="BCL race-service", version=VERSION, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(cfg.cors_origins),
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)",
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── 상태 ─────────────────────────────────────────────────────────────────────
@app.get("/")
@app.get("/health")
async def health() -> JSONResponse:
    return _ok(
        {
            "version": VERSION,
            "adapters": list(cfg.ble_adapters),
            "simulate": cfg.simulate,
            "supabase": io.enabled,
            "leak_check": bridge.manager.leak_check,
            "lobby_status": bridge.lobby_status,
        }
    )


# ── BLE ──────────────────────────────────────────────────────────────────────
@app.get("/api/ble/scan")
async def ble_scan(duration: int = 8) -> JSONResponse:
    return _ok(await bridge.manager.scan(duration))


@app.post("/api/ble/connect")
async def ble_connect(body: dict[str, Any]) -> JSONResponse:
    devices = body.get("devices", [])
    return _ok(await bridge.manager.connect(devices))


@app.post("/api/ble/disconnect/{serial}")
async def ble_disconnect(serial: str) -> JSONResponse:
    return _ok({"disconnected": await bridge.manager.disconnect(serial)})


@app.post("/api/ble/disconnect-all")
async def ble_disconnect_all() -> JSONResponse:
    return _ok(await bridge.disconnect_all_and_idle())


@app.get("/api/ble/status")
async def ble_status() -> JSONResponse:
    return _ok({"devices": bridge.manager.status(), "leak_check": bridge.manager.leak_check})


# ── Race 제어 ────────────────────────────────────────────────────────────────
@app.post("/api/race/setup")
async def race_setup(body: dict[str, Any]) -> JSONResponse:
    if "event_id" not in body:
        return _err("event_id 필수")
    return _ok(await bridge.setup(body))


@app.post("/api/race/control")
async def race_control(body: dict[str, Any]) -> JSONResponse:
    action = body.get("action")
    if action not in {"lobby", "countdown", "start", "stop", "reset"}:
        return _err(f"invalid action: {action}")
    res = await bridge.control(action)
    if "error" in res:
        return _err(res["error"])
    return _ok(res)


@app.get("/api/race/status")
async def race_status(facility_id: str | None = None) -> JSONResponse:
    # §7.3: facility 스코프. 인스턴스가 시설당 1개이므로 불일치 시 404 성격.
    if facility_id and cfg.facility_id and facility_id != cfg.facility_id:
        return _err("facility 불일치", status=404)
    return _ok(bridge.status())


@app.get("/api/race/live")
async def race_live() -> JSONResponse:
    """Broadcast 불가 시 0.3s 폴링 폴백 — useRaceRealtime가 j.data 소비."""
    return _ok(bridge.live_snapshot())


# ── Recordings ───────────────────────────────────────────────────────────────
@app.get("/api/recordings")
async def recordings_list() -> JSONResponse:
    base = cfg.recordings_dir
    events = []
    if os.path.isdir(base):
        events = [d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d))]
    return _ok({"events": events})


@app.get("/api/recordings/{event_id}/summary")
async def recordings_summary(event_id: str) -> JSONResponse:
    from recorder import Recorder

    rec = Recorder(cfg.recordings_dir, event_id, cfg.flush_interval_s)
    return _ok(rec.summarize())


@app.post("/api/recordings/{event_id}/load-results")
async def recordings_load_results(event_id: str) -> JSONResponse:
    # stop이 자동 호출하나 수동 재시도 가능(멱등, M-1)
    if bridge.event_id != event_id:
        return _err("활성 이벤트가 아님 — stop 후 자동 적재됨", status=409)
    return _ok(await bridge.load_results())


# ── Simulation (L1 검증 전용 §6.4) ───────────────────────────────────────────
@app.post("/api/sim/start")
async def sim_start(body: dict[str, Any] | None = None) -> JSONResponse:
    body = body or {}
    simulator.build(
        lane_count=int(body.get("lanes", 6)),
        with_pacer=bool(body.get("pacer", False)),
        event_id=body.get("event_id") or bridge.event_id or "sim-event",
    )
    bridge.lobby_status = "racing"
    await simulator.start()
    return _ok(simulator.status())


@app.post("/api/sim/stop")
async def sim_stop() -> JSONResponse:
    await simulator.stop()
    bridge.lobby_status = "finished"
    return _ok(simulator.status())


@app.post("/api/sim/reset")
async def sim_reset() -> JSONResponse:
    simulator.reset()
    return _ok(simulator.status())


@app.get("/api/sim/status")
async def sim_status() -> JSONResponse:
    return _ok(simulator.status())


# ── WS 폴백 채널 (§2.3, Broadcast 장애 시) ───────────────────────────────────
@app.websocket("/ws/race")
async def ws_race(ws: WebSocket) -> None:
    await ws.accept()
    try:
        while True:
            await ws.send_json({"event": "erg_stream", "lanes": bridge.live_snapshot()})
            await asyncio.sleep(1.0 / max(cfg.broadcast_hz, 0.5))
    except WebSocketDisconnect:
        return


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="BCL race-service")
    p.add_argument("--simulate", action="store_true", help="하드웨어 없이 시뮬레이터 기동(L1)")
    p.add_argument("--port", type=int, default=None)
    return p.parse_args()


if __name__ == "__main__":
    import uvicorn

    args = _parse_args()
    if args.simulate:
        os.environ["RACE_SIMULATE"] = "1"
        # cfg는 이미 로드됨 → 재로드 위해 frozen 필드 갱신 대신 전역 재바인딩
        object.__setattr__(cfg, "simulate", True)
    port = args.port or cfg.port
    uvicorn.run(app, host=cfg.host, port=port, log_level=os.environ.get("LOG_LEVEL", "info").lower())
