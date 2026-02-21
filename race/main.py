"""
BCL Race Server — Main Application
====================================
FastAPI server for PM5 BLE data acquisition, JSONL recording,
and Supabase Realtime Broadcast.

Runs on Coach PC (port 8001). Uses Service Role Key for
Supabase access (server-side agent, not client browser).
"""

import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException, WebSocket, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from supabase import create_client, Client

from pm5_spec import RaceStatus, SNAPSHOT_INTERVAL
from pm5_manager import PM5Manager
from recorder import Recorder

# ─────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger("race_server")

# ─────────────────────────────────────────────
# Supabase Setup (Service Role Key)
# ─────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

# Prefer Service Role Key for server-side operations (bypasses RLS)
_sb_key = SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY
supabase: Optional[Client] = None
if SUPABASE_URL and _sb_key:
    try:
        supabase = create_client(SUPABASE_URL, _sb_key)
        logger.info(f"✅ Supabase connected (Service Role: {bool(SUPABASE_SERVICE_KEY)})")
    except Exception as e:
        logger.error(f"❌ Supabase connection failed: {e}")

# ─────────────────────────────────────────────
# Global State
# ─────────────────────────────────────────────

class RaceSession:
    """Holds the state for the current active race session."""
    def __init__(self):
        self.event_id: Optional[str] = None
        self.status: str = RaceStatus.SETUP
        self.lane_assignments: Dict[str, dict] = {}  # serial → {lane, member_id, team_id}
        self.recorder: Optional[Recorder] = None
        self.snapshot_task: Optional[asyncio.Task] = None
        self.broadcast_task: Optional[asyncio.Task] = None

    def reset(self):
        self.event_id = None
        self.status = RaceStatus.SETUP
        self.lane_assignments.clear()
        self.recorder = None
        if self.snapshot_task and not self.snapshot_task.done():
            self.snapshot_task.cancel()
        if self.broadcast_task and not self.broadcast_task.done():
            self.broadcast_task.cancel()
        self.snapshot_task = None
        self.broadcast_task = None


# Singleton instances
pm5_manager = PM5Manager()
race_session = RaceSession()

# Data broadcast buffer (latest data per device for WebSocket clients)
_broadcast_buffer: Dict[str, dict] = {}

# ─────────────────────────────────────────────
# Data Callback
# ─────────────────────────────────────────────

def on_ble_data(serial: str, snapshot: dict):
    """Called each time new BLE data arrives from a PM5 device.
    Routes data to:
    1. Broadcast buffer (for WebSocket/Realtime clients)
    2. JSONL recorder (if recording)
    """
    # Skip accumulation when not in racing state (early start protection)
    if race_session.status == RaceStatus.COUNTDOWN:
        # Still capture data but don't advance distance
        pass  # Accumulator handles base offset via mark_race_start()

    # Update broadcast buffer
    lane_info = race_session.lane_assignments.get(serial, {})
    snapshot["lane"] = lane_info.get("lane", 0)
    snapshot["member_id"] = lane_info.get("member_id")
    snapshot["team_id"] = lane_info.get("team_id")
    _broadcast_buffer[serial] = snapshot

    # Write to JSONL (if recording)
    if race_session.recorder and race_session.recorder.is_recording:
        race_session.recorder.write(serial, snapshot)


pm5_manager = PM5Manager(on_data_callback=on_ble_data)

# ─────────────────────────────────────────────
# Background Tasks
# ─────────────────────────────────────────────

