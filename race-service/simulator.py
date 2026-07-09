"""simulator.py — 하드웨어 없는 3경로 실구동 (L1 검증 §6.4).

가상 레인 N개가 실측처럼 PM5Sample을 생성해 bridge.ingest_sample()로 주입한다.
파서 이후 코드는 실장비와 100% 공유(§6.4) — 시뮬 통과 = 파이프라인 로직 검증.

페이스보트 가상 레인(§4b.5, G-10)도 이 엔진을 재사용한다: 시리얼 PACER-1,
virtual=True로 주입 → 렌더 전용(집계·적재·경로2/3 제외).
"""

from __future__ import annotations

import asyncio
import math
import random
import time

import pm5
from bridge import RaceBridge
from recorder import LaneAssignment


class SimLane:
    """한 가상 로워의 상태 진행 모델(등속 + 노이즈 + 개인 페이스 편차)."""

    def __init__(self, serial: str, lane: int, base_spm: float, base_power: float, virtual: bool = False) -> None:
        self.serial = serial
        self.lane = lane
        self.base_spm = base_spm
        self.base_power = base_power
        self.virtual = virtual
        self.sample = pm5.PM5Sample()
        self._start = time.monotonic()

    def step(self, elapsed: float) -> pm5.PM5Sample:
        # 파워/SPM에 사인파+노이즈 — 스트로크 리듬 흉내
        wobble = math.sin(elapsed * 1.6) * 0.08
        power = max(0.0, self.base_power * (1 + wobble) + random.uniform(-8, 8))
        spm = max(0.0, self.base_spm + math.sin(elapsed * 0.5) * 2 + random.uniform(-1, 1))
        # 파워 → 속도(Concept2 근사: pace = (2.8/power)^(1/3) s/m, 페이서는 고정 페이스)
        if self.virtual:
            speed = self.base_power / 250.0  # 페이서: 목표 페이스 등속(m/s 근사)
            power = self.base_power
            spm = self.base_spm
        else:
            speed = (power / 2.8) ** (1 / 3) if power > 0 else 0.0
        self.sample.distance_m += speed * 0.3  # 0.3s 주기 누적
        self.sample.elapsed_s = elapsed
        self.sample.power_w = power
        self.sample.stroke_rate_spm = spm
        self.sample.max_w = max(self.sample.max_w, power)
        self.sample.calories = int(elapsed * 0.15 * (power / 200 + 1))
        self.sample.hr_bpm = None if self.virtual else int(130 + 30 * min(1.0, elapsed / 120) + random.uniform(-3, 3))
        self.sample.pace_500_s = (500.0 / speed) if speed > 0 else 0.0
        return self.sample


class Simulator:
    def __init__(self, bridge: RaceBridge) -> None:
        self.bridge = bridge
        self._lanes: list[SimLane] = []
        self._task: asyncio.Task | None = None
        self.running = False

    def build(self, lane_count: int = 6, with_pacer: bool = False, event_id: str | None = None) -> None:
        """가상 레인 시드. pm5_devices에 SIM-{n} synthetic 레코드 전제(M-6)."""
        self._lanes = []
        for i in range(1, lane_count + 1):
            self._lanes.append(
                SimLane(
                    serial=f"SIM-{i}",
                    lane=i,
                    base_spm=random.uniform(24, 32),
                    base_power=random.uniform(150, 260),
                )
            )
        if with_pacer:
            # 페이스보트 가상 레인(렌더 전용 §4b.5)
            self._lanes.append(SimLane(serial="PACER-1", lane=lane_count + 1, base_spm=26, base_power=200, virtual=True))

        # bridge에 레인 등록(setup 없이 시뮬 단독 실행 시)
        if event_id and not self.bridge.event_id:
            self.bridge.event_id = event_id
        for l in self._lanes:
            self.bridge.lanes.setdefault(
                l.serial,
                _new_lane_state(l),
            )

    async def start(self) -> None:
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    def reset(self) -> None:
        for l in self._lanes:
            l.sample = pm5.PM5Sample()
            l._start = time.monotonic()

    async def _run(self) -> None:
        t0 = time.monotonic()
        while self.running:
            elapsed = time.monotonic() - t0
            for l in self._lanes:
                sample = l.step(elapsed)
                self.bridge.ingest_sample(l.serial, sample, virtual=l.virtual)
            await asyncio.sleep(0.1)  # 2~3Hz보다 촘촘히 갱신 → 보간 부드럽게

    def status(self) -> dict:
        return {"running": self.running, "lanes": len(self._lanes)}


def _new_lane_state(sim: SimLane):
    from bridge import LaneState

    return LaneState(
        assignment=LaneAssignment(lane=sim.lane, device_serial=sim.serial, device_id=None, member_id=None),
        virtual=sim.virtual,
    )
