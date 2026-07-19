"""pm5.py — Concept2 PM5 BLE GATT 상수 + 특성 파서 (docs/15 §1.1).

역할 경계 R-1: 이 모듈은 **바이트 파싱만** 한다. 순위·팀 합산·PR 판정 등
레이스 규칙은 절대 계산하지 않는다(그건 Portal의 몫).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  하드웨어 검증 필요 (HARDWARE-TEST):
    아래 바이트 오프셋·스케일은 Concept2 "PM Bluetooth Smart Interface
    Definition"(공개 규격) 기준의 참조값이다. PM5 펌웨어 버전에 따라 필드
    길이가 달라질 수 있으므로 L2(단일 장비) 검증에서 실측 로그와 대조하여
    확정해야 한다. 각 파서에 [HW] 주석으로 검증 포인트를 표기했다.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ── GATT UUID (C2 Rowing Service, docs/15 §1.1) ──────────────────────────────
# 서비스/특성은 CE06xxxx-43E5-11E4-916C-0800200C9A66 계열.
def _c2_uuid(short: str) -> str:
    return f"ce06{short}-43e5-11e4-916c-0800200c9a66"


PM5_DEVICE_INFO_SERVICE = _c2_uuid("0010")
PM5_ROWING_SERVICE = _c2_uuid("0030")

# 구독 대상 특성 (notify)
CHAR_GENERAL_STATUS = _c2_uuid("0031")       # 0x0031: elapsed, distance, workout state
CHAR_ADDITIONAL_STATUS_1 = _c2_uuid("0032")  # 0x0032: speed, SPM, HR, pace
CHAR_ADDITIONAL_STATUS_2 = _c2_uuid("0033")  # 0x0033: power(avg), calories
CHAR_STROKE_DATA = _c2_uuid("0035")          # 0x0035: per-stroke distance/force/work

# 구독 특성 전체 (bridge가 순회하며 notify 등록)
SUBSCRIBE_CHARACTERISTICS = (
    CHAR_GENERAL_STATUS,
    CHAR_ADDITIONAL_STATUS_1,
    CHAR_ADDITIONAL_STATUS_2,
    CHAR_STROKE_DATA,
)

# BLE 광고명 패턴 — "PM5 {serial}" → 시리얼 파싱이 주 식별 경로 (R-5)
BLE_NAME_PREFIX = "PM5"

# HR 무효값 (심박 벨트 미연결)
HR_INVALID = 255


def parse_serial_from_name(ble_name: str | None) -> str | None:
    """광고명에서 PM5 시리얼 추출 (R-5, iOS/Mac MAC 은닉 대응).

    "PM5 430123456" → "430123456". 패턴 불일치 시 None.
    """
    if not ble_name:
        return None
    parts = ble_name.strip().split()
    if len(parts) >= 2 and parts[0].upper() == BLE_NAME_PREFIX:
        return parts[1]
    # 일부 펌웨어는 "PM5430123456" 형태 — 접두 제거 폴백
    up = ble_name.strip().upper()
    if up.startswith(BLE_NAME_PREFIX) and len(up) > len(BLE_NAME_PREFIX):
        tail = ble_name.strip()[len(BLE_NAME_PREFIX):].lstrip()
        return tail or None
    return None


def _u16(b: bytes, i: int) -> int:
    return int.from_bytes(b[i:i + 2], "little", signed=False) if len(b) >= i + 2 else 0


def _u24(b: bytes, i: int) -> int:
    return int.from_bytes(b[i:i + 3], "little", signed=False) if len(b) >= i + 3 else 0


def _u8(b: bytes, i: int) -> int:
    return b[i] if len(b) > i else 0


@dataclass
class PM5Sample:
    """단일 기기의 병합된 현재 상태. 각 특성 notify가 부분 필드를 갱신한다.

    필드 미수신 시 이전값 유지(누적 상태 머신). elapsed/distance는 General
    Status가 1차 소스, power/spm/hr는 Additional Status가 보강.
    """

    distance_m: float = 0.0       # 실측 누적 거리(m) — General Status 원천
    elapsed_s: float = 0.0        # 경과 시간(s)
    workout_state: int = 0        # 0=idle 등 (§ workout state enum)
    stroke_rate_spm: float = 0.0  # SPM/RPM/CAD (기기별, Concept2 규격 그대로)
    power_w: float = 0.0          # 순간/평균 파워(W)
    hr_bpm: int | None = None     # 심박(bpm), None=무효
    calories: int = 0             # 누적 칼로리
    pace_500_s: float = 0.0       # 500m 페이스(초)
    max_w: float = 0.0            # 파생 지표: 세션 내 최고 와트(§1.1)
    updated: bool = field(default=False, repr=False)

    def apply_general_status(self, data: bytes) -> None:
        """0x0031 General Status 파싱.

        [HW] 참조 레이아웃(공개 규격):
          0-2  elapsed time   (0.01 s LSB, uint24)
          3-5  distance       (0.1 m  LSB, uint24)
          8    workout state
          10   stroke state
          17   drag factor
        """
        if len(data) < 6:
            return
        self.elapsed_s = _u24(data, 0) * 0.01
        self.distance_m = _u24(data, 3) * 0.1
        self.workout_state = _u8(data, 8)
        self.updated = True

    def apply_additional_status_1(self, data: bytes) -> None:
        """0x0032 Additional Status 1 파싱.

        [HW] 참조 레이아웃:
          0-2  elapsed time  (0.01 s)
          3-4  speed         (0.001 m/s, uint16)
          5    stroke rate   (strokes/min)  ← SPM/RPM/CAD (기기 종류별)
          6    heart rate    (bpm, 255=invalid)
          7-8  current pace  (0.01 s/500m, uint16)
        """
        if len(data) < 7:
            return
        self.stroke_rate_spm = float(_u8(data, 5))
        hr = _u8(data, 6)
        self.hr_bpm = None if hr == HR_INVALID or hr == 0 else hr
        self.pace_500_s = _u16(data, 7) * 0.01
        self.updated = True

    def apply_additional_status_2(self, data: bytes) -> None:
        """0x0033 Additional Status 2 파싱.

        [HW] 참조 레이아웃:
          0-2  elapsed time   (0.01 s)
          3    interval count
          4-5  average power  (watts, uint16)
          6-7  total calories (cal, uint16)
          8-9  split avg pace
        """
        if len(data) < 8:
            return
        power = float(_u16(data, 4))
        self.power_w = power
        if power > self.max_w:
            self.max_w = power  # 파생: max_w 누적 추적(§1.1)
        self.calories = _u16(data, 6)
        self.updated = True

    def apply_stroke_data(self, data: bytes) -> None:
        """0x0035 Stroke Data 파싱 (19 bytes).

        [HW] 참조 레이아웃:
          0-2   elapsed time      (0.01 s)
          3-5   distance          (0.1 m)
          10-11 stroke distance   (0.01 m)
          16-17 work per stroke   (0.1 J)
        power/spm는 Additional Status가 더 안정적이라 여기선 distance만 보강.
        (일부 펌웨어에서 stroke-level 파워 산출이 필요하면 work-per-stroke ×
         cadence로 유도 — L2에서 결정)
        """
        if len(data) < 6:
            return
        # General Status가 늦는 프레임 사이 거리 보간 소스
        d = _u24(data, 3) * 0.1
        if d > 0:
            self.distance_m = max(self.distance_m, d)
        self.updated = True


# 특성 UUID → 파서 메서드명 디스패치 (bridge가 사용)
CHARACTERISTIC_DISPATCH: dict[str, str] = {
    CHAR_GENERAL_STATUS: "apply_general_status",
    CHAR_ADDITIONAL_STATUS_1: "apply_additional_status_1",
    CHAR_ADDITIONAL_STATUS_2: "apply_additional_status_2",
    CHAR_STROKE_DATA: "apply_stroke_data",
}


def apply_notification(sample: PM5Sample, char_uuid: str, data: bytes) -> None:
    """특성 UUID에 맞는 파서로 sample을 in-place 갱신."""
    method = CHARACTERISTIC_DISPATCH.get(char_uuid.lower())
    if method:
        getattr(sample, method)(bytes(data))
