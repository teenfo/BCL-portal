'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser as User, AuthSession as Session } from '@supabase/supabase-js';

interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    facility_id: string | null;
    approval_status: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    isApproved: boolean;
    isPending: boolean;
    isRejected: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any; approvalStatus?: string }>;
    signInWithOAuth: (provider: 'kakao' | 'google' | 'github') => Promise<{ error: any }>;
    signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    refreshProfile: () => Promise<void>;
    loadProfile: (userId: string) => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    // Race condition 방지를 위한 ref
    const initializedRef = useRef(false);
    const profileLoadingRef = useRef(false);
    const supabaseRef = useRef(createClient());

    const supabase = supabaseRef.current;
    // Note: @supabase/auth-js 패키지의 type declarations가 불완전할 수 있어 any로 캐스팅
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = supabase.auth as any;

    // Profile 로드 함수 - 중복 호출 방지
    const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        if (profileLoadingRef.current) return profile;
        profileLoadingRef.current = true;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (!error && data) {
                const profileData = data as unknown as Profile;
                setProfile(profileData);
                profileLoadingRef.current = false;
                return profileData;
            }
            profileLoadingRef.current = false;
            return null;
        } catch {
            profileLoadingRef.current = false;
            return null;
        }
    }, [supabase, profile]);

    // Profile 새로고침
    const refreshProfile = useCallback(async () => {
        if (user?.id) {
            profileLoadingRef.current = false; // 강제 재로드 허용
            await loadProfile(user.id);
        }
    }, [user?.id, loadProfile]);

    useEffect(() => {
        // 이미 초기화된 경우 중복 실행 방지 (React StrictMode / double mount)
        if (initializedRef.current) return;
        initializedRef.current = true;

        let mounted = true;

        // 안전 장치: 8초 후에는 강제로 loading 종료 (네트워크 오류 등 대비)
        const timeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn('[AuthContext] Loading timeout reached, forcing loading=false');
                setLoading(false);
            }
        }, 8000);

        // 1단계: 초기 세션 확인 (getUser 사용 — 서버와 동기화)
        const initAuth = async () => {
            try {
                // getSession()보다 getUser()가 서버 토큰 검증에 더 안정적
                const { data: { user: currentUser } } = await auth.getUser();

                if (!mounted) return;

                if (currentUser) {
                    setUser(currentUser);
                    // 세션도 동시에 가져오기
                    const { data: { session: currentSession } } = await auth.getSession();
                    if (mounted && currentSession) {
                        setSession(currentSession);
                    }
                    await loadProfile(currentUser.id);
                }
            } catch (err) {
                console.error('[AuthContext] Init auth error:', err);
            } finally {
                if (mounted) {
                    setLoading(false);
                    clearTimeout(timeout);
                }
            }
        };

        initAuth();

        // 2단계: Auth 상태 변경 리스너 (토큰 갱신, 로그아웃 등)
        const {
            data: { subscription },
        } = auth.onAuthStateChange(async (event: string, newSession: any) => {
            if (!mounted) return;

            // INITIAL_SESSION 이벤트는 초기화에서 이미 처리했으므로 무시
            if (event === 'INITIAL_SESSION') return;

            setSession(newSession);
            setUser(newSession?.user ?? null);

            if (newSession?.user) {
                profileLoadingRef.current = false; // 상태 변경 시 프로필 재로드 허용
                await loadProfile(newSession.user.id);
            } else {
                setProfile(null);
            }

            // TOKEN_REFRESHED 이벤트는 loading 상태를 변경하지 않음
            if (event !== 'TOKEN_REFRESHED') {
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const signIn = useCallback(async (email: string, password: string) => {
        const { data, error } = await auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { error };
        }

        // 로그인 성공 시 프로필에서 승인 상태 확인
        if (data.user) {
            profileLoadingRef.current = false; // 프로필 로드 허용
            const profileData = await loadProfile(data.user.id);
            if (profileData) {
                return { error: null, approvalStatus: profileData.approval_status };
            }
        }

        return { error: null };
    }, [auth, loadProfile]);

    const signInWithOAuth = useCallback(async (provider: 'kakao' | 'google' | 'github') => {
        const { error } = await auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    }, [auth]);

    const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
        const { data, error } = await auth.signUp({
            email,
            password,
            options: {
                data: metadata,
            },
        });
        return { error };
    }, [supabase]);

    const signOut = useCallback(async () => {
        setProfile(null);
        setUser(null);
        setSession(null);
        await auth.signOut();
    }, [auth]);

    const resetPassword = useCallback(async (email: string) => {
        const { data, error } = await auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/update-password`,
        });
        return { error };
    }, [supabase]);

    const isApproved = profile?.approval_status === 'approved';
    const isPending = profile?.approval_status === 'pending';
    const isRejected = profile?.approval_status === 'rejected';

    const value: AuthContextType = {
        user,
        session,
        profile,
        loading,
        isApproved,
        isPending,
        isRejected,
        signIn,
        signInWithOAuth,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
        loadProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
