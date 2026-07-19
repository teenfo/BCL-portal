"""race-service 설정 — 환경변수 로딩 단일 소스 (docs/15 §2.1).

모든 시크릿·튜닝값은 여기 한 곳에서만 읽는다. SRK는 서버 컨테이너 env로만
주입되며(R-6), 브라우저 번들에는 절대 존재하지 않는다.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    try:
        return int(raw) if raw else default
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = _env(name)
    try:
        return float(raw) if raw else default
    except ValueError:
        return default


def _env_bool(name: str, default: bool = False) -> bool:
    raw = _env(name).lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Config:
    # ── Supabase (SRK — 서버 전용, RLS bypass) ──
    supabase_url: str = field(default_factory=lambda: _env("SUPABASE_URL"))
    service_role_key: str = field(default_factory=lambda: _env("SUPABASE_SERVICE_ROLE_KEY"))

    # ── HTTP 서버 ──
    port: int = field(default_factory=lambda: _env_int("RACE_SERVICE_PORT", 8001))
    host: str = field(default_factory=lambda: _env("RACE_SERVICE_HOST", "0.0.0.0"))

    # ── 다중시설 스코핑 (§7.3): 인스턴스 = 시설당 1개 ──
    facility_id: str = field(default_factory=lambda: _env("FACILITY_ID"))

    # ── BLE ──
    # 사용할 HCI 어댑터 목록(라운드로빈 분산 §1.2). 예: "hci0,hci1,hci2"
    ble_adapters: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            a.strip() for a in _env("BLE_ADAPTERS", "hci0").split(",") if a.strip()
        )
    )
    # 어댑터당 안정 연결 상한(스로틀 방지 §1.2)
    max_per_adapter: int = field(default_factory=lambda: _env_int("BLE_MAX_PER_ADAPTER", 8))
    scan_seconds: int = field(default_factory=lambda: _env_int("BLE_SCAN_SECONDS", 8))

    # ── 파이프라인 주기 (docs/15 §3.1·§3.2) ──
    broadcast_hz: float = field(default_factory=lambda: _env_float("RACE_BROADCAST_HZ", 3.0))
    snapshot_interval_s: float = field(default_factory=lambda: _env_float("RACE_SNAPSHOT_INTERVAL_S", 5.0))

    # ── 레코딩 (경로3, JSONL) ──
    recordings_dir: str = field(default_factory=lambda: _env("RACE_RECORDINGS_DIR", "/data/recordings"))
    recording_retention_days: int = field(default_factory=lambda: _env_int("RACE_RECORDING_RETENTION_DAYS", 30))
    flush_interval_s: float = field(default_factory=lambda: _env_float("RACE_FLUSH_INTERVAL_S", 1.0))

    # ── CORS: 내부망 전용(수용 6-2). 콤마 구분 origin 또는 정규식 접두 ──
    cors_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            o.strip()
            for o in _env(
                "RACE_CORS_ORIGINS",
                "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000",
            ).split(",")
            if o.strip()
        )
    )

    # ── 시뮬레이션 모드(하드웨어 없이 3경로 실구동, L1 검증 §6.4) ──
    simulate: bool = field(default_factory=lambda: _env_bool("RACE_SIMULATE", False))

    def validate_supabase(self) -> bool:
        """Supabase 발행에 필요한 최소 설정 존재 여부. 없으면 로컬 전용(폴링) 모드."""
        return bool(self.supabase_url and self.service_role_key)


def load_config() -> Config:
    return Config()


def load_lane_mapping() -> dict[str, int]:
    """device serial → lane 고정 매핑(선택). env RACE_LANE_MAP=JSON.

    예: RACE_LANE_MAP='{"430123456":1,"430123457":2}'
    setup payload의 lane_assignments가 우선이며, 이 매핑은 setup 전 스캔 표시용 폴백.
    """
    raw = _env("RACE_LANE_MAP")
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return {str(k): int(v) for k, v in data.items()}
    except (json.JSONDecodeError, ValueError, TypeError):
        return {}
