-- =============================================
-- 키오스크 기기 테스트 데이터 시딩
-- =============================================

-- 기존 데이터 삭제 (필요 시)
-- DELETE FROM public.kiosk_devices;

-- 키오스크 기기 등록
INSERT INTO public.kiosk_devices (facility_id, device_name, device_ip, status, display_message, last_heartbeat) VALUES
-- Main Center 키오스크
((SELECT id FROM public.facilities WHERE name = 'Main Center' LIMIT 1), 'Kiosk-Main-01', '192.168.1.101', 'active', '환영합니다! 화면을 터치하여 체크인하세요.', NOW() - INTERVAL '2 minutes'),
((SELECT id FROM public.facilities WHERE name = 'Main Center' LIMIT 1), 'Kiosk-Main-02', '192.168.1.102', 'active', NULL, NOW() - INTERVAL '5 minutes'),

-- Gangnam 키오스크 
((SELECT id FROM public.facilities WHERE name = 'Gangnam' LIMIT 1), 'Kiosk-GN-01', '192.168.2.101', 'active', '강남점에 오신 것을 환영합니다!', NOW() - INTERVAL '1 minute'),

-- Offline 키오스크
((SELECT id FROM public.facilities WHERE name = 'Bundang' LIMIT 1), 'Kiosk-BD-01', '192.168.3.101', 'offline', NULL, NOW() - INTERVAL '2 days'),

-- Maintenance 키오스크
((SELECT id FROM public.facilities WHERE name = 'Sinchon' LIMIT 1), 'Kiosk-SC-01', '192.168.4.101', 'maintenance', '현재 점검 중입니다. 데스크에 문의하세요.', NOW() - INTERVAL '3 hours');

-- 확인
SELECT 
    d.device_name,
    d.device_ip,
    d.status,
    f.name AS facility,
    d.display_message,
    d.last_heartbeat
FROM public.kiosk_devices d
LEFT JOIN public.facilities f ON d.facility_id = f.id
ORDER BY d.device_name;
