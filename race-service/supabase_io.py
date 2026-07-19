"""supabase_io.py — Supabase 발행/쓰기 (SRK, RLS bypass, R-6).

3경로 중 경로1(Broadcast)·경로2(race_live_state UPSERT)·결과 적재(race_records)를
담당한다. Realtime WebSocket 대신 **Realtime HTTP Broadcast 엔드포인트**와
**PostgREST**를 httpx로 호출 — 서버사이드 발행에 가장 단순·견고한 경로.

Broadcast 채널명은 반드시 class-broadcast/contract.ts의 `race:{event_id}`와
동일해야 한다(TV가 anon 구독). 이벤트명: erg_update / race_start / race_finish /
race_reset / state_snapshot / lane_assign.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

log = logging.getLogger("race.supabase")


def race_channel_name(event_id: str) -> str:
    """class-broadcast/contract.ts raceChannelName와 1:1 동일."""
    return f"race:{event_id}"


class SupabaseIO:
    def __init__(self, url: str, service_role_key: str) -> None:
        self._base = url.rstrip("/")
        self._key = service_role_key
        self._enabled = bool(url and service_role_key)
        self._client = httpx.AsyncClient(timeout=5.0) if self._enabled else None

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _headers(self, *, prefer: str | None = None) -> dict[str, str]:
        h = {
            "apikey": self._key,
            "Authorization": f"Bearer {self._key}",
            "Content-Type": "application/json",
        }
        if prefer:
            h["Prefer"] = prefer
        return h

    async def aclose(self) -> None:
        if self._client:
            await self._client.aclose()

    # ── 경로1: Broadcast ─────────────────────────────────────────────────────
    async def broadcast(self, event_id: str, event: str, payload: dict[str, Any]) -> None:
        """race:{event_id} 채널로 단일 메시지 발행 (Realtime HTTP Broadcast)."""
        await self.broadcast_many([(event_id, event, payload)])

    async def broadcast_many(self, messages: list[tuple[str, str, dict[str, Any]]]) -> None:
        """여러 메시지를 한 번의 HTTP 호출로 발행(0.3s 배치)."""
        if not self._client:
            return
        body = {
            "messages": [
                {
                    "topic": race_channel_name(event_id),
                    "event": event,
                    "payload": payload,
                    "private": False,
                }
                for event_id, event, payload in messages
            ]
        }
        try:
            r = await self._client.post(
                f"{self._base}/realtime/v1/api/broadcast",
                headers=self._headers(),
                json=body,
            )
            if r.status_code >= 300:
                log.warning("broadcast failed %s: %s", r.status_code, r.text[:200])
        except httpx.HTTPError as exc:
            log.warning("broadcast error: %s", exc)

    # ── 경로2: race_live_state UPSERT / DELETE ───────────────────────────────
    async def upsert_live_state(self, rows: list[dict[str, Any]]) -> None:
        """5s 스냅샷 UPSERT (UNIQUE(event_id, device_id) 기준 멱등)."""
        if not self._client or not rows:
            return
        try:
            r = await self._client.post(
                f"{self._base}/rest/v1/race_live_state",
                headers=self._headers(prefer="resolution=merge-duplicates,return=minimal"),
                params={"on_conflict": "event_id,device_id"},
                json=rows,
            )
            if r.status_code >= 300:
                log.warning("live_state upsert failed %s: %s", r.status_code, r.text[:200])
        except httpx.HTTPError as exc:
            log.warning("live_state upsert error: %s", exc)

    async def delete_live_state(self, event_id: str) -> None:
        """레이스 stop 시 event_id 행 전체 DELETE (수명 §3.2 — 잔존 0건 게이트)."""
        if not self._client:
            return
        try:
            r = await self._client.delete(
                f"{self._base}/rest/v1/race_live_state",
                headers=self._headers(prefer="return=minimal"),
                params={"event_id": f"eq.{event_id}"},
            )
            if r.status_code >= 300:
                log.warning("live_state delete failed %s: %s", r.status_code, r.text[:200])
        except httpx.HTTPError as exc:
            log.warning("live_state delete error: %s", exc)

    # ── 결과 적재: race_records UPSERT / race_recordings ─────────────────────
    async def upsert_records(self, rows: list[dict[str, Any]]) -> int:
        """JSONL 요약 → race_records 멱등 UPSERT (UNIQUE(event_id, member_id)).

        주의(R-1): finish_rank·is_pr은 Python이 계산하지 않는다. 여기서는 집계
        컬럼(거리·시간·watts·spm·hr·cal)만 적재하고, 순위/PR 판정은 Portal이
        fn_finish_race_event(event_id) 호출로 수행한다. → app-flag 참조.
        """
        if not self._client or not rows:
            return 0
        try:
            r = await self._client.post(
                f"{self._base}/rest/v1/race_records",
                headers=self._headers(prefer="resolution=merge-duplicates,return=minimal"),
                params={"on_conflict": "event_id,member_id"},
                json=rows,
            )
            if r.status_code >= 300:
                log.warning("records upsert failed %s: %s", r.status_code, r.text[:200])
                return 0
            return len(rows)
        except httpx.HTTPError as exc:
            log.warning("records upsert error: %s", exc)
            return 0

    async def insert_recording(self, row: dict[str, Any]) -> None:
        """race_recordings 파일 메타 인덱스 1행 (event/device/file_path/points/...)."""
        if not self._client:
            return
        try:
            r = await self._client.post(
                f"{self._base}/rest/v1/race_recordings",
                headers=self._headers(prefer="return=minimal"),
                json=[row],
            )
            if r.status_code >= 300:
                log.warning("recording insert failed %s: %s", r.status_code, r.text[:200])
        except httpx.HTTPError as exc:
            log.warning("recording insert error: %s", exc)

    async def set_device_mode(self, serials: list[str], mode: str) -> None:
        """pm5_devices.current_mode 일괄 전환 (racing↔idle, 모드락 §4.2).

        시리얼 기준 필터. Python은 상태 전이만(등록 CRUD는 Admin)."""
        if not self._client or not serials:
            return
        try:
            in_list = ",".join(f'"{s}"' for s in serials)
            r = await self._client.patch(
                f"{self._base}/rest/v1/pm5_devices",
                headers=self._headers(prefer="return=minimal"),
                params={"serial_number": f"in.({in_list})"},
                json={"current_mode": mode},
            )
            if r.status_code >= 300:
                log.warning("device mode patch failed %s: %s", r.status_code, r.text[:200])
        except httpx.HTTPError as exc:
            log.warning("device mode patch error: %s", exc)
