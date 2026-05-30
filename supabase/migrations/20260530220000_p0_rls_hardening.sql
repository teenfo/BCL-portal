-- P0 RLS Hardening
-- Generated: 2026-05-30
-- 배경: P0 보안 점검(.docs / plan: curious-kindling-pebble) 결과 확정된 2건의 하드닝.
--
-- 점검 요약(중요):
--  * session_rotation_states 의 anon SELECT(USING true)는 '버그가 아니라 의도된 설계'다.
--    /class 는 미인증 공용 경로이며 class/rotation-hud 가 로그인 없이 이 테이블을 직접 read +
--    realtime 구독한다(체육관 TV HUD). 따라서 SELECT 정책은 절대 건드리지 않는다.
--  * race_live_state/recordings/teams 의 coach 광범위 쓰기는 앱이 이벤트를 시설 전역으로
--    운영(coach/race/control 이 facility/배정 필터 없이 전역 로드)하고 coach->facility 매핑이
--    부재하여 스코핑 시 라이브 레이스가 깨지므로 '보류'(다중 시설 전환 시 별도 진행).
--  * admin_roles 권한상승 / pg_settings 결제키 노출 / "WITH CHECK 누락=쓰기우회" 지적은
--    Postgres RLS 의미론상(USING이 WITH CHECK 자동 대체, 역할 기반 정책) 오탐으로 확인.
--
-- 실제 적용 2건:
--  (1) session_rotation_states 의 '쓰기'를 배정 코치/관리자로 제한 (읽기 공개는 유지).
--  (2) wod_templates / wod_template_movements / class_runbook_templates 의 'DELETE'를 관리자 전용으로 제한
--      (coach 의 SELECT/INSERT/UPDATE 는 유지 — WOD 저작 보존).

-- ─────────────────────────────────────────────────────────────────────────────
-- (1) session_rotation_states: 쓰기 제한 (SELECT "Enable read access for all" 정책은 미변경)
--     기존 P1-A "session_wods assigned coach manage" 패턴을 그대로 차용.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable write access for coaches and admins" ON public.session_rotation_states;

CREATE POLICY "session_rotation_states admin manage" ON public.session_rotation_states
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "session_rotation_states assigned coach manage" ON public.session_rotation_states
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
        AND EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = session_rotation_states.session_id AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
        AND EXISTS (
            SELECT 1 FROM public.session_coaches sc
            JOIN public.coaches c ON c.id = sc.coach_id
            WHERE sc.session_id = session_rotation_states.session_id AND c.user_id = auth.uid()
        )
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- (2) 템플릿 DELETE 관리자 전용. coach 는 SELECT(기존 "* read all" 정책 유지) + INSERT/UPDATE 만.
--     기존 "FOR ALL" coach 정책을 제거하고, INSERT/UPDATE/DELETE 로 분리한다.
--     RPC fn_upsert_wod_template 등은 SECURITY DEFINER 라 본 정책의 영향을 받지 않는다.
-- ─────────────────────────────────────────────────────────────────────────────

-- wod_templates
DROP POLICY IF EXISTS "wod_templates coach admin manage" ON public.wod_templates;
CREATE POLICY "wod_templates coach admin insert" ON public.wod_templates
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "wod_templates coach admin update" ON public.wod_templates
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "wod_templates admin delete" ON public.wod_templates
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- wod_template_movements
DROP POLICY IF EXISTS "wod_template_movements coach admin manage" ON public.wod_template_movements;
CREATE POLICY "wod_template_movements coach admin insert" ON public.wod_template_movements
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "wod_template_movements coach admin update" ON public.wod_template_movements
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "wod_template_movements admin delete" ON public.wod_template_movements
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- class_runbook_templates
DROP POLICY IF EXISTS "class_runbook_templates coach admin manage" ON public.class_runbook_templates;
CREATE POLICY "class_runbook_templates coach admin insert" ON public.class_runbook_templates
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "class_runbook_templates coach admin update" ON public.class_runbook_templates
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_coach())
    WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "class_runbook_templates admin delete" ON public.class_runbook_templates
    FOR DELETE TO authenticated
    USING (public.is_admin());