async def snapshot_loop():
    """Periodically UPSERT race_live_state to Supabase (every 5 seconds)."""
    while True:
        try:
            await asyncio.sleep(SNAPSHOT_INTERVAL)

            if not supabase or not race_session.event_id:
                continue
            if race_session.status not in [RaceStatus.RACING, RaceStatus.COUNTDOWN, RaceStatus.LOBBY]:
                continue

            for serial, snapshot in _broadcast_buffer.items():
                lane_info = race_session.lane_assignments.get(serial, {})
                acc = pm5_manager.get_accumulator(serial)
                conn_status = "racing" if (acc and acc.race_active) else "connected"

                # Find connection status
                conn = pm5_manager.connections.get(serial)
                if not conn or not conn.connected:
                    conn_status = "offline"

                try:
                    supabase.table("race_live_state").upsert(
                        {
                            "event_id": race_session.event_id,
                            "device_id": lane_info.get("device_id"),
                            "member_id": lane_info.get("member_id"),
                            "lane_number": lane_info.get("lane", 0),
                            "team_id": lane_info.get("team_id"),
                            "distance_m": snapshot.get("d", 0),
                            "power_w": snapshot.get("p", 0),
                            "stroke_rate_spm": snapshot.get("spm", 0),
                            "hr_bpm": snapshot.get("hr"),
                            "calories_burned": snapshot.get("cal", 0),
                            "max_watts": snapshot.get("max_w", 0),
                            "connection_status": conn_status,
                            "last_updated_at": "now()",
                        },
                        on_conflict="event_id,device_id"
                    ).execute()
                except Exception as e:
                    logger.error(f"Snapshot UPSERT error for {serial}: {e}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Snapshot loop error: {e}")


async def broadcast_loop():
    """Broadcast erg_update events via Supabase Realtime (0.3s interval)."""
    while True:
        try:
            await asyncio.sleep(0.3)

            if not supabase or not race_session.event_id:
                continue
            if race_session.status != RaceStatus.RACING:
                continue

            for serial, snapshot in _broadcast_buffer.items():
                try:
                    channel = supabase.realtime.channel(f"race:{race_session.event_id}")
                    await channel.send_broadcast(
                        "erg_update",
                        snapshot,
                    )
                except Exception as e:
                    # Broadcast failures are non-critical
                    logger.debug(f"Broadcast error for {serial}: {e}")

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Broadcast loop error: {e}")


# ─────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 BCL Race Server starting up...")
    yield
    # Cleanup
    logger.info("🛑 BCL Race Server shutting down...")
    if race_session.recorder and race_session.recorder.is_recording:
        race_session.recorder.stop()
    await pm5_manager.disconnect_all()
    race_session.reset()


# ─────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────

app = FastAPI(
    title="BCL Race Server",
    version="2.0.0",
    description="PM5 BLE Data Acquisition & JSONL Recording Server",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.supabase.co",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Request/Response Models
# ─────────────────────────────────────────────

class ConnectRequest(BaseModel):
    address: str = Field(..., description="BLE MAC address or UUID")
    serial: str = Field(..., description="PM5 serial number")
    adapter: Optional[str] = Field(None, description="Adapter name (e.g., hci0)")

class RaceSetupRequest(BaseModel):
    event_id: str = Field(..., description="Supabase race_events UUID")
    lane_assignments: Dict[str, dict] = Field(
        default_factory=dict,
        description="serial → {lane, member_id, team_id, device_id}"
    )
    meta: Optional[dict] = Field(None, description="Additional recording metadata")

class RaceControlRequest(BaseModel):
    action: str = Field(..., description="start | stop | reset | countdown")


# ─────────────────────────────────────────────
# API Routes — Health
# ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "BCL Race Server is running",
        "version": "2.0.0",
        "status": "healthy",
        "supabase_connected": supabase is not None,
        "race_status": race_session.status,
        "connected_devices": pm5_manager.connected_count,
    }

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}


# ─────────────────────────────────────────────
# API Routes — BLE Device Management
# ─────────────────────────────────────────────

@app.get("/api/ble/scan")
async def ble_scan(timeout: float = Query(10.0, ge=1.0, le=30.0)):
    """Scan for PM5 devices via BLE."""
    devices = await pm5_manager.scan(timeout=timeout)
    return {"devices": devices, "count": len(devices)}

