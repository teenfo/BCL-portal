"""
PM5 BLE Manager
================
Manages BLE scanning, connection, and notification subscription
for multiple PM5 devices using Bleak.

Supports multi-adapter (dongle) distribution for scaling beyond
the typical 7-connection limit per Bluetooth adapter.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field

from bleak import BleakScanner, BleakClient
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

from pm5_spec import (
    PM5_BLE_NAME_PREFIXES,
    PM5_ROWING_SERVICE,
    RACE_SUBSCRIBE_CHARS,
    CHAR_ADDITIONAL_STROKE_DATA,
    MAX_CONNECTIONS_PER_ADAPTER,
    SCAN_TIMEOUT,
    CONNECT_TIMEOUT,
    RECONNECT_MAX_ATTEMPTS,
    RECONNECT_BASE_DELAY,
    RECONNECT_MAX_DELAY,
)
from pm5_parsers import DeviceAccumulator, CHAR_PARSERS

logger = logging.getLogger("pm5_manager")


@dataclass
class PM5Connection:
    """Represents a single BLE connection to a PM5 device."""
    device: BLEDevice
    client: Optional[BleakClient] = None
    serial: str = ""
    ble_name: str = ""
    mac_address: str = ""
    accumulator: DeviceAccumulator = field(default_factory=DeviceAccumulator)
    connected: bool = False
    adapter: Optional[str] = None  # Adapter identifier (e.g., "hci0")
    intentional_disconnect: bool = False  # True = closed by us (skip auto-reconnect)


class PM5Manager:
    """Manages multiple PM5 BLE device connections."""

    def __init__(
        self,
        on_data_callback: Optional[Callable[[str, dict], Any]] = None,
        adapters: Optional[List[str]] = None,
    ):
        """
        Args:
            on_data_callback: Called with (device_serial, snapshot_dict)
                              each time new data arrives from a device.
            adapters: List of BLE adapter names (e.g., ["hci0", "hci1"]).
                      None = use default adapter.
        """
        self._connections: Dict[str, PM5Connection] = {}  # serial → connection
        self._on_data = on_data_callback
        self._adapters = adapters or [None]  # None = default adapter
        self._scan_results: Dict[str, BLEDevice] = {}  # address → device
        self._lock = asyncio.Lock()
        self._reconnecting: set = set()  # serials with an in-flight reconnect loop

    @property
    def connections(self) -> Dict[str, PM5Connection]:
        return self._connections

    @property
    def connected_count(self) -> int:
        return sum(1 for c in self._connections.values() if c.connected)

    # ─────────────────────────────────────────
    # Scanning
    # ─────────────────────────────────────────

    async def scan(self, timeout: float = SCAN_TIMEOUT) -> List[dict]:
        """Scan for PM5 devices using all available adapters.

        Returns:
            List of discovered device dicts with keys:
            - address: BLE MAC address
            - name: Device name (e.g., "PM5 430123456")
            - serial: Parsed serial number
            - rssi: Signal strength
        """
        self._scan_results.clear()
        discovered = []

        for adapter in self._adapters:
            try:
                scanner_kwargs = {}
                if adapter:
                    scanner_kwargs["adapter"] = adapter

                devices = await BleakScanner.discover(
                    timeout=timeout,
                    return_adv=True,
                    **scanner_kwargs,
                )

                for device, adv_data in devices.values():
                    name = device.name or adv_data.local_name or ""
                    if not any(name.startswith(prefix) for prefix in PM5_BLE_NAME_PREFIXES):
                        continue

                    serial = self._parse_serial(name)
                    self._scan_results[device.address] = device

                    discovered.append({
                        "address": device.address,
                        "name": name,
                        "serial": serial,
                        "rssi": adv_data.rssi,
                        "adapter": adapter,
                    })
                    logger.info(f"Discovered PM5: {name} ({device.address}) RSSI={adv_data.rssi}")

            except Exception as e:
                logger.error(f"Scan error on adapter {adapter}: {e}")

        return discovered

    # ─────────────────────────────────────────
    # Connection Management
    # ─────────────────────────────────────────

    async def connect(self, address: str, serial: str, adapter: Optional[str] = None) -> bool:
        """Connect to a specific PM5 device and subscribe to notifications.

        Args:
            address: BLE MAC address or UUID
            serial: Device serial number (for identification)
            adapter: Specific adapter to use

        Returns:
            True if connection successful
        """
        prior = self._connections.get(serial)
        if prior and prior.connected:
            logger.info(f"Already connected to {serial}")
            return True

        # Distribute across dongles when multiple adapters are configured.
        if adapter is None:
            adapter = self._select_adapter()

        device = self._scan_results.get(address)
        if not device:
            logger.warning(f"Device {address} not found in scan results, attempting direct connect")
            device = BLEDevice(address, f"PM5 {serial}")

        conn = PM5Connection(
            device=device,
            serial=serial,
            ble_name=device.name or f"PM5 {serial}",
            mac_address=address,
            adapter=adapter,
        )
        # Preserve the prior accumulator on reconnect so in-race distance and the
        # race-start base offset survive a dropped/restored BLE link. A brand-new
        # connection starts with a fresh accumulator.
        conn.accumulator = prior.accumulator if prior else DeviceAccumulator(serial=serial)

        try:
            client_kwargs = {}
            if adapter:
                client_kwargs["adapter"] = adapter

            client = BleakClient(
                device,
                timeout=CONNECT_TIMEOUT,
                disconnected_callback=lambda c: self._on_disconnect(serial),
                **client_kwargs,
            )
            await client.connect()
            conn.client = client
            conn.connected = True

            # Subscribe to racing characteristics
            for char_uuid in RACE_SUBSCRIBE_CHARS + [CHAR_ADDITIONAL_STROKE_DATA]:
                try:
                    await client.start_notify(
                        char_uuid,
                        lambda sender, data, s=serial, uuid=char_uuid: asyncio.ensure_future(
                            self._on_notify(s, uuid, data)
                        ),
                    )
                    logger.debug(f"Subscribed {serial} to {char_uuid}")
                except Exception as e:
                    logger.warning(f"Failed to subscribe {serial} to {char_uuid}: {e}")

            async with self._lock:
                self._connections[serial] = conn

            logger.info(f"✅ Connected to PM5 {serial} ({address})")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to connect to PM5 {serial} ({address}): {e}")
            return False

    async def disconnect(self, serial: str) -> bool:
        """Disconnect a specific PM5 device."""
        async with self._lock:
            conn = self._connections.get(serial)
        if not conn or not conn.client:
            return False

        # Mark as intentional so the disconnected_callback does not auto-reconnect.
        conn.intentional_disconnect = True
        try:
            if conn.client.is_connected:
                await conn.client.disconnect()
            conn.connected = False
            logger.info(f"Disconnected PM5 {serial}")
            return True
        except Exception as e:
            logger.error(f"Error disconnecting {serial}: {e}")
            conn.connected = False
            return False

    async def disconnect_all(self) -> None:
        """Disconnect all connected PM5 devices."""
        serials = list(self._connections.keys())
        tasks = [self.disconnect(s) for s in serials]
        await asyncio.gather(*tasks, return_exceptions=True)
        async with self._lock:
            self._connections.clear()
        logger.info("All PM5 devices disconnected")

    # ─────────────────────────────────────────
    # Notification Handling
    # ─────────────────────────────────────────

    async def _on_notify(self, serial: str, char_uuid: str, data: bytes) -> None:
        """Handle incoming BLE notification data."""
        conn = self._connections.get(serial)
        if not conn:
            return

        # Route to appropriate parser
        parser = CHAR_PARSERS.get(char_uuid)
        if parser:
            parser(data, conn.accumulator)

        # Invoke callback with latest snapshot
        if self._on_data:
            try:
                snapshot = conn.accumulator.snapshot()
                snapshot["device_serial"] = serial
                self._on_data(serial, snapshot)
            except Exception as e:
                logger.error(f"Callback error for {serial}: {e}")

    def _on_disconnect(self, serial: str) -> None:
        """Handle BLE disconnection. Schedules auto-reconnect for unexpected drops
        (sleep / out-of-range / interference) so a mid-race link loss recovers on
        its own instead of leaving a dead lane until the coach intervenes."""
        conn = self._connections.get(serial)
        if not conn:
            return
        conn.connected = False

        if conn.intentional_disconnect:
            logger.info(f"PM5 {serial} disconnected (intentional)")
            return

        logger.warning(f"⚠️ PM5 {serial} disconnected unexpectedly — scheduling auto-reconnect")
        try:
            asyncio.get_event_loop().create_task(self._reconnect(serial))
        except RuntimeError as e:
            logger.error(f"Cannot schedule reconnect for {serial}: {e}")

    async def _reconnect(self, serial: str) -> None:
        """Reconnect a dropped device with exponential backoff. The preserved
        accumulator (see connect()) keeps in-race distance continuous."""
        # Guard against overlapping reconnect loops if the link flaps repeatedly.
        if serial in self._reconnecting:
            return
        self._reconnecting.add(serial)
        try:
            conn = self._connections.get(serial)
            if not conn:
                return
            address, adapter = conn.mac_address, conn.adapter
            delay = RECONNECT_BASE_DELAY

            for attempt in range(1, RECONNECT_MAX_ATTEMPTS + 1):
                cur = self._connections.get(serial)
                # Stop if the device recovered, was closed intentionally, or removed.
                if not cur or cur.connected or cur.intentional_disconnect:
                    return

                await asyncio.sleep(delay)
                logger.info(f"🔁 Reconnect attempt {attempt}/{RECONNECT_MAX_ATTEMPTS} for PM5 {serial}")
                try:
                    if await self.connect(address, serial, adapter):
                        logger.info(f"✅ Reconnected PM5 {serial}")
                        return
                except Exception as e:
                    logger.warning(f"Reconnect attempt {attempt} for {serial} failed: {e}")

                delay = min(delay * 2, RECONNECT_MAX_DELAY)

            logger.error(f"❌ Auto-reconnect gave up for PM5 {serial} after {RECONNECT_MAX_ATTEMPTS} attempts")
        finally:
            self._reconnecting.discard(serial)

    # ─────────────────────────────────────────
    # Status & Helpers
    # ─────────────────────────────────────────

    def get_status(self) -> List[dict]:
        """Get connection status for all known devices."""
        return [
            {
                "serial": conn.serial,
                "ble_name": conn.ble_name,
                "address": conn.mac_address,
                "connected": conn.connected,
                "distance_m": round(conn.accumulator.effective_distance(), 2) if conn.connected else 0,
                "power_w": conn.accumulator.current.power_watts if conn.connected else 0,
                "spm": round(conn.accumulator.current.stroke_rate_spm, 1) if conn.connected else 0,
            }
            for conn in self._connections.values()
        ]

    def get_accumulator(self, serial: str) -> Optional[DeviceAccumulator]:
        """Get the data accumulator for a specific device."""
        conn = self._connections.get(serial)
        return conn.accumulator if conn else None

    def mark_all_race_start(self) -> None:
        """Mark race start for all connected devices (capture base distance)."""
        for conn in self._connections.values():
            if conn.connected:
                conn.accumulator.mark_race_start()
        logger.info("Race started — base distances captured for all devices")

    def reset_all(self) -> None:
        """Reset all accumulators for a new race."""
        for conn in self._connections.values():
            conn.accumulator.reset()
        logger.info("All device accumulators reset")

    @staticmethod
    def _parse_serial(name: str) -> str:
        """Extract serial number from PM5 BLE name.
        Examples:
            "PM5 430123456" → "430123456"
            "Concept2 PM5 430123456-1" → "430123456"
        """
        parts = name.split()
        for part in parts:
            # Serial is typically a 9-digit number starting with 4
            digits = "".join(c for c in part if c.isdigit())
            if len(digits) >= 9:
                return digits[:9]
        # Fallback: last numeric segment
        for part in reversed(parts):
            stripped = part.split("-")[0]
            if stripped.isdigit():
                return stripped
        return name  # Last resort: full name as identifier

    def _select_adapter(self) -> Optional[str]:
        """Select the adapter with fewest connections for load balancing."""
        if not self._adapters or self._adapters == [None]:
            return None

        adapter_counts: Dict[str, int] = {a: 0 for a in self._adapters if a}
        for conn in self._connections.values():
            if conn.connected and conn.adapter:
                adapter_counts[conn.adapter] = adapter_counts.get(conn.adapter, 0) + 1

        # Find adapter with fewest connections under the limit
        best = None
        min_count = MAX_CONNECTIONS_PER_ADAPTER
        for adapter, count in adapter_counts.items():
            if count < min_count:
                min_count = count
                best = adapter

        return best
