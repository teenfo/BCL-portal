'use client';

import { ReactNode, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

import CoachStateScreen from './CoachStateScreen';
import { useCoachContext } from './useCoachContext';
import type { CoachContext } from './types';

interface CoachContextValue {
    context: CoachContext | null;
    loading: boolean;
    refresh: () => Promise<void>;
}

const CoachContextRuntime = createContext<CoachContextValue>({
    context: null,
    loading: true,
    refresh: async () => {},
});

export function useCoachRuntimeContext(): CoachContextValue {
    return useContext(CoachContextRuntime);
}

const ALWAYS_ALLOWED_PATHS = ['/coach/profile'];

interface CoachStateGateProps {
    children: ReactNode;
}

export default function CoachStateGate({ children }: CoachStateGateProps) {
    const { context, loading, refresh } = useCoachContext();
    const pathname = usePathname();

    if (loading || !context) {
        return (
            <div className="app-page">
                <div className="app-skeleton" style={{ height: 24, width: '40%', marginBottom: 16 }} />
                <div className="app-skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 12 }} />
                <div className="app-skeleton" style={{ height: 120, borderRadius: 16 }} />
            </div>
        );
    }

    const allowProfileBypass =
        context.linked && pathname && ALWAYS_ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));

    if (context.status === 'linked_active' || allowProfileBypass) {
        return (
            <CoachContextRuntime.Provider value={{ context, loading, refresh }}>
                {children}
            </CoachContextRuntime.Provider>
        );
    }

    if (context.status === 'unauthenticated') {
        return <CoachStateScreen status="unauthenticated" />;
    }

    return (
        <CoachContextRuntime.Provider value={{ context, loading, refresh }}>
            <CoachStateScreen status={context.status} coachName={context.coach_name} />
        </CoachContextRuntime.Provider>
    );
}
