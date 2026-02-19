'use client';

import { createContext, useContext, useRef, useCallback, useSyncExternalStore, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser as User, AuthSession as Session } from '@supabase/supabase-js';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

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
    signIn: (email: string, password: string) => Promise<{ error: any; approvalStatus?: string; role?: string }>;
    signInWithOAuth: (provider: 'kakao' | 'google' | 'github') => Promise<{ error: any }>;
    signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: any }>;
    refreshProfile: () => Promise<void>;
    loadProfile: (userId: string) => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ═══════════════════════════════════════════════════════════════
   Supabase 클라이언트 싱글턴 (모듈 레벨)
   ═══════════════════════════════════════════════════════════════ */
let _supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
    if (!_supabaseClient) {
        _supabaseClient = createClient();
    }
    return _supabaseClient;
}

/* ═══════════════════════════════════════════════════════════════
   Profile 로드 유틸 (모듈 레벨)
   ═══════════════════════════════════════════════════════════════ */
async function fetchProfile(userId: string): Promise<Profile | null> {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!error && data) {
            return data as unknown as Profile;
        }
        return null;
    } catch {
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════
   모듈 레벨 인증 상태 관리 (External Store 패턴)

   핵심 해결:
   @supabase/ssr의 createBrowserClient는 INITIAL_SESSION 이벤트를
   발생시키지 않을 수 있다.
   
   따라서:
   1. getSession()을 즉시 호출하여 초기 세션 확인 (≈ 0 ~ 200ms)
   2. onAuthStateChange로 이후 변경 사항만 구독 
   3. AbortError는 gracefully 무시
   4. 모든 것이 React lifecycle 밖 모듈 레벨에서 실행
   ═══════════════════════════════════════════════════════════════ */

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
}

let _authState: AuthState = {
    user: null,
    session: null,
    profile: null,
    loading: true,
};

const _listeners = new Set<() => void>();

function notifyListeners() {
    _authState = { ..._authState };
    _listeners.forEach((l) => l());
}

function updateAuthState(partial: Partial<AuthState>) {
    Object.assign(_authState, partial);
    notifyListeners();
}

function getAuthSnapshot(): AuthState {
    return _authState;
}

function subscribeToAuth(callback: () => void): () => void {
    _listeners.add(callback);
    return () => _listeners.delete(callback);
}

// 모듈 초기화 — 한 번만 실행
let _moduleInitialized = false;

function initializeAuthModule() {
    if (_moduleInitialized) return;
    _moduleInitialized = true;

    if (typeof window === 'undefined') return;

    const supabase = getSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = supabase.auth as any;

    /* ─── 1단계: getSession() 즉시 호출 (핵심) ─── 
       @supabase/ssr의 createBrowserClient에서는 
       INITIAL_SESSION 이벤트가 발생하지 않을 수 있음.
       getSession()은 쿠키에서 세션을 읽고 필요시 refresh.
       AbortError가 발생하면 세션 없음으로 처리. */
    auth.getSession()
        .then(async ({ data: { session: currentSession } }: any) => {
            if (currentSession?.user) {
                console.debug('[AuthModule] getSession: has session');
                updateAuthState({
                    session: currentSession,
                    user: currentSession.user,
                    loading: false,
                });
                // 프로필 비동기 로드 (loading은 이미 false)
                const p = await fetchProfile(currentSession.user.id);
                if (p) {
                    updateAuthState({ profile: p });
                }
            } else {
                console.debug('[AuthModule] getSession: no session');
                updateAuthState({
                    user: null,
                    session: null,
                    profile: null,
                    loading: false,
                });
            }
        })
        .catch((err: any) => {
            // AbortError 또는 네트워크 에러 — 세션 없음으로 처리
            if (err instanceof DOMException && err.name === 'AbortError') {
                console.debug('[AuthModule] getSession aborted (expected in StrictMode). Retrying...');
                // StrictMode에서 AbortError가 발생하면
                // 두 번째 mount에서 initializeAuthModule()이 다시 호출되지 않으므로
                // 직접 재시도
                setTimeout(() => {
                    auth.getSession()
                        .then(async ({ data: { session: retrySession } }: any) => {
                            if (retrySession?.user) {
                                console.debug('[AuthModule] Retry getSession: has session');
                                updateAuthState({
                                    session: retrySession,
                                    user: retrySession.user,
                                    loading: false,
                                });
                                const p = await fetchProfile(retrySession.user.id);
                                if (p) updateAuthState({ profile: p });
                            } else {
                                console.debug('[AuthModule] Retry getSession: no session');
                                updateAuthState({ loading: false });
                            }
                        })
                        .catch(() => {
                            console.warn('[AuthModule] Retry getSession also failed. Forcing loading=false.');
                            updateAuthState({ loading: false });
                        });
                }, 100);
            } else {
                console.warn('[AuthModule] getSession error:', err);
                updateAuthState({ loading: false });
            }
        });

    /* ─── 2단계: onAuthStateChange로 후속 이벤트 구독 ─── 
       SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED 등 처리 */
    auth.onAuthStateChange(async (event: string, newSession: any) => {
        console.debug(`[AuthModule] Event: ${event}`, newSession ? 'has session' : 'no session');

        // INITIAL_SESSION은 올 수도 있고 안 올 수도 있음
        // 이미 getSession()으로 처리했으므로, loading이 이미 false면 무시
        if (event === 'INITIAL_SESSION') {
            if (_authState.loading) {
                // 아직 getSession()이 완료되지 않았다면 여기서 처리
                if (newSession?.user) {
                    updateAuthState({
                        session: newSession,
                        user: newSession.user,
                        loading: false,
                    });
                    const p = await fetchProfile(newSession.user.id);
                    if (p) updateAuthState({ profile: p });
                } else {
                    updateAuthState({ loading: false });
                }
            }
            return;
        }

        if (event === 'SIGNED_OUT') {
            updateAuthState({
                session: null,
                user: null,
                profile: null,
            });
            return;
        }

        // SIGNED_IN or TOKEN_REFRESHED
        if (newSession?.user) {
            updateAuthState({
                session: newSession,
                user: newSession.user,
            });

            if (event !== 'TOKEN_REFRESHED') {
                const p = await fetchProfile(newSession.user.id);
                if (p) updateAuthState({ profile: p });
            }
        } else {
            updateAuthState({
                session: null,
                user: null,
                profile: null,
            });
        }
    });

    /* ─── 3단계: 안전 장치 (비상용, 3초) ─── */
    setTimeout(() => {
        if (_authState.loading) {
            console.warn('[AuthModule] Safety timeout (3s). Forcing loading=false.');
            updateAuthState({ loading: false });
        }
    }, 3000);
}

