"""recorder.py — JSONL 원시 기록 (경로3, docs/15 §3.3).

기기별 독립 파일에 초당 ~66행(20기기)을 순차 Append. flush 1s(fsync)로
비정상 종료(SIGINT)에도 마지막 라인 보존(수용 5-5). 종료 시 요약 추출 →
race_records 멱등 적재의 입력.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from typing import Any, TextIO


@dataclass
class _FileHandle:
    path: str
    fp: TextIO
    points: int = 0
    last_flush: float = field(default_factory=time.monotonic)


@dataclass
class LaneAssignment:
    lane: int
    device_serial: str
    device_id: str | None = None
    member_id: str | None = None
    member_name: str | None = None
    team_id: str | None = None


class Recorder:
    """이벤트 1개 스코프의 JSONL 레코더. setup→start에서 open, stop에서 close."""

    def __init__(self, base_dir: str, event_id: str, flush_interval_s: float = 1.0) -> None:
        self.event_id = event_id
        self.dir = os.path.join(base_dir, event_id)
        self.flush_interval_s = flush_interval_s
        self._files: dict[str, _FileHandle] = {}
        self._started_at: float | None = None
        self._meta: dict[str, Any] = {}

    def start(self, lane_assignments: list[LaneAssignment], race_format: str, heat_no: int) -> None:
        os.makedirs(self.dir, exist_ok=True)
        self._started_at = time.time()
        # _meta.json: lane_assignments 전체 보존(M-7) — 재처리 시 매핑 유실 방지
        self._meta = {
            "event_id": self.event_id,
            "started_at": self._started_at,
            "race_format": race_format,
            "heat_no": heat_no,
            "lane_assignments": [la.__dict__ for la in lane_assignments],
        }
        self._write_meta()

    def _write_meta(self) -> None:
        with open(os.path.join(self.dir, "_meta.json"), "w", encoding="utf-8") as f:
            json.dump(self._meta, f, ensure_ascii=False, indent=2)

    def _handle(self, serial: str) -> _FileHandle:
        h = self._files.get(serial)
        if h is None:
            path = os.path.join(self.dir, f"{serial}.jsonl")
            h = _FileHandle(path=path, fp=open(path, "a", encoding="utf-8"))
            self._files[serial] = h
        return h

    def append(self, serial: str, row: dict[str, Any]) -> None:
        """한 줄 = {"ts","d","p","spm","hr","cal","max_w"} (§3.3).

        가상 레인(virtual)은 호출 측에서 제외 — JSONL 기록 안 함(§4b.5).
        """
        h = self._handle(serial)
        h.fp.write(json.dumps(row, ensure_ascii=False) + "\n")
        h.points += 1
        now = time.monotonic()
        if now - h.last_flush >= self.flush_interval_s:
            h.fp.flush()
            os.fsync(h.fp.fileno())
            h.last_flush = now

    def flush_all(self) -> None:
        for h in self._files.values():
            try:
                h.fp.flush()
                os.fsync(h.fp.fileno())
            except (OSError, ValueError):
                pass

    def close(self) -> None:
        self.flush_all()
        for h in self._files.values():
            try:
                h.fp.close()
            except (OSError, ValueError):
                pass
        if self._meta:
            self._meta["ended_at"] = time.time()
            self._write_meta()

    # ── 요약 추출 → race_records 입력 (§3.3) ─────────────────────────────────
    def summarize(self) -> dict[str, dict[str, Any]]:
        """serial → 요약(총거리·시간·avg/max watts·avg spm·avg/max hr·cal).

        파일에서 다시 읽어 계산(비정상 종료 후 재처리도 동일 결과 — 멱등).
        """
        result: dict[str, dict[str, Any]] = {}
        if not os.path.isdir(self.dir):
            return result
        for fname in os.listdir(self.dir):
            if not fname.endswith(".jsonl"):
                continue
            serial = fname[: -len(".jsonl")]
            result[serial] = self._summarize_file(os.path.join(self.dir, fname))
        return result

    @staticmethod
    def _summarize_file(path: str) -> dict[str, Any]:
        last_d = 0.0
        last_ts = 0.0
        first_ts: float | None = None
        cal = 0
        max_w = 0.0
        pw_sum = 0.0
        pw_n = 0
        spm_sum = 0.0
        spm_n = 0
        hr_sum = 0
        hr_n = 0
        hr_max = 0
        points = 0
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue  # 비정상 종료로 잘린 마지막 라인 관대 스킵
                points += 1
                ts = float(row.get("ts", 0) or 0)
                if first_ts is None:
                    first_ts = ts
                last_ts = ts
                last_d = max(last_d, float(row.get("d", 0) or 0))
                cal = max(cal, int(row.get("cal", 0) or 0))
                w = float(row.get("p", 0) or 0)
                max_w = max(max_w, float(row.get("max_w", 0) or 0), w)
                if w > 0:
                    pw_sum += w
                    pw_n += 1
                spm = float(row.get("spm", 0) or 0)
                if spm > 0:
                    spm_sum += spm
                    spm_n += 1
                hr = row.get("hr")
                if hr:
                    hr_sum += int(hr)
                    hr_n += 1
                    hr_max = max(hr_max, int(hr))
        duration = (last_ts - first_ts) if (first_ts is not None) else 0.0
        return {
            "result_distance": round(last_d, 2),
            "duration_seconds": round(duration, 2),
            "calories_burned": cal,
            "avg_watts": round(pw_sum / pw_n, 2) if pw_n else 0.0,
            "max_watts": round(max_w, 2),
            "avg_spm": round(spm_sum / spm_n, 1) if spm_n else 0.0,
            "avg_hr_bpm": round(hr_sum / hr_n) if hr_n else None,
            "max_hr_bpm": hr_max or None,
            "total_data_points": points,
        }

    @property
    def meta(self) -> dict[str, Any]:
        return self._meta


def cleanup_old_recordings(base_dir: str, retention_days: int) -> int:
    """보관기간 초과 이벤트 디렉터리 삭제(§3.3, 30일). 삭제 수 반환."""
    if not os.path.isdir(base_dir):
        return 0
    cutoff = time.time() - retention_days * 86400
    removed = 0
    for name in os.listdir(base_dir):
        p = os.path.join(base_dir, name)
        if not os.path.isdir(p):
            continue
        try:
            if os.path.getmtime(p) < cutoff:
                for root, _dirs, files in os.walk(p, topdown=False):
                    for fn in files:
                        os.remove(os.path.join(root, fn))
                    os.rmdir(root)
                removed += 1
        except OSError:
            continue
    return removed
