"""
PM5 BLE Packet Parsers
=======================
Parse raw BLE notification data from PM5 characteristics into
structured Python dictionaries.

Reference: Concept2 PM BLE Communication Specification
Each characteristic sends a fixed-length byte array with specific data layouts.
"""

import struct
import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ErgData:
    """Parsed ergometer data from BLE notifications.
    Combined from multiple characteristics into a single snapshot."""
    timestamp_ms: int = 0
    elapsed_time_ms: int = 0         # Workout elapsed time (ms)
    distance_m: float = 0.0          # Total distance (meters)
    speed_mps: float = 0.0           # Instantaneous speed (m/s)
    stroke_rate_spm: float = 0.0     # Stroke rate (strokes/min)
    heart_rate_bpm: int = 0          # Heart rate (BPM, 0 = unavailable)
    power_watts: int = 0             # Instantaneous power (watts)
    calories_burned: int = 0         # Total calories
    avg_power_watts: int = 0         # Average power (watts)
    stroke_count: int = 0            # Total stroke count
    pace_500m_ms: int = 0            # Current pace per 500m (ms)
    avg_pace_500m_ms: int = 0        # Average pace per 500m (ms)
    stroke_distance_m: float = 0.0   # Distance per stroke (meters)
    peak_drive_force_n: float = 0.0  # Peak drive force (newtons)
    max_watts: int = 0               # Session max watts
    device_serial: str = ""          # Device serial number


@dataclass
class DeviceAccumulator:
    """Tracks per-device accumulated data, merging across multiple
    BLE characteristics that arrive independently."""
    serial: str = ""
    current: ErgData = field(default_factory=ErgData)
    session_max_watts: int = 0       # Running max watts for the session
    race_base_distance: float = 0.0  # Distance at race start (for early-start offset)
    race_active: bool = False        # Whether racing state is active

    def snapshot(self) -> dict:
        """Create a compact dictionary for broadcast/JSONL recording."""
        return {
            "ts": int(time.time() * 1000),
            "d": round(self.effective_distance(), 2),
            "p": self.current.power_watts,
            "spm": round(self.current.stroke_rate_spm, 1),
            "hr": self.current.heart_rate_bpm if self.current.heart_rate_bpm > 0 else None,
            "cal": self.current.calories_burned,
            "max_w": self.session_max_watts,
        }

    def effective_distance(self) -> float:
        """Distance relative to race start (handles early start offset)."""
        return max(0.0, self.current.distance_m - self.race_base_distance)

    def mark_race_start(self):
        """Capture current distance as baseline when race transitions to RACING."""
        self.race_base_distance = self.current.distance_m
        self.race_active = True

    def reset(self):
        """Reset accumulator for a new race."""
        self.current = ErgData(device_serial=self.serial)
        self.session_max_watts = 0
        self.race_base_distance = 0.0
        self.race_active = False


# ─────────────────────────────────────────────
# Characteristic Parsers
# ─────────────────────────────────────────────

def parse_general_status(data: bytes, acc: DeviceAccumulator) -> None:
    """Parse General Status Data (0x31) — 19 bytes.

    Byte layout:
      [0-2]   elapsed_time (uint24, 10ms resolution → ms/10)
      [3-5]   distance (uint24, 10cm resolution → m/10)
      [6]     workout_type (uint8)
      [7]     interval_type (uint8)
      [8-9]   workout_state (uint16)
      [10-11] rowing_state (uint16)
      [12]    stroke_state (uint8)
      [13-15] total_work_distance (uint24)
      [16-17] workout_duration (uint16)
      [18]    drag_factor (uint8)
    """
    if len(data) < 19:
        return

    # elapsed_time: 3 bytes, little-endian, 10ms resolution
    elapsed_raw = data[0] | (data[1] << 8) | (data[2] << 16)
    acc.current.elapsed_time_ms = elapsed_raw * 10

    # distance: 3 bytes, little-endian, 10cm (0.1m) resolution
    dist_raw = data[3] | (data[4] << 8) | (data[5] << 16)
    acc.current.distance_m = dist_raw / 10.0

    acc.current.timestamp_ms = int(time.time() * 1000)


