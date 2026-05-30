"""
PM5 BLE Specification Constants
================================
Concept2 PM5 Performance Monitor BLE GATT Service/Characteristic UUIDs
and data format definitions.

Reference: Concept2 PM BLE Communication Specification (Open Source)
"""

# ─────────────────────────────────────────────
# PM5 BLE Service UUIDs
# ─────────────────────────────────────────────

PM5_DEVICE_INFO_SERVICE = "0000180a-0000-1000-8000-00805f9b34fb"
PM5_ROWING_SERVICE = "ce060030-43e5-11e4-916c-0800200c9a66"
PM5_CONTROL_SERVICE = "ce060020-43e5-11e4-916c-0800200c9a66"

# ─────────────────────────────────────────────
# PM5 BLE Characteristic UUIDs (Rowing Service)
# ─────────────────────────────────────────────

# General Status Data (Notify) — 19 bytes
# Contains: elapsed_time, distance, workout_type, interval_type, etc.
CHAR_GENERAL_STATUS = "ce060031-43e5-11e4-916c-0800200c9a66"

# Additional Status Data (Notify) — 17 bytes
# Contains: elapsed_time, speed, stroke_rate, heart_rate, pace, avg_pace, etc.
CHAR_ADDITIONAL_STATUS = "ce060032-43e5-11e4-916c-0800200c9a66"

# Additional Status Data 2 (Notify) — 20 bytes
# Contains: elapsed_time, interval_count, avg_power, total_calories, etc.
CHAR_ADDITIONAL_STATUS_2 = "ce060033-43e5-11e4-916c-0800200c9a66"

# Stroke Data (Notify) — 20 bytes
# Contains: elapsed_time, distance, drive_length, drive_time,
#           stroke_recovery_time, stroke_distance, peak_drive_force,
#           avg_drive_force, stroke_rate, stroke_count
CHAR_STROKE_DATA = "ce060035-43e5-11e4-916c-0800200c9a66"

# Additional Stroke Data (Notify) — 15 bytes
# Contains: elapsed_time, stroke_power, stroke_calories, stroke_count
CHAR_ADDITIONAL_STROKE_DATA = "ce060036-43e5-11e4-916c-0800200c9a66"

# Force Curve Data (Notify) — variable length
CHAR_FORCE_CURVE = "ce060037-43e5-11e4-916c-0800200c9a66"

# ─────────────────────────────────────────────
# PM5 Control Characteristic UUIDs
# ─────────────────────────────────────────────

# Multiplexed Information (Indicate) — variable
CHAR_MULTIPLEXED_INFO = "ce060080-43e5-11e4-916c-0800200c9a66"

# ─────────────────────────────────────────────
# PM5 Device Info Characteristic UUIDs
# ─────────────────────────────────────────────

CHAR_SERIAL_NUMBER = "00002a25-0000-1000-8000-00805f9b34fb"
CHAR_MODEL_NUMBER = "00002a24-0000-1000-8000-00805f9b34fb"
CHAR_FIRMWARE_REV = "00002a26-0000-1000-8000-00805f9b34fb"
CHAR_HARDWARE_REV = "00002a27-0000-1000-8000-00805f9b34fb"
CHAR_MANUFACTURER = "00002a29-0000-1000-8000-00805f9b34fb"

# ─────────────────────────────────────────────
# Subscription Profiles
# ─────────────────────────────────────────────

# Characteristics to subscribe for race real-time data
RACE_SUBSCRIBE_CHARS = [
    CHAR_GENERAL_STATUS,          # distance, elapsed_time
    CHAR_ADDITIONAL_STATUS,       # speed, stroke_rate, heart_rate, pace
    CHAR_ADDITIONAL_STATUS_2,     # avg_power, total_calories
    CHAR_STROKE_DATA,             # stroke_distance, peak_drive_force
]

# ─────────────────────────────────────────────
# Device Type Constants
# ─────────────────────────────────────────────

DEVICE_TYPES = {
    "rower": "PM5 Rower",
    "bike": "PM5 BikeErg",
    "skierg": "PM5 SkiErg",
    "treadmill": "Treadmill",
    "other": "Other",
}

# BLE Advertisement Name Prefixes
PM5_BLE_NAME_PREFIXES = [
    "PM5",       # Standard PM5 naming
    "Concept2",  # Alternative naming
]

# ─────────────────────────────────────────────
# Connection Settings
# ─────────────────────────────────────────────

# Max simultaneous BLE connections per adapter
MAX_CONNECTIONS_PER_ADAPTER = 7

# Max total connections (with multiple adapters)
MAX_TOTAL_CONNECTIONS = 20

# BLE scan timeout (seconds)
SCAN_TIMEOUT = 10.0

# Connection timeout (seconds)
CONNECT_TIMEOUT = 15.0

# Auto-reconnect on unexpected BLE drop (sleep/range/interference)
RECONNECT_MAX_ATTEMPTS = 6      # give up after this many tries
RECONNECT_BASE_DELAY = 2.0      # first retry delay (seconds)
RECONNECT_MAX_DELAY = 20.0      # exponential backoff cap (seconds)

# Notification callback interval target (seconds)
NOTIFY_INTERVAL = 0.3

# Snapshot UPSERT interval (seconds) — for race_live_state
SNAPSHOT_INTERVAL = 5.0

# JSONL flush interval (seconds)
JSONL_FLUSH_INTERVAL = 1.0

# ─────────────────────────────────────────────
# Race State Machine
# ─────────────────────────────────────────────

class RaceStatus:
    """Race state machine states"""
    SETUP = "setup"
    LOBBY = "lobby"
    COUNTDOWN = "countdown"
    RACING = "racing"
    FINISHED = "finished"

    ALL = [SETUP, LOBBY, COUNTDOWN, RACING, FINISHED]

    @staticmethod
    def can_transition(from_state: str, to_state: str) -> bool:
        """Validate state transitions"""
        transitions = {
            "setup": ["lobby"],
            "lobby": ["countdown", "setup"],
            "countdown": ["racing", "lobby"],
            "racing": ["finished"],
            "finished": ["setup"],
        }
        return to_state in transitions.get(from_state, [])

# ─────────────────────────────────────────────
# JSONL File Format
# ─────────────────────────────────────────────

# JSONL line keys (compact)
# ts  = timestamp (ms, Unix epoch)
# d   = distance (meters, float)
# p   = power (watts, int)
# spm = stroke rate (strokes per minute, float)
# hr  = heart rate (bpm, int or null)
# cal = calories burned (int)
# max_w = max watts recorded so far (int)
JSONL_KEYS = ["ts", "d", "p", "spm", "hr", "cal", "max_w"]
