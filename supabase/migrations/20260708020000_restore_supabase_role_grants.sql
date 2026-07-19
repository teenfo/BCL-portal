-- Supabase 표준 역할 GRANT 복원 (초기화 시 schema 재생성으로 유실된 anon/authenticated 권한)
-- RLS가 실제 행 접근을 통제하므로, 테이블 GRANT는 "접근 시도 허용"만 담당(Supabase 표준 모델).
-- 근본 원인: DROP SCHEMA public CASCADE 후 default privileges를 postgres/service_role에만 부여 →
--            authenticated의 base-table SELECT 권한 부재 → 로그인 후 profiles 조회 42501 → 리다이렉트 실패.
-- ※ docs/sql/00_extensions_helpers.sql §0에 동일 내용 반영(fresh 재init 시 1패스 적용).
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