def parse_additional_status(data: bytes, acc: DeviceAccumulator) -> None:
    """Parse Additional Status Data (0x32) — 17 bytes.

    Byte layout:
      [0-2]   elapsed_time (uint24, 10ms)
      [3-4]   speed (uint16, 1mm/s) → m/s
      [5]     stroke_rate (uint8, 0.5 SPM resolution)
      [6]     heart_rate (uint8, BPM)
      [7-8]   current_pace (uint16, 10ms per 500m)
      [9-10]  avg_pace (uint16, 10ms per 500m)
      [11-12] rest_distance (uint16)
      [13-16] rest_time (uint32)
    """
    if len(data) < 13:
        return

    # speed: mm/s → m/s
    speed_raw = data[3] | (data[4] << 8)
    acc.current.speed_mps = speed_raw / 1000.0

    # stroke_rate: 0.5 SPM resolution
    acc.current.stroke_rate_spm = data[5] / 2.0

    # heart_rate: BPM
    acc.current.heart_rate_bpm = data[6]

    # current_pace: 10ms resolution (per 500m)
    pace_raw = data[7] | (data[8] << 8)
    acc.current.pace_500m_ms = pace_raw * 10

    # avg_pace
    avg_pace_raw = data[9] | (data[10] << 8)
    acc.current.avg_pace_500m_ms = avg_pace_raw * 10


def parse_additional_status_2(data: bytes, acc: DeviceAccumulator) -> None:
    """Parse Additional Status Data 2 (0x33) — 20 bytes.

    Byte layout:
      [0-2]   elapsed_time (uint24, 10ms)
      [3-4]   interval_count (uint16)
      [5-6]   avg_power (uint16, watts)
      [7-8]   total_calories (uint16)
      [9-10]  split_interval_avg_pace (uint16)
      [11-13] split_interval_avg_power (uint24)
      [14-15] split_interval_avg_calories (uint16)
      [16-17] last_split_time (uint16)
      [18-19] last_split_distance (uint16)
    """
    if len(data) < 9:
        return

    # avg_power: watts
    acc.current.avg_power_watts = data[5] | (data[6] << 8)

    # total_calories
    acc.current.calories_burned = data[7] | (data[8] << 8)


def parse_stroke_data(data: bytes, acc: DeviceAccumulator) -> None:
    """Parse Stroke Data (0x35) — 20 bytes.

    Byte layout:
      [0-2]   elapsed_time (uint24, 10ms)
      [3-5]   distance (uint24, 10cm)
      [6]     drive_length (uint8, cm)
      [7]     drive_time (uint8, 10ms)
      [8-9]   stroke_recovery_time (uint16, 10ms)
      [10-11] stroke_distance (uint16, cm)
      [12-13] peak_drive_force (uint16, N/10)
      [14-15] avg_drive_force (uint16, N/10)
      [16-17] work_per_stroke (uint16)
      [18]    stroke_count (uint8 low byte)
      [19]    stroke_count (uint8 high byte) — combined uint16
    """
    if len(data) < 20:
        return

    # stroke_distance: cm → m
    sd_raw = data[10] | (data[11] << 8)
    acc.current.stroke_distance_m = sd_raw / 100.0

    # peak_drive_force: N/10
    pdf_raw = data[12] | (data[13] << 8)
    acc.current.peak_drive_force_n = pdf_raw / 10.0

    # stroke_count
    acc.current.stroke_count = data[18] | (data[19] << 8)

    # Update instantaneous power from drive metrics
    # power ≈ force × speed (rough approximation if direct power not available)
    # But we prefer Additional Status 2's avg_power for accuracy


def parse_additional_stroke_data(data: bytes, acc: DeviceAccumulator) -> None:
    """Parse Additional Stroke Data (0x36) — 15 bytes.

    Byte layout:
      [0-2]   elapsed_time (uint24, 10ms)
      [3-4]   stroke_power (uint16, watts)
      [5-6]   stroke_calories (uint16)
      [7-8]   stroke_count (uint16)
      [9-14]  reserved / projection data
    """
    if len(data) < 9:
        return

    # stroke_power: watts (instantaneous per-stroke power)
    power = data[3] | (data[4] << 8)
    acc.current.power_watts = power

    # Update session max watts
    if power > acc.session_max_watts:
        acc.session_max_watts = power
    acc.current.max_watts = acc.session_max_watts


# ─────────────────────────────────────────────
# Characteristic UUID → Parser mapping
# ─────────────────────────────────────────────

from pm5_spec import (
    CHAR_GENERAL_STATUS,
    CHAR_ADDITIONAL_STATUS,
    CHAR_ADDITIONAL_STATUS_2,
    CHAR_STROKE_DATA,
    CHAR_ADDITIONAL_STROKE_DATA,
)

CHAR_PARSERS = {
    CHAR_GENERAL_STATUS: parse_general_status,
    CHAR_ADDITIONAL_STATUS: parse_additional_status,
    CHAR_ADDITIONAL_STATUS_2: parse_additional_status_2,
    CHAR_STROKE_DATA: parse_stroke_data,
    CHAR_ADDITIONAL_STROKE_DATA: parse_additional_stroke_data,
}