@app.post("/api/ble/connect")
async def ble_connect(req: ConnectRequest):
    """Connect to a specific PM5 device."""
    success = await pm5_manager.connect(req.address, req.serial, req.adapter)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to connect to {req.serial}")
    return {"connected": True, "serial": req.serial}

@app.post("/api/ble/disconnect/{serial}")
async def ble_disconnect(serial: str):
    """Disconnect a specific PM5 device."""
    success = await pm5_manager.disconnect(serial)
    return {"disconnected": success, "serial": serial}

@app.post("/api/ble/disconnect-all")
async def ble_disconnect_all():
    """Disconnect all PM5 devices."""
    await pm5_manager.disconnect_all()
    return {"disconnected": True}

@app.get("/api/ble/status")
async def ble_status():
    """Get connection status of all PM5 devices."""
    return {
        "devices": pm5_manager.get_status(),
        "connected_count": pm5_manager.connected_count,
    }


# ─────────────────────────────────────────────
# API Routes — Race Control
# ─────────────────────────────────────────────

@app.post("/api/race/setup")
async def race_setup(req: RaceSetupRequest):
    """Setup a new race with lane assignments and start recording."""
    if race_session.status not in [RaceStatus.SETUP, RaceStatus.FINISHED]:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot setup race in current state: {race_session.status}"
        )

    race_session.event_id = req.event_id
    race_session.lane_assignments = req.lane_assignments
    race_session.status = RaceStatus.LOBBY

    # Initialize recorder
    device_serials = list(req.lane_assignments.keys())
    race_session.recorder = Recorder(event_id=req.event_id)
    race_session.recorder.start(device_serials=device_serials, meta=req.meta)

    # Reset all accumulators
    pm5_manager.reset_all()

    # Start snapshot loop
    if race_session.snapshot_task is None or race_session.snapshot_task.done():
        race_session.snapshot_task = asyncio.create_task(snapshot_loop())

    # Update race_events lobby_status in Supabase
    if supabase:
        try:
            supabase.table("race_events").update(
                {"lobby_status": RaceStatus.LOBBY}
            ).eq("id", req.event_id).execute()
        except Exception as e:
            logger.error(f"Failed to update lobby_status: {e}")

    logger.info(f"🏁 Race setup complete: event={req.event_id}, lanes={len(device_serials)}")
    return {
        "status": "lobby",
        "event_id": req.event_id,
        "devices": device_serials,
    }