/* ═══════════════════════════════════════════════════════════════
   AuthProvider
   ═══════════════════════════════════════════════════════════════ */
export function AuthProvider({ children }: { children: ReactNode }) {
    if (typeof window !== 'undefined') {
        initializeAuthModule();
    }

    const authState = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => _authState);
    const { user, session, profile, loading } = authState;

    const profileRequestIdRef = useRef(0);

    const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        const requestId = ++profileRequestIdRef.current;
        const profileData = await fetchProfile(userId);
        if (requestId !== profileRequestIdRef.current) return profileData;
        if (profileData) updateAuthState({ profile: profileData });
        return profileData;
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user?.id) await loadProfile(user.id);
    }, [user?.id, loadProfile]);

    const signIn = useCallback(async (email: string, password: string) => {
        const supabase = getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const auth = supabase.auth as any;
        try {
            const { data, error } = await auth.signInWithPassword({ email, password });
            if (error) return { error };
            if (data.user) {
                const profileData = await fetchProfile(data.user.id);
                if (profileData) {
                    updateAuthState({ profile: profileData });
                    return { error: null, approvalStatus: profileData.approval_status, role: profileData.role };
                }
            }
            return { error: null };
        } catch (err) {
            return { error: err };
        }
    }, []);

    const signInWithOAuth = useCallback(async (provider: 'kakao' | 'google' | 'github') => {
        const supabase = getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const auth = supabase.auth as any;
        try {
            const { error } = await auth.signInWithOAuth({
                provider,
                options: { redirectTo: `${window.location.origin}/auth/callback` },
            });
            return { error };
        } catch (err) {
            return { error: err };
        }
    }, []);

    const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
        const supabase = getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const auth = supabase.auth as any;
        try {
            const { error } = await auth.signUp({ email, password, options: { data: metadata } });
            return { error };
        } catch (err) {
            return { error: err };
        }
    }, []);

    const signOut = useCallback(async () => {
        const supabase = getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const auth = supabase.auth as any;
        updateAuthState({ profile: null, user: null, session: null });
        try {
            await auth.signOut();
        } catch (err) {
            console.error('[AuthContext] Sign out error:', err);
        }
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const supabase = getSupabaseClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const auth = supabase.auth as any;
        try {
            const { error } = await auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });
            return { error };
        } catch (err) {
            return { error: err };
        }
    }, []);

    const isApproved = profile?.approval_status === 'approved';
    const isPending = profile?.approval_status === 'pending';
    const isRejected = profile?.approval_status === 'rejected';

    const value: AuthContextType = {
        user, session, profile, loading,
        isApproved, isPending, isRejected,
        signIn, signInWithOAuth, signUp, signOut,
        resetPassword, refreshProfile, loadProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ═══════════════════════════════════════════════════════════════
   useAuth Hook
   ═══════════════════════════════════════════════════════════════ */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
