'use client';

// AuthProvider — 인증 상태의 단일 소스 (docs/01-auth §5.4 골격 그대로 승계)
// F-1: onAuthStateChange 콜백은 100% 동기 — await 절대 금지 (auth lock 교착 → 로그인 5~10s hang, 장애 #1)
// F-4: 초기 세션은 INITIAL_SESSION 이벤트 단일 소스 — 초기화 경로에서 getSession() 직접 호출 금지
// F-9: onAuthStateChange 구독은 이 Provider 1곳뿐 — 나머지는 useAuth()로 소비

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { query } from '@/lib/supabase/query';
import type { RouteProfile } from '@/lib/auth/resolve-route';

/** profiles 조회 결과 — RouteProfile(resolve-route) 확장 */
export interface AuthProfile extends RouteProfile {
  email: string | null;
}

export type AuthErrorCode = 'PROFILE_LOAD_FAILED' | 'INIT_TIMEOUT' | 'SESSION_EXPIRED';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/** signIn 결과 — 리다이렉트 분기는 호출측이 resolvePostLoginRoute로 수행 (F-6) */
export type SignInResult =
  | {
      success: true;
      approvalStatus: RouteProfile['approval_status'];
      role: RouteProfile['role'];
      profile: AuthProfile;
    }
  | { success: false; error: string };

export interface ActionResult {
  success: boolean;
  error: string | null;
}

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  /** 비즈니스 테이블 참조용 — auth uid를 비즈니스 FK로 쓰지 않는다 (F-8) */
  memberId: string | null;
  loading: boolean;
  authError: AuthError | null;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<ActionResult>;
  refreshProfile: () => Promise<AuthProfile | null>;
}

