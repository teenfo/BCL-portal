-- Race system performance indexes
-- Generated: 2026-05-30
-- ------------------------------------------------------------
-- [백필 노트] 본 파일은 2026-05-30 Supabase MCP(apply_migration,
-- remote version 20260530143623)로 운영 DB에 이미 적용된 SQL의
-- 버전 관리용 백필 기록입니다. 원격 재적용 불필요.
-- ------------------------------------------------------------
-- 배경: ERG(PM5) 대결 기능 심층 점검에서 realtime-hot / 결과적재 경로의 인덱스 누락 확인.
--   모두 CREATE INDEX IF NOT EXISTS 라 재실행 안전, 데이터 영향 없음.

-- race_live_state: 스냅샷 루프가 device_id 로 join/조회. 기존엔 event_id 인덱스만 존재.
CREATE INDEX IF NOT EXISTS idx_race_live_state_device
    ON public.race_live_state(device_id);

-- race_records: 결과 적재 멱등 체크가 (event_id, device_serial) 로 조회(main.py _load_race_results).
CREATE INDEX IF NOT EXISTS idx_race_records_event_device
    ON public.race_records(event_id, device_serial);

-- race_recordings: recording_id 매핑 조회도 (event_id, device_serial) 사용.
CREATE INDEX IF NOT EXISTS idx_race_recordings_event_device
    ON public.race_recordings(event_id, device_serial);
