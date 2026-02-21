"""
JSONL Recorder
===============
Records raw BLE data from PM5 devices to JSONL files
with per-device file isolation and event-level directory structure.

File structure:
    race/recordings/
        {event_id}/
            {device_serial}.jsonl
            _meta.json
"""

import asyncio
import json
import os
import time
import logging
from pathlib import Path
from typing import Dict, Optional
from dataclasses import dataclass, field

from pm5_spec import JSONL_FLUSH_INTERVAL

logger = logging.getLogger("recorder")

# Base directory for all recordings
RECORDINGS_DIR = os.path.join(os.path.dirname(__file__), "recordings")


@dataclass
class FileWriter:
    """Manages a single JSONL file for one device."""
    file_path: str
    _file: Optional[object] = field(default=None, repr=False)
    data_points: int = 0
    started_at: float = 0.0
    last_flush: float = 0.0

    def open(self):
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
        self._file = open(self.file_path, "a", encoding="utf-8")
        self.started_at = time.time()
        self.last_flush = time.time()
        logger.info(f"📝 Recording started: {self.file_path}")

    def write(self, data: dict):
        if not self._file:
            return
        line = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
        self._file.write(line + "\n")
        self.data_points += 1

        # Periodic flush for crash safety
        now = time.time()
        if now - self.last_flush >= JSONL_FLUSH_INTERVAL:
            self._file.flush()
            os.fsync(self._file.fileno())
            self.last_flush = now

    def close(self) -> dict:
        """Close file and return metadata."""
        if self._file:
            self._file.flush()
            os.fsync(self._file.fileno())
            self._file.close()
            self._file = None
            logger.info(f"📝 Recording stopped: {self.file_path} ({self.data_points} points)")

        file_size = 0
        try:
            file_size = os.path.getsize(self.file_path)
        except OSError:
            pass

        duration = int(time.time() - self.started_at) if self.started_at else 0

        return {
            "file_path": self.file_path,
            "file_size_bytes": file_size,
            "total_data_points": self.data_points,
            "duration_seconds": duration,
        }


class Recorder:
    """Manages JSONL recordings for a race event with per-device files."""

    def __init__(self, event_id: str, base_dir: str = RECORDINGS_DIR):
        self.event_id = event_id
        self.event_dir = os.path.join(base_dir, event_id)
        self._writers: Dict[str, FileWriter] = {}  # serial → writer
        self._recording = False
        self._meta: dict = {}

    @property
    def is_recording(self) -> bool:
        return self._recording

    def start(self, device_serials: list, meta: Optional[dict] = None) -> None:
        """Start recording for specified device serials.

        Args:
            device_serials: List of device serial numbers to record
            meta: Optional metadata dict for _meta.json
        """
        if self._recording:
            logger.warning("Recording already in progress")
            return

        os.makedirs(self.event_dir, exist_ok=True)

        # Create per-device writers
        for serial in device_serials:
            file_path = os.path.join(self.event_dir, f"{serial}.jsonl")
            writer = FileWriter(file_path=file_path)
            writer.open()
            self._writers[serial] = writer

        # Write event metadata
        self._meta = {
            "event_id": self.event_id,
            "started_at": time.time(),
            "started_at_iso": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "device_serials": device_serials,
            "device_count": len(device_serials),
            **(meta or {}),
        }
        meta_path = os.path.join(self.event_dir, "_meta.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(self._meta, f, indent=2, ensure_ascii=False)

        self._recording = True
        logger.info(f"🎬 Recording started for event {self.event_id} ({len(device_serials)} devices)")

    def write(self, serial: str, data: dict) -> None:
        """Write a data point to the appropriate device's JSONL file.

        Args:
            serial: Device serial number
            data: Data snapshot dict (compact format from ErgData.snapshot())
        """
        if not self._recording:
            return

        writer = self._writers.get(serial)
        if writer:
            writer.write(data)

    def stop(self) -> Dict[str, dict]:
        """Stop all recordings and return per-device metadata.

        Returns:
            Dict of serial → file metadata
        """
        if not self._recording:
            return {}

        results = {}
        for serial, writer in self._writers.items():
            results[serial] = writer.close()

        # Update _meta.json with end time
        self._meta["ended_at"] = time.time()
        self._meta["ended_at_iso"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        self._meta["results"] = results
        meta_path = os.path.join(self.event_dir, "_meta.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(self._meta, f, indent=2, ensure_ascii=False)

        self._recording = False
        self._writers.clear()
        logger.info(f"🎬 Recording stopped for event {self.event_id}")
        return results

    def get_recording_info(self) -> dict:
        """Get current recording status and statistics."""
        return {
            "event_id": self.event_id,
            "recording": self._recording,
            "device_count": len(self._writers),
            "devices": {
                serial: {
                    "data_points": writer.data_points,
                    "file_path": writer.file_path,
                }
                for serial, writer in self._writers.items()
            },
        }

    @staticmethod
    def list_recordings(base_dir: str = RECORDINGS_DIR) -> list:
        """List all recorded events."""
        if not os.path.exists(base_dir):
            return []

        events = []
        for entry in os.scandir(base_dir):
            if entry.is_dir():
                meta_path = os.path.join(entry.path, "_meta.json")
                if os.path.exists(meta_path):
                    try:
                        with open(meta_path, "r") as f:
                            meta = json.load(f)
                        events.append(meta)
                    except Exception:
                        events.append({"event_id": entry.name, "error": "meta parse failed"})
                else:
                    events.append({"event_id": entry.name, "meta": "missing"})

        return sorted(events, key=lambda x: x.get("started_at", 0), reverse=True)

    @staticmethod
    def extract_summary(jsonl_path: str) -> dict:
        """Extract summary statistics from a JSONL recording file.

        Used when loading results into race_records after race completion.

        Returns:
            Dict with: total_distance, max_watts, avg_power, avg_spm,
                       avg_hr, total_calories, duration_seconds, data_points
        """
        if not os.path.exists(jsonl_path):
            return {}

        distances = []
        powers = []
        spms = []
        hrs = []
        max_watts = 0
        total_cal = 0
        first_ts = None
        last_ts = None
        count = 0

        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                    count += 1

                    ts = row.get("ts", 0)
                    if first_ts is None:
                        first_ts = ts
                    last_ts = ts

                    distances.append(row.get("d", 0))
                    p = row.get("p", 0)
                    powers.append(p)
                    spms.append(row.get("spm", 0))

                    hr = row.get("hr")
                    if hr and hr > 0:
                        hrs.append(hr)

                    mw = row.get("max_w", 0)
                    if mw > max_watts:
                        max_watts = mw

                    cal = row.get("cal", 0)
                    if cal > total_cal:
                        total_cal = cal

                except json.JSONDecodeError:
                    continue

        duration_ms = (last_ts - first_ts) if (first_ts and last_ts) else 0

        return {
            "total_distance": max(distances) if distances else 0,
            "max_watts": max_watts,
            "avg_power": round(sum(powers) / len(powers), 1) if powers else 0,
            "avg_spm": round(sum(spms) / len(spms), 1) if spms else 0,
            "avg_hr": round(sum(hrs) / len(hrs)) if hrs else None,
            "total_calories": total_cal,
            "duration_seconds": int(duration_ms / 1000),
            "data_points": count,
        }