@app.post("/api/race/control")
async def race_control(req: RaceControlRequest):
    """Control race state transitions."""
    action = req.action.lower()

    if action == "countdown":
        if race_session.status != RaceStatus.LOBBY:
            raise HTTPException(status_code=409, detail="Can only countdown from lobby")
        race_session.status = RaceStatus.COUNTDOWN

        if supabase and race_session.event_id:
            supabase.table("race_events").update(
                {"lobby_status": RaceStatus.COUNTDOWN}
            ).eq("id", race_session.event_id).execute()

        return {"status": "countdown", "message": "Countdown started"}

    elif action == "start":
        if race_session.status not in [RaceStatus.COUNTDOWN, RaceStatus.LOBBY]:
            raise HTTPException(status_code=409, detail="Can only start from countdown/lobby")

        # Mark race start — capture base distances for early-start protection
        pm5_manager.mark_all_race_start()
        race_session.status = RaceStatus.RACING

        # Start broadcast loop
        if race_session.broadcast_task is None or race_session.broadcast_task.done():
            race_session.broadcast_task = asyncio.create_task(broadcast_loop())

        if supabase and race_session.event_id:
            supabase.table("race_events").update(
                {"lobby_status": RaceStatus.RACING}
            ).eq("id", race_session.event_id).execute()

        # Broadcast race_start event
        if supabase and race_session.event_id:
            try:
                channel = supabase.realtime.channel(f"race:{race_session.event_id}")
                await channel.send_broadcast("race_start", {
                    "event_id": race_session.event_id,
                    "started_at": int(time.time() * 1000),
                })
            except Exception as e:
                logger.error(f"Failed to broadcast race_start: {e}")

        logger.info("🏁 RACE STARTED — GO!")
        return {"status": "racing", "message": "Race started!"}

    elif action == "stop":
        if race_session.status != RaceStatus.RACING:
            raise HTTPException(status_code=409, detail="Can only stop an active race")

        race_session.status = RaceStatus.FINISHED

        # Stop recording and get file metadata
        recording_results = {}
        if race_session.recorder:
            recording_results = race_session.recorder.stop()

        # Cancel broadcast loop
        if race_session.broadcast_task and not race_session.broadcast_task.done():
            race_session.broadcast_task.cancel()

        # Save recording metadata to Supabase
        if supabase and race_session.event_id:
            supabase.table("race_events").update(
                {"lobby_status": RaceStatus.FINISHED, "status": "completed"}
            ).eq("id", race_session.event_id).execute()

            # Insert race_recordings entries
            for serial, file_meta in recording_results.items():
                lane_info = race_session.lane_assignments.get(serial, {})
                try:
                    supabase.table("race_recordings").insert({
                        "event_id": race_session.event_id,
                        "device_id": lane_info.get("device_id"),
                        "device_serial": serial,
                        "file_path": file_meta.get("file_path", ""),
                        "file_size_bytes": file_meta.get("file_size_bytes", 0),
                        "total_data_points": file_meta.get("total_data_points", 0),
                        "duration_seconds": file_meta.get("duration_seconds", 0),
                        "facility_id": lane_info.get("facility_id"),
                    }).execute()
                except Exception as e:
                    logger.error(f"Failed to insert race_recording for {serial}: {e}")

            # Broadcast race_finish event
            try:
                channel = supabase.realtime.channel(f"race:{race_session.event_id}")
                await channel.send_broadcast("race_finish", {
                    "event_id": race_session.event_id,
                    "finished_at": int(time.time() * 1000),
                })
            except Exception as e:
                logger.error(f"Failed to broadcast race_finish: {e}")

        logger.info("🏁 RACE FINISHED")
        return {
            "status": "finished",
            "recordings": recording_results,
        }

    elif action == "reset":
        # Clean up race_live_state
        if supabase and race_session.event_id:
            try:
                supabase.table("race_live_state").delete().eq(
                    "event_id", race_session.event_id
                ).execute()
            except Exception as e:
                logger.error(f"Failed to clean race_live_state: {e}")

            supabase.table("race_events").update(
                {"lobby_status": RaceStatus.SETUP}
            ).eq("id", race_session.event_id).execute()

        _broadcast_buffer.clear()
        pm5_manager.reset_all()
        race_session.reset()

        logger.info("🔄 Race reset")
        return {"status": "setup", "message": "Race reset"}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


@app.get("/api/race/status")
async def race_status():
    """Get current race session status."""
    return {
        "event_id": race_session.event_id,
        "status": race_session.status,
        "lane_assignments": race_session.lane_assignments,
        "recording": race_session.recorder.is_recording if race_session.recorder else False,
        "devices": pm5_manager.get_status(),
        "live_data": _broadcast_buffer,
    }


@app.get("/api/race/live")
async def race_live_data():
    """Get latest live data for all devices (polling fallback)."""
    return {
        "event_id": race_session.event_id,
        "status": race_session.status,
        "data": _broadcast_buffer,
    }


# ─────────────────────────────────────────────
# API Routes — Recording Management
# ─────────────────────────────────────────────

@app.get("/api/recordings")
async def list_recordings():
    """List all recorded events."""
    return {"recordings": Recorder.list_recordings()}


