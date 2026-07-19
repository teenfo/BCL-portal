-- 샘플 요금제 시드 (운영 데이터 부트스트랩 — Admin이 /admin/plans에서 조정 전제).
-- 활성 플랜이 하나도 없을 때만 데모/프리뷰용 기본 5종 삽입(멱등 가드).
INSERT INTO public.membership_plans
  (facility_id, name, type, plan_kind, duration_days, credit_count, price, discount_price, refund_policy, max_pauses, facility_sharing, is_active, description)
SELECT f.id, v.name, v.type, v.plan_kind, v.duration_days, v.credit_count, v.price, v.discount_price, '{}'::jsonb, v.max_pauses, false, true, v.description
FROM public.facilities f
CROSS JOIN (VALUES
  ('1개월 정기권', 'period', 'standard', 30,  NULL, 150000, 135000, 1, '30일 무제한 이용 (샘플 — 가격/정책은 관리자 설정)'),
  ('3개월 정기권', 'period', 'standard', 90,  NULL, 400000, 360000, 2, '90일 무제한 이용 (샘플)'),
  ('10회 횟수권', 'count',  'standard', NULL, 10,   180000, NULL,   1, '10회 이용권 (샘플)'),
  ('체험권',      'period', 'trial',    7,    NULL, 20000,  NULL,   0, '7일 체험 (샘플)'),
  ('드롭인 1일권','period', 'drop_in',  1,    NULL, 25000,  NULL,   0, '당일 1회 이용 (샘플)')
) AS v(name, type, plan_kind, duration_days, credit_count, price, discount_price, max_pauses, description)
WHERE NOT EXISTS (SELECT 1 FROM public.membership_plans WHERE is_active)
ORDER BY f.created_at
LIMIT 5;
