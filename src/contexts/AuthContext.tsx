'use client';

import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

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
    memberId: string | null;
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
   Supabase Client 싱글턴
   
   createBrowserClient는 내부적으로 싱글턴 패턴을 사용하므로
   매번 createClient()를 호출해도 같은 인스턴스가 반환됩니다.
   그러나 참조 편의를 위해 모듈 레벨 캐시를 유지합니다.
   ═══════════════════════════════════════════════════════════════ */
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient();
    }
    return _supabase;
}

/* ═══════════════════════════════════════════════════════════════
   유틸리티: Promise 타임아웃 래퍼
   
   Web Lock hang 문제로 Supabase Promise가 영원히 대기할 수 있으므로
   모든 Supabase 호출에 타임아웃을 적용합니다.
   ═══════════════════════════════════════════════════════════════ */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`[Auth] Timeout: ${label} (${ms}ms)`));
        }, ms);

        promise.then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); },
        );
    });
}

/* ═══════════════════════════════════════════════════════════════
   Profile 로드 유틸 — 순수 함수, 사이드이펙트 없음
   5초 타임아웃 적용
   ═══════════════════════════════════════════════════════════════ */
async function fetchProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
    try {
        const result: any = await withTimeout(
            (supabase as any)
                .from('profiles')
                .select('id, full_name, avatar_url, role, facility_id, approval_status')
                .eq('id', userId)
                .single(),
            5000,
            'fetchProfile'
        );
        const { data, error } = result;

        if (!error && data) {
            return data as Profile;
        }
        return null;
    } catch (err) {
        console.warn('[Auth] fetchProfile failed:', err);
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════
   MemberId 조회 유틸
   auth.users.id → members.id 변환
   members 테이블의 PK(id)는 auth user_id와 별도의 UUID이므로
   비즈니스 테이블(bookings, checkins 등) 조회 시에는 memberId를 사용해야 함
   ═══════════════════════════════════════════════════════════════ */
async function fetchMemberId(supabase: SupabaseClient, userId: string): Promise<string | null> {
    try {
        const result: any = await withTimeout(
            (supabase as any)
                .from('members')
                .select('id')
                .eq('user_id', userId)
                .single(),
            5000,
            'fetchMemberId'
        );
        const { data, error } = result;
        if (!error && data) {
            return data.id as string;
        }
        return null;
    } catch (err) {
        console.warn('[Auth] fetchMemberId failed:', err);
        return null;
    }
}

/* ═══════════════════════════════════════════════════════════════
   AuthProvider
   
   핵심 설계 원칙:
   1. onAuthStateChange 단일 소스 패턴
      - getSession()을 직접 호출하지 않음
      - INITIAL_SESSION 이벤트로 초기 세션을 받음
      - 이후 SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED 이벤트만 처리
   
   2. React useEffect 기반 초기화
      - StrictMode에서 마운트→언마운트→리마운트 시에도 안전
      - cleanup 함수에서 구독 해제
      
   3. 안전 장치 타임아웃
      - INITIAL_SESSION이 오지 않는 극단적인 경우를 위한 fallback
      - 4초 후 강제로 loading=false
   ═══════════════════════════════════════════════════════════════ */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [memberId, setMemberId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const mountedRef = useRef(true);
    const initializedRef = useRef(false);
    const profileRequestIdRef = useRef(0);

    // ─── 초기화: onAuthStateChange 구독 ───
    useEffect(() => {
        mountedRef.current = true;
        initializedRef.current = false;

        const supabase = getSupabase();

        // 안전 장치: 4초 후에도 초기화가 완료되지 않으면 강제로 loading=false
        const safetyTimer = setTimeout(() => {
            if (mountedRef.current && !initializedRef.current) {
                console.warn('[Auth] Safety timeout (4s). Forcing loading=false.');
                initializedRef.current = true;
                setLoading(false);
            }
        }, 4000);

        // onAuthStateChange는 구독 즉시 INITIAL_SESSION 이벤트를 발행합니다.
        // 이것이 초기 세션 상태를 받는 유일한 경로입니다.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (!mountedRef.current) return;

                // AbortError 등으로 인한 이벤트는 무시
                if (!event) return;

                console.debug(`[Auth] Event: ${event}`, newSession ? 'session exists' : 'no session');

                switch (event) {
                    case 'INITIAL_SESSION': {
                        // 첫 번째 이벤트: 현재 세션 상태를 알려줌
                        if (newSession?.user) {
                            setUser(newSession.user);
                            setSession(newSession);
                            // 프로필 + memberId 비동기 로드 (loading은 아직 유지)
                            const [p, mId] = await Promise.all([
                                fetchProfile(supabase, newSession.user.id),
                                fetchMemberId(supabase, newSession.user.id),
                            ]);
                            if (mountedRef.current) {
                                setProfile(p);
                                setMemberId(mId);
                            }
                        } else {
                            setUser(null);
                            setSession(null);
                            setProfile(null);
                            setMemberId(null);
                        }
                        if (mountedRef.current) {
                            initializedRef.current = true;
                            setLoading(false);
                        }
                        break;
                    }

                    case 'SIGNED_IN': {
                        if (newSession?.user) {
                            setUser(newSession.user);
                            setSession(newSession);
                            const [p, mId] = await Promise.all([
                                fetchProfile(supabase, newSession.user.id),
                                fetchMemberId(supabase, newSession.user.id),
                            ]);
                            if (mountedRef.current) {
                                setProfile(p);
                                setMemberId(mId);
                                if (!initializedRef.current) {
                                    initializedRef.current = true;
                                    setLoading(false);
                                }
                            }
                        }
                        break;
                    }

                    case 'SIGNED_OUT': {
                        setUser(null);
                        setSession(null);
                        setProfile(null);
                        setMemberId(null);
                        if (!initializedRef.current) {
                            initializedRef.current = true;
                            setLoading(false);
                        }
                        break;
                    }

                    case 'TOKEN_REFRESHED': {
                        // 토큰만 갱신 — 프로필 재로드 불필요
                        if (newSession?.user) {
                            setUser(newSession.user);
                            setSession(newSession);
                        }
                        break;
                    }

                    case 'USER_UPDATED': {
                        if (newSession?.user) {
                            setUser(newSession.user);
                            setSession(newSession);
                            // 유저 정보가 바뀌었으므로 프로필도 다시 로드
                            const p = await fetchProfile(supabase, newSession.user.id);
                            if (mountedRef.current) {
                                setProfile(p);
                            }
                        }
                        break;
                    }

                    default:
                        // PASSWORD_RECOVERY 등 다른 이벤트는 무시
                        break;
                }
            }
        );

        // Cleanup: StrictMode에서 첫 마운트의 구독을 해제
        return () => {
            mountedRef.current = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []); // 빈 의존성 — 최초 1회만 실행

    // ─── Profile 로드/갱신 함수들 ───
    const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
        const requestId = ++profileRequestIdRef.current;
        const supabase = getSupabase();
        const profileData = await fetchProfile(supabase, userId);

        // Stale request 방지
        if (requestId !== profileRequestIdRef.current) return profileData;
        if (profileData) setProfile(profileData);
        return profileData;
    }, []);

    const refreshProfile = useCallback(async () => {
        if (user?.id) await loadProfile(user.id);
    }, [user?.id, loadProfile]);

    // ─── Auth 액션 함수들 ───
    const signIn = useCallback(async (email: string, password: string) => {
        const supabase = getSupabase();
        try {
            // signInWithPassword에 타임아웃 적용
            // Web Lock 문제로 Promise가 hang될 수 있음 (HTTP 200을 받았지만 JS resolve 안됨)
            const { data, error } = await withTimeout(
                supabase.auth.signInWithPassword({ email, password }),
                8000,
                'signInWithPassword'
            );
            if (error) return { error };

            if (data.user) {
                const profileData = await fetchProfile(supabase, data.user.id);
                if (profileData) {
                    setProfile(profileData);
                    return {
                        error: null,
                        approvalStatus: profileData.approval_status,
                        role: profileData.role,
                    };
                }
            }
            return { error: null };
        } catch (err: any) {
            // AbortError 또는 Timeout → 세션이 실제로 생성되었는지 확인
            const isAbort = err instanceof DOMException && err.name === 'AbortError';
            const isTimeout = err?.message?.includes('[Auth] Timeout');

            if (isAbort || isTimeout) {
                console.warn(`[Auth] signIn ${isAbort ? 'AbortError' : 'Timeout'} — checking session recovery...`);

                // HTTP 요청은 성공했을 수 있으므로 세션을 직접 확인
                try {
                    // 약간의 딜레이 후 세션 확인 (서버 측 처리 완료 대기)
                    await new Promise(r => setTimeout(r, 500));
                    const { data: { session } } = await withTimeout(
                        supabase.auth.getSession(),
                        5000,
                        'getSession (recovery)'
                    );

                    if (session?.user) {
                        console.log('[Auth] Session recovery successful!');
                        setUser(session.user);
                        setSession(session);

                        const profileData = await fetchProfile(supabase, session.user.id);
                        if (profileData) {
                            setProfile(profileData);
                            return {
                                error: null,
                                approvalStatus: profileData.approval_status,
                                role: profileData.role,
                            };
                        }
                        return { error: null };
                    }
                } catch (recoveryErr) {
                    console.warn('[Auth] Session recovery also failed:', recoveryErr);
                }

                return { error: { message: '인증 처리 중 문제가 발생했습니다. 다시 시도해주세요.' } };
            }

            return { error: err };
        }
    }, []);

    const signInWithOAuth = useCallback(async (provider: 'kakao' | 'google' | 'github') => {
        const supabase = getSupabase();
        const redirectTo = `${window.location.origin}/auth/callback`;

        // 모바일 감지: 화면 너비 768px 이하 또는 터치 디바이스
        const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;

        if (isMobile) {
            // ─── 모바일: 리다이렉트 방식 ───
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: { redirectTo },
                });
                return { error };
            } catch (err) {
                return { error: err };
            }
        }

        // ─── 데스크탑: 팝업 방식 ───
        try {
            // skipBrowserRedirect로 URL만 받기
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });

            if (error || !data?.url) {
                return { error: error || { message: 'OAuth URL을 가져올 수 없습니다.' } };
            }

            // 팝업 창 열기 (중앙 정렬)
            const width = 500;
            const height = 700;
            const left = window.screenX + (window.innerWidth - width) / 2;
            const top = window.screenY + (window.innerHeight - height) / 2;

            const popup = window.open(
                data.url,
                `${provider}_login`,
                `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
            );

            if (!popup) {
                // 팝업이 차단된 경우 → 리다이렉트 방식으로 폴백
                console.warn('[Auth] Popup blocked, falling back to redirect');
                const { error: fbError } = await supabase.auth.signInWithOAuth({
                    provider,
                    options: { redirectTo },
                });
                return { error: fbError };
            }

            // 팝업 닫힘 감지 + onAuthStateChange가 세션을 처리
            // 팝업이 callback 페이지에 도달하면 세션이 설정되고,
            // onAuthStateChange가 SIGNED_IN 이벤트를 발행합니다.
            return new Promise<{ error: any }>((resolve) => {
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        // 팝업이 닫히면 약간의 딜레이 후 세션 확인
                        setTimeout(async () => {
                            try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (session) {
                                    // 세션이 있으면 성공 — onAuthStateChange가 이미 처리했을 수 있음
                                    resolve({ error: null });
                                } else {
                                    // 사용자가 팝업을 직접 닫은 경우
                                    resolve({ error: { message: '로그인이 취소되었습니다.' } });
                                }
                            } catch {
                                resolve({ error: { message: '세션 확인 중 오류가 발생했습니다.' } });
                            }
                        }, 500);
                    }
                }, 500);

                // 안전 장치: 2분 후 타임아웃
                setTimeout(() => {
                    clearInterval(checkClosed);
                    if (!popup.closed) popup.close();
                    resolve({ error: { message: 'OAuth 인증이 시간 초과되었습니다.' } });
                }, 120000);
            });
        } catch (err) {
            return { error: err };
        }
    }, []);

    const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
        const supabase = getSupabase();
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: metadata },
            });
            return { error };
        } catch (err) {
            return { error: err };
        }
    }, []);

    const signOut = useCallback(async () => {
        const supabase = getSupabase();
        // 즉시 UI 상태 초기화 (빠른 피드백)
        setProfile(null);
        setUser(null);
        setSession(null);
        setMemberId(null);
        try {
            await supabase.auth.signOut();
        } catch (err) {
            // signOut 실패해도 상태는 이미 초기화됨
            console.error('[Auth] Sign out error:', err);
        }
    }, []);

    const resetPassword = useCallback(async (email: string) => {
        const supabase = getSupabase();
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/update-password`,
            });
            return { error };
        } catch (err) {
            return { error: err };
        }
    }, []);

    // ─── 파생 상태 ───
    const isApproved = profile?.approval_status === 'approved';
    const isPending = profile?.approval_status === 'pending';
    const isRejected = profile?.approval_status === 'rejected';

    const value: AuthContextType = {
        user,
        session,
        profile,
        memberId,
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