@app.get("/api/recordings/{event_id}/summary")
async def recording_summary(event_id: str):
    """Get summary statistics for a recording event."""
    from recorder import RECORDINGS_DIR
    event_dir = os.path.join(RECORDINGS_DIR, event_id)
    if not os.path.exists(event_dir):
        raise HTTPException(status_code=404, detail="Recording not found")

    summaries = {}
    for entry in os.scandir(event_dir):
        if entry.name.endswith(".jsonl"):
            serial = entry.name.replace(".jsonl", "")
            summaries[serial] = Recorder.extract_summary(entry.path)

    return {"event_id": event_id, "summaries": summaries}


@app.post("/api/recordings/{event_id}/load-results")
async def load_results(event_id: str):
    """Extract JSONL summaries and load into race_records table.

    This endpoint is called after a race finishes to populate
    the permanent race_records with computed results.
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase not connected")

    from recorder import RECORDINGS_DIR
    event_dir = os.path.join(RECORDINGS_DIR, event_id)
    if not os.path.exists(event_dir):
        raise HTTPException(status_code=404, detail="Recording not found")

    # Load lane assignments from the meta file
    meta_path = os.path.join(event_dir, "_meta.json")
    lane_meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            meta = json.load(f)
            # lane_meta is stored during race setup

    results_loaded = []
    for entry in os.scandir(event_dir):
        if not entry.name.endswith(".jsonl"):
            continue

        serial = entry.name.replace(".jsonl", "")
        summary = Recorder.extract_summary(entry.path)
        if not summary or summary.get("data_points", 0) == 0:
            continue

        lane_info = race_session.lane_assignments.get(serial, {})

        # Find recording_id
        recording_id = None
        try:
            resp = supabase.table("race_recordings").select("id").eq(
                "event_id", event_id
            ).eq("device_serial", serial).limit(1).execute()
            if resp.data:
                recording_id = resp.data[0]["id"]
        except Exception:
            pass

        record = {
            "event_id": event_id,
            "member_id": lane_info.get("member_id"),
            "device_serial": serial,
            "result_distance": summary.get("total_distance", 0),
            "avg_watts": summary.get("avg_power", 0),
            "calories_burned": summary.get("total_calories", 0),
            "max_watts": summary.get("max_watts", 0),
            "avg_spm": summary.get("avg_spm", 0),
            "avg_hr_bpm": summary.get("avg_hr"),
            "max_hr_bpm": summary.get("max_hr"),
            "recording_id": recording_id,
            "team_id": lane_info.get("team_id"),
            "lane_number": lane_info.get("lane"),
        }

        try:
            supabase.table("race_records").insert(record).execute()
            results_loaded.append(serial)
        except Exception as e:
            logger.error(f"Failed to insert race_record for {serial}: {e}")

    # Calculate finish ranks (by distance descending)
    try:
        resp = supabase.table("race_records").select("id,result_distance").eq(
            "event_id", event_id
        ).order("result_distance", desc=True).execute()
        if resp.data:
            for rank, row in enumerate(resp.data, 1):
                supabase.table("race_records").update(
                    {"finish_rank": rank}
                ).eq("id", row["id"]).execute()
    except Exception as e:
        logger.error(f"Failed to update finish ranks: {e}")

    return {
        "event_id": event_id,
        "results_loaded": len(results_loaded),
        "devices": results_loaded,
    }


# ─────────────────────────────────────────────
# WebSocket — Legacy/Fallback Live Data Stream
# ─────────────────────────────────────────────

@app.websocket("/ws/race")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for direct live data streaming (fallback).
    Primary path is Supabase Realtime Broadcast.
    """
    await websocket.accept()
    try:
        while True:
            if _broadcast_buffer:
                await websocket.send_text(json.dumps({
                    "type": "leaderboard",
                    "status": race_session.status,
                    "event_id": race_session.event_id,
                    "data": list(_broadcast_buffer.values()),
                }))
            await asyncio.sleep(0.3)
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# ─────────────────────────────────────────────
# Simulator API (Development/Demo Mode)
# ─────────────────────────────────────────────

