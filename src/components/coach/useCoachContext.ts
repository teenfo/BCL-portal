'use client';

import { useEffect, useState, useCallback } from 'react';

import { rpc } from '@/lib/supabase/query';
import { useAuth } from '@/contexts/AuthContext';
import type { CoachContext, CoachContextStatus } from './types';

const EMPTY_CONTEXT: CoachContext = {
    status: 'unauthenticated',
    linked: false,
    has_assignments: false,
};

interface UseCoachContextResult {
    context: CoachContext | null;
    loading: boolean;
    refresh: () => Promise<void>;
}

export function useCoachContext(): UseCoachContextResult {
    const { user } = useAuth();
    const [context, setContext] = useState<CoachContext | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!user) {
            setContext(EMPTY_CONTEXT);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await rpc('fn_get_my_coach_context');
            if (error || !data) {
                setContext(EMPTY_CONTEXT);
            } else {
                const status = (data.status ?? 'unlinked') as CoachContextStatus;
                const payload = data.data ?? {};
                setContext({
                    status,
                    linked: !!payload.linked,
                    coach_id: payload.coach_id ?? null,
                    coach_name: payload.coach_name ?? null,
                    has_assignments: !!payload.has_assignments,
                    assignment_count: typeof payload.assignment_count === 'number' ? payload.assignment_count : undefined,
                });
            }
        } catch (e) {
            if (process.env.NODE_ENV === 'development') console.error('useCoachContext error', e);
            setContext(EMPTY_CONTEXT);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { context, loading, refresh };
}
