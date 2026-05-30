-- 1. wod_templates 및 session_wods 의 format CHECK 제약조건 제거 및 'station_circuit'을 포함한 새 제약조건 적용
ALTER TABLE public.wod_templates DROP CONSTRAINT IF EXISTS wod_templates_format_type_check;
ALTER TABLE public.wod_templates ADD CONSTRAINT wod_templates_format_type_check 
    CHECK (format_type IN ('for_time', 'amrap', 'emom', 'tabata', 'chipper', 'strength', 'custom', 'station_circuit') OR format_type IS NULL);

ALTER TABLE public.session_wods DROP CONSTRAINT IF EXISTS session_wods_format_override_check;
ALTER TABLE public.session_wods ADD CONSTRAINT session_wods_format_override_check 
    CHECK (format_override IN ('for_time', 'amrap', 'emom', 'tabata', 'chipper', 'strength', 'custom', 'station_circuit') OR format_override IS NULL);

-- 2. 실시간 세션 순환 정보 트래킹 테이블 설계
CREATE TABLE IF NOT EXISTS public.session_rotation_states (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id),
    current_round INTEGER DEFAULT 1,         -- 현재 스테이션 라운드 번호 (1~6)
    total_rounds INTEGER DEFAULT 6,          -- 총 스테이션/운동 개수
    seconds_per_round INTEGER DEFAULT 300,   -- 스테이션당 배정 시간 (초 단위, 디폴트 5분 = 300초)
    is_running BOOLEAN DEFAULT false,        -- 타이머 작동 여부
    timer_started_at TIMESTAMP WITH TIME ZONE, -- 타이머 가동 시작 시각 (실시간 동기화 계산용)
    paused_remaining_seconds INTEGER,        -- 일시정지 시 잔여 초
    team_assignments JSONB NOT NULL DEFAULT '[]', -- 팀원-스테이션 배정 매핑 정보
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.session_rotation_states ENABLE ROW LEVEL SECURITY;

-- 3. RLS 정책 정의
-- 익명/인증 사용자 모두 조회 가능(Read), 코치/관리자만 입력 및 수정 가능(Write)
CREATE POLICY "Enable read access for all" ON public.session_rotation_states
    FOR SELECT USING (true);

CREATE POLICY "Enable write access for coaches and admins" ON public.session_rotation_states
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.coaches WHERE coaches.user_id = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- updated_at 자동 갱신 트리거 추가
CREATE OR REPLACE FUNCTION public.update_session_rotation_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_session_rotation_states_updated_at
    BEFORE UPDATE ON public.session_rotation_states
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_rotation_states_updated_at();