from simulator import RaceSimulator, ReplaySimulator

# Simulator singleton
_simulator: Optional[RaceSimulator] = None
_replay_sim: Optional[ReplaySimulator] = None


def on_sim_data(serial: str, snapshot: dict):
    """Route simulated data into the broadcast buffer (same as real BLE)."""
    _broadcast_buffer[serial] = snapshot


class SimStartRequest(BaseModel):
    lane_count: int = Field(9, ge=2, le=20, description="Number of simulated lanes")
    event_id: Optional[str] = Field(None, description="Race event ID to associate")
    tick_interval: float = Field(0.3, ge=0.1, le=2.0, description="Data emission interval")


class SimReplayRequest(BaseModel):
    event_id: str = Field(..., description="Event ID of recorded JSONL to replay")
    playback_speed: float = Field(1.0, ge=0.25, le=10.0, description="Playback speed multiplier")


@app.post("/api/sim/start")
async def sim_start(req: SimStartRequest):
    """Start the race simulator (random data generation)."""
    global _simulator

    if _simulator and _simulator.is_running:
        _simulator.stop()

    _simulator = RaceSimulator(
        lane_count=req.lane_count,
        on_data_callback=on_sim_data,
        tick_interval=req.tick_interval,
    )

    # Auto-setup a race session if event_id provided
    event_id = req.event_id or f"sim-{int(time.time())}"
    race_session.event_id = event_id
    race_session.status = RaceStatus.RACING
    race_session.lane_assignments = _simulator.get_lane_assignments()

    _simulator.start()

    # Start snapshot loop if not already running
    if race_session.snapshot_task is None or race_session.snapshot_task.done():
        race_session.snapshot_task = asyncio.create_task(snapshot_loop())

    logger.info(f"🎮 Simulator started: {req.lane_count} lanes, event={event_id}")
    return {
        "status": "running",
        "lane_count": req.lane_count,
        "event_id": event_id,
        "serials": _simulator.get_rower_serials(),
    }


@app.post("/api/sim/stop")
async def sim_stop():
    """Stop the simulator."""
    global _simulator

    if _simulator and _simulator.is_running:
        _simulator.stop()

    race_session.status = RaceStatus.FINISHED
    return {"status": "stopped"}


@app.post("/api/sim/reset")
async def sim_reset():
    """Reset the simulator and race session."""
    global _simulator

    if _simulator:
        _simulator.reset()

    _broadcast_buffer.clear()
    race_session.reset()
    return {"status": "reset"}


@app.get("/api/sim/status")
async def sim_status():
    """Get simulator status."""
    return {
        "simulator_running": _simulator.is_running if _simulator else False,
        "lane_count": len(_simulator.rowers) if _simulator else 0,
        "race_status": race_session.status,
        "event_id": race_session.event_id,
        "live_data_count": len(_broadcast_buffer),
    }


@app.post("/api/sim/replay")
async def sim_replay(req: SimReplayRequest):
    """Start replaying a recorded JSONL event."""
    global _replay_sim

    from recorder import RECORDINGS_DIR
    event_dir = os.path.join(RECORDINGS_DIR, req.event_id)
    if not os.path.exists(event_dir):
        raise HTTPException(status_code=404, detail="Recording not found")

    if _replay_sim and _replay_sim.is_running:
        _replay_sim.stop()

    _replay_sim = ReplaySimulator(
        event_dir=event_dir,
        on_data_callback=on_sim_data,
        playback_speed=req.playback_speed,
    )

    race_session.event_id = req.event_id
    race_session.status = RaceStatus.RACING

    _replay_sim.start()

    logger.info(f"🔁 Replay started: event={req.event_id}, speed={req.playback_speed}x")
    return {
        "status": "replaying",
        "event_id": req.event_id,
        "device_count": _replay_sim.device_count,
        "playback_speed": req.playback_speed,
    }

