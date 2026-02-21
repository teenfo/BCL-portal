"""
Race Simulator
===============
Generates simulated PM5 rowing data for up to 20 lanes
without requiring actual BLE hardware.

Two modes:
1. RANDOM — Procedural random data with realistic rowing physics
2. REPLAY — Replay from existing JSONL recording files

Used for:
- Frontend development & testing without PM5 devices
- Demo and presentation modes
- Load testing with many lanes
"""

import asyncio
import json
import math
import os
import random
import time
import logging
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field

logger = logging.getLogger("simulator")

# ─────────────────────────────────────────────
# Simulated Rower Profile
# ─────────────────────────────────────────────

@dataclass
class SimulatedRower:
    """Represents a single simulated rower with realistic characteristics."""
    serial: str
    lane: int
    name: str
    member_id: Optional[str] = None
    team_id: Optional[str] = None

    # Physical characteristics (randomized per rower)
    base_power: float = 200.0          # Avg watts
    power_variance: float = 30.0       # Watts fluctuation
    base_spm: float = 28.0             # Strokes per minute
    spm_variance: float = 3.0
    base_hr: int = 155                 # Heart rate
    hr_variance: int = 10
    fatigue_rate: float = 0.0005       # Power decay per second

    # Running state
    distance: float = 0.0
    power: float = 0.0
    spm: float = 0.0
    hr: int = 0
    calories: int = 0
    max_watts: int = 0
    elapsed_seconds: float = 0.0
    stroke_count: int = 0

    # Connection simulation
    connected: bool = True
    drop_probability: float = 0.001    # Chance of simulated disconnect

    def reset(self):
        self.distance = 0.0
        self.power = 0.0
        self.spm = 0.0
        self.hr = 0
        self.calories = 0
        self.max_watts = 0
        self.elapsed_seconds = 0.0
        self.stroke_count = 0
        self.connected = True

    def tick(self, dt: float) -> dict:
        """Advance simulation by dt seconds, return data snapshot."""
        self.elapsed_seconds += dt

        if not self.connected:
            # Simulate reconnection after random time
            if random.random() < 0.05:
                self.connected = True
                logger.debug(f"Rower {self.name} reconnected")
            return self._snapshot(connected=False)

        # Simulate random disconnection
        if random.random() < self.drop_probability:
            self.connected = False
            logger.debug(f"Rower {self.name} disconnected (simulated)")
            return self._snapshot(connected=False)

        # Calculate power with fatigue and noise
        fatigue_factor = max(0.7, 1.0 - self.fatigue_rate * self.elapsed_seconds)
        noise = random.gauss(0, self.power_variance * 0.3)
        # Add periodic sprint surges
        sprint_factor = 1.0 + 0.15 * max(0, math.sin(self.elapsed_seconds / 45.0))
        self.power = max(50, self.base_power * fatigue_factor * sprint_factor + noise)

        # SPM with slight drift
        spm_noise = random.gauss(0, self.spm_variance * 0.3)
        self.spm = max(18, self.base_spm + spm_noise + 2 * math.sin(self.elapsed_seconds / 30))

        # Heart rate (gradual increase with fatigue)
        hr_drift = min(20, self.elapsed_seconds * 0.03)
        hr_noise = random.randint(-self.hr_variance // 2, self.hr_variance // 2)
        self.hr = min(200, self.base_hr + int(hr_drift) + hr_noise)

        # Distance: power-based speed approximation
        # ~2.8 concept2 formula: pace = (2.80 / power)^(1/3) for 500m
        if self.power > 0:
            pace_500m = (2.80 / self.power) ** (1 / 3) * 500  # seconds per 500m
            speed_mps = 500.0 / pace_500m if pace_500m > 0 else 0
            self.distance += speed_mps * dt

        # Calories (rough: ~0.03 cal per watt-second for rowing)
        self.calories = int(self.power * self.elapsed_seconds * 0.00003)

        # Max watts tracking
        if int(self.power) > self.max_watts:
            self.max_watts = int(self.power)

        # Stroke count
        self.stroke_count = int(self.spm * self.elapsed_seconds / 60)

        return self._snapshot(connected=True)

    def _snapshot(self, connected: bool) -> dict:
        return {
            "ts": int(time.time() * 1000),
            "d": round(self.distance, 2),
            "p": int(self.power) if connected else 0,
            "spm": round(self.spm, 1) if connected else 0,
            "hr": self.hr if connected and self.hr > 0 else None,
            "cal": self.calories,
            "max_w": self.max_watts,
            "device_serial": self.serial,
            "lane": self.lane,
            "member_id": self.member_id,
            "member_name": self.name,
            "team_id": self.team_id,
            "connection_status": "racing" if connected else "offline",
        }


# ─────────────────────────────────────────────
# Rower Name Pool
# ─────────────────────────────────────────────

ROWER_NAMES = [
    "김민수", "이서준", "박지훈", "최유진", "정하늘",
    "강동현", "윤서연", "임재혁", "한소희", "조현우",
    "송민지", "오승준", "신예진", "홍기훈", "장서윤",
    "류태영", "배지수", "권나영", "문성호", "안유정",
]

# Serial number patterns for simulation
SIM_SERIAL_PREFIX = "SIM"


# ─────────────────────────────────────────────
# Simulator Engine
# ─────────────────────────────────────────────

class RaceSimulator:
    """Generates simulated race data for testing without BLE hardware."""

    def __init__(
        self,
        lane_count: int = 9,
        on_data_callback: Optional[Callable[[str, dict], Any]] = None,
        tick_interval: float = 0.3,
    ):
        self.lane_count = min(lane_count, 20)
        self.tick_interval = tick_interval
        self._on_data = on_data_callback
        self._rowers: List[SimulatedRower] = []
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._create_rowers()

    def _create_rowers(self):
        """Initialize simulated rowers with varying skill levels."""
        self._rowers = []
        for i in range(self.lane_count):
            # Varied skill levels for realistic competition
            skill_factor = random.uniform(0.8, 1.2)
            rower = SimulatedRower(
                serial=f"{SIM_SERIAL_PREFIX}{100 + i:03d}",
                lane=i + 1,
                name=ROWER_NAMES[i % len(ROWER_NAMES)],
                base_power=random.uniform(160, 280) * skill_factor,
                power_variance=random.uniform(15, 40),
                base_spm=random.uniform(24, 32),
                spm_variance=random.uniform(1, 4),
                base_hr=random.randint(140, 170),
                hr_variance=random.randint(5, 15),
                fatigue_rate=random.uniform(0.0002, 0.0008),
                drop_probability=random.uniform(0.0, 0.003),
            )
            self._rowers.append(rower)

    @property
    def rowers(self) -> List[SimulatedRower]:
        return self._rowers

    @property
    def is_running(self) -> bool:
        return self._running

    def get_rower_serials(self) -> List[str]:
        return [r.serial for r in self._rowers]

    def get_lane_assignments(self) -> Dict[str, dict]:
        """Get lane assignments in the format expected by race setup."""
        return {
            rower.serial: {
                "lane": rower.lane,
                "member_id": rower.member_id,
                "team_id": rower.team_id,
                "device_id": None,
            }
            for rower in self._rowers
        }

    def set_teams(self, team_assignments: Dict[str, str]):
        """Assign rowers to teams. team_assignments: {serial: team_id}"""
        for rower in self._rowers:
            rower.team_id = team_assignments.get(rower.serial)

    def start(self):
        """Start the simulation loop."""
        if self._running:
            return
        self._running = True
        for rower in self._rowers:
            rower.reset()
        self._task = asyncio.create_task(self._simulation_loop())
        logger.info(f"🎮 Simulator started with {self.lane_count} lanes")

    def stop(self):
        """Stop the simulation and return final snapshots."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("🎮 Simulator stopped")

    def reset(self):
        """Reset all rowers and recreate with new random profiles."""
        self.stop()
        self._create_rowers()

    async def _simulation_loop(self):
        """Main simulation tick loop."""
        try:
            while self._running:
                for rower in self._rowers:
                    snapshot = rower.tick(self.tick_interval)

                    # Emit data via callback
                    if self._on_data:
                        self._on_data(rower.serial, snapshot)

                await asyncio.sleep(self.tick_interval)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Simulator loop error: {e}")
            self._running = False

    def get_live_data(self) -> Dict[str, dict]:
        """Get current snapshot of all rowers."""
        return {
            rower.serial: rower._snapshot(connected=rower.connected)
            for rower in self._rowers
        }


# ─────────────────────────────────────────────
# JSONL Replay Simulator
# ─────────────────────────────────────────────

class ReplaySimulator:
    """Replays pre-recorded JSONL files as if they were live data."""

    def __init__(
        self,
        event_dir: str,
        on_data_callback: Optional[Callable[[str, dict], Any]] = None,
        playback_speed: float = 1.0,
    ):
        self.event_dir = event_dir
        self._on_data = on_data_callback
        self.playback_speed = playback_speed
        self._files: Dict[str, List[dict]] = {}  # serial → list of data points
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._load_recordings()

    def _load_recordings(self):
        """Load all JSONL files from the event directory."""
        if not os.path.exists(self.event_dir):
            logger.warning(f"Replay dir not found: {self.event_dir}")
            return

        for entry in os.scandir(self.event_dir):
            if not entry.name.endswith(".jsonl"):
                continue
            serial = entry.name.replace(".jsonl", "")
            data_points = []
            with open(entry.path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            data_points.append(json.loads(line))
                        except json.JSONDecodeError:
                            continue
            if data_points:
                self._files[serial] = data_points
                logger.info(f"Loaded {len(data_points)} points for {serial}")

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def device_count(self) -> int:
        return len(self._files)

    def start(self):
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._replay_loop())
        logger.info(f"🔁 Replay started: {self.device_count} devices from {self.event_dir}")

    def stop(self):
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("🔁 Replay stopped")

    async def _replay_loop(self):
        """Replay all JSONL files in sync, using relative timestamps."""
        try:
            if not self._files:
                logger.warning("No JSONL files to replay")
                return

            # Determine global timeline
            all_timestamps = []
            for data_points in self._files.values():
                for dp in data_points:
                    all_timestamps.append(dp.get("ts", 0))

            if not all_timestamps:
                return

            min_ts = min(all_timestamps)
            max_ts = max(all_timestamps)
            total_duration_ms = max_ts - min_ts

            # Create interleaved timeline sorted by timestamp
            timeline: List[tuple] = []  # (relative_ms, serial, data)
            for serial, data_points in self._files.items():
                for dp in data_points:
                    rel_ms = dp.get("ts", 0) - min_ts
                    timeline.append((rel_ms, serial, dp))

            timeline.sort(key=lambda x: x[0])

            # Replay
            start_time = time.time()
            idx = 0

            while self._running and idx < len(timeline):
                rel_ms, serial, data = timeline[idx]
                target_time = start_time + (rel_ms / 1000.0 / self.playback_speed)

                wait = target_time - time.time()
                if wait > 0:
                    await asyncio.sleep(wait)

                if self._on_data:
                    data["device_serial"] = serial
                    self._on_data(serial, data)

                idx += 1

            self._running = False
            logger.info("🔁 Replay completed")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Replay error: {e}")
            self._running = False