const INIT_TIMEOUT_MS = 4_000; // safety timeout (F-5: 무한 스피너 금지)
const SIGN_OUT_TIMEOUT_MS = 5_000; // signOut best-effort 상한 (F-10)

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loading, setLoadingState] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const mountedRef = useRef(true); // StrictMode 안전 가드
  const requestIdRef = useRef(0); // 마지막 요청만 반영 — stale response 차단
  const loadingRef = useRef(true); // safety timeout 판정용 (state 스냅샷 아닌 실시간 값)
  const userRef = useRef<User | null>(null);

  const setLoading = useCallback((next: boolean) => {
    loadingRef.current = next;
    setLoadingState(next);
  }, []);

  const setUser = useCallback((next: User | null) => {
    userRef.current = next;
    setUserState(next);
  }, []);

  const clearUserData = useCallback(() => {
    setProfile(null);
    setMemberId(null);
  }, []);

  // auth lock 해제 후 실행되는 실제 조회 — profiles + members 병렬 (query 헬퍼 경유만)
  // 반환값: 반영된 프로필(성공) / null(실패·가드 탈락) — refreshProfile 호출자가 최신값 판정에 사용
  const fetchUserData = useCallback(
    async (uid: string, requestId: number): Promise<AuthProfile | null> => {
      const supabase = getSupabaseBrowserClient();
      const [profileRes, memberRes] = await Promise.all([
        query<AuthProfile>(supabase, 'profiles', (q) =>
          q.select('role, approval_status, email').eq('id', uid).single(),
        ),
        query<{ id: string }>(supabase, 'members', (q) =>
          q.select('id').eq('user_id', uid).maybeSingle(),
        ),
      ]);
      // requestId 가드(마지막 요청만 반영) + mountedRef 가드(StrictMode 안전)
      if (!mountedRef.current || requestId !== requestIdRef.current) return null;

      if (!profileRes.success || !profileRes.data) {
        // §5.6: 실패를 삼키지 않는다 — authError로 표면화 (무통보 null 금지)
        setProfile(null);
        setMemberId(null);
        setAuthError({
          code: 'PROFILE_LOAD_FAILED',
          message: '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
        });
        setLoading(false);
        return null;
      }
      setProfile(profileRes.data);
      // F-8: members.user_id nullable — 계정 미연결(coach/admin 등)이면 memberId=null
      setMemberId(memberRes.success ? (memberRes.data?.id ?? null) : null);
      setAuthError(null);
      setLoading(false);
      return profileRes.data;
    },
    [setLoading],
  );

  // F-1 대체 패턴: 콜백에서는 예약만 — setTimeout(0)으로 auth lock 해제 후 조회 실행
  const loadUserData = useCallback(
    (uid: string) => {
      const requestId = ++requestIdRef.current;
      setTimeout(() => {
        void fetchUserData(uid, requestId);
      }, 0);
    },
    [fetchUserData],
  );

  useEffect(() => {
    mountedRef.current = true;
    const supabase = getSupabaseBrowserClient();

    // onAuthStateChange 단일 구독 — 콜백은 100% 동기 (setUser/setSession만, F-1: await 금지)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mountedRef.current) return;
      switch (event) {
        case 'INITIAL_SESSION':
        case 'SIGNED_IN':
          setUser(nextSession?.user ?? null);
          setSession(nextSession);
          if (nextSession?.user) {
            loadUserData(nextSession.user.id);
          } else {
            // 비로그인 초기 상태 — 즉시 로딩 종료
            requestIdRef.current += 1;
            clearUserData();
            setAuthError(null);
            setLoading(false);
          }
          break;
        case 'SIGNED_OUT':
          requestIdRef.current += 1; // 진행 중 조회 무효화
          setUser(null);
          setSession(null);
          clearUserData();
          setAuthError(null);
          setLoading(false);
          break;
        case 'TOKEN_REFRESHED':
          // 세션만 교체 — 프로필 재로드 안 함
          setSession(nextSession);
          if (nextSession?.user) setUser(nextSession.user);
          break;
        case 'USER_UPDATED':
          setUser(nextSession?.user ?? null);
          setSession(nextSession);
          if (nextSession?.user) loadUserData(nextSession.user.id); // 프로필 재로드
          break;
        default:
          break;
      }
    });

    // safety timeout 4s: INITIAL_SESSION 미도착/조회 지연 시 loading 강제 해제 + 에러 표면화 (F-5)
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current && loadingRef.current) {
        setLoading(false);
        setAuthError({
          code: 'INIT_TIMEOUT',
          message: '인증 초기화가 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.',
        });
      }
    }, INIT_TIMEOUT_MS);

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [clearUserData, loadUserData, setLoading, setUser]);

  // ---- 액션 ---------------------------------------------------------------

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      // 실패는 호출측 폼 상단에 표면화 — 무한 스피너 금지 (§5.6)
      return { success: false, error: error?.message ?? '로그인에 실패했습니다.' };
    }
    const uid = data.user.id;
    // 여기는 auth 콜백 밖이므로 await 가능 — SIGNED_IN 콜백은 별도로 loadUserData를 예약한다
    const profileRes = await query<AuthProfile>(supabase, 'profiles', (q) =>
      q.select('role, approval_status, email').eq('id', uid).single(),
    );
    if (!profileRes.success || !profileRes.data) {
      return { success: false, error: profileRes.error ?? '프로필을 불러오지 못했습니다.' };
    }
    // 리다이렉트는 호출측이 resolvePostLoginRoute(profile, redirectParam)로 결정 (F-6)
    return {
      success: true,
      approvalStatus: profileRes.data.approval_status,
      role: profileRes.data.role,
      profile: profileRes.data,
    };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: Record<string, unknown>,
    ): Promise<ActionResult> => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error) return { success: false, error: error.message };
      // Confirm email OFF 전제(§2.2) — 세션 미발급은 설정 오적용: 무한 대기 대신 에러 표면화
      if (!data.session) {
        return {
          success: false,
          error: '가입 직후 세션이 발급되지 않았습니다. 관리자에게 문의해주세요.',
        };
      }
      return { success: true, error: null };
    },
    [],
  );

  const signOut = useCallback(async () => {
    // F-10: 로컬 상태 선(先)초기화 — 서버 signOut 실패에도 UI는 즉시 로그아웃
    requestIdRef.current += 1;
    setUser(null);
    setSession(null);
    clearUserData();
    setAuthError(null);
    setLoading(false);
    const supabase = getSupabaseBrowserClient();
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>((resolve) => {
          setTimeout(resolve, SIGN_OUT_TIMEOUT_MS);
        }),
      ]);
    } catch {
      // best-effort — 로컬 세션은 이미 정리됨
    }
  }, [clearUserData, setLoading, setUser]);

  const resetPassword = useCallback(async (email: string): Promise<ActionResult> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // §2.6: reset-password 단일 라우트의 step 파라미터로 통일 (/auth/update-password 금지)
      redirectTo: `${window.location.origin}/auth/reset-password?step=3`,
    });
    return { success: !error, error: error?.message ?? null };
  }, []);

  const refreshProfile = useCallback(async (): Promise<AuthProfile | null> => {
    const uid = userRef.current?.id;
    if (!uid) return null;
    setAuthError(null);
    setLoading(true);
    const requestId = ++requestIdRef.current;
    // F-5: 액션 경로도 유한해야 한다 — 마운트 safety timeout(4s)은 초기화 1회뿐이므로
    // 재시도 경로가 hang이면 해제 경로 없는 스켈레톤이 된다. 5s 레이스로 차단.
    const result = await Promise.race([
      fetchUserData(uid, requestId), // 액션 컨텍스트 — auth 콜백 밖이므로 직접 await 가능
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 5_000)),
    ]);
    if (result === 'timeout') {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setAuthError({
          code: 'PROFILE_LOAD_FAILED',
          message: '응답이 지연되고 있습니다. 네트워크 상태를 확인하고 다시 시도해주세요.',
        });
        setLoading(false);
      }
      return null;
    }
    return result;
  }, [fetchUserData, setLoading]);

  // ---- 파생 상태 + 컨텍스트 값 --------------------------------------------

  const isApproved = profile?.approval_status === 'approved';
  const isPending = profile?.approval_status === 'pending';
  const isRejected = profile?.approval_status === 'rejected';

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      memberId,
      loading,
      authError,
      isApproved,
      isPending,
      isRejected,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      memberId,
      loading,
      authError,
      isApproved,
      isPending,
      isRejected,
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
