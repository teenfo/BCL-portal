# 01. 인증 · 가입 승인 워크플로우 (to-be)

> 근거: `_source/contract.md` §5(Auth 메뉴)·§7(인증 안정성 계약), `_source/screens-inventory.md` §0,
> `_source/nonfunctional-history.md`(인증 장애 이력 3건), 현행 코드
> `src/contexts/AuthContext.tsx`, `src/lib/supabase/{client,middleware,server}.ts` 정독 (2026-07-07).
>
> **이 문서는 재구축 최우선 요구인 「인증 안정성」의 단일 명세다.**
> 인증 회귀는 전 앱(Admin/User/Coach/Class/Kiosk)을 동시에 무력화하므로,
> §5의 안정성 설계와 §7의 E2E 게이트는 협상 불가(non-negotiable) 항목이다.

상태 표기: ✅ 운영 · 🟡 코드완료(검증 대기) · 🧪 mock · ⏳ 미구현 · 🔄 to-be 변경

---

## 1. 전체 플로우 개요

```mermaid
flowchart TD
    A[방문] --> B{/auth/login}
    B -->|가입| C[/auth/signup 3-Step/]
    C -->|이메일 검증 없음 · 즉시 세션 발급| F{profiles.approval_status}
    B -->|로그인 성공| F
    OA[/auth/callback ⏳ 소셜 Phase2/] --> F
    F -->|pending| G[/auth/pending-approval/]
    F -->|rejected| H[/auth/rejected/]
    F -->|approved| I{resolvePostLoginRoute}
    G -->|관리자 승인| I
    G -->|관리자 거부| H
    I -->|admin| J[/admin/dashboard]
    I -->|coach| K[/coach/dashboard]
    I -->|member| L[/apps/dashboard]
    B -->|비밀번호 분실| M[/auth/reset-password 3-Step/]
    J & K & L -->|로그아웃| N[/auth/logout/] --> B
```

- 인증 기반: Supabase Auth(JWT). 세션 7일(Remember Me 30일), 비밀번호 8자·3종 조합,
  로그인 실패 5회 → 10분 Rate Limit.
- **이메일 검증 제외(확정 결정)** 🔄: Supabase Auth `Confirm email` **OFF** — 가입 완료 즉시 세션 발급,
  검증 메일을 보내지 않으며 `/auth/email-verify` 라우트는 만들지 않는다.
  스팸 가입 방어는 이메일 검증 대신 **관리자 승인 게이트**(아래)가 전담한다.
  단, 비밀번호 재설정 메일(`resetPasswordForEmail`)은 이 설정과 무관하게 정상 동작 — 유지.
- **가입 ≠ 이용 가능**: 가입 직후 `profiles.approval_status='pending'`이면
  모든 보호 경로 접근 불가. 관리자 승인(`approved`)이 인증 게이트의 유일한 관문이다(계약 §3).
- 역할 판정 소스는 `profiles.role`(admin/coach/member) + `profiles.approval_status` 2필드뿐이다.
  세부 권한(admin_user_roles)은 인증 게이트와 무관 — 라우팅에 사용 금지.

---

## 2. 라우트 명세 (7종 — 계약 §5 확정 목록, email-verify 폐지)

### 2.1 `/auth/login` ✅
| 항목 | 내용 |
|---|---|
| 목적 | 이메일/비밀번호 로그인, 전 앱의 단일 진입점 |
| 기능 | 이메일+비밀번호 폼, Remember Me(세션 7→30일), 비밀번호 표시 토글, `?redirect=` 파라미터 복귀, `?error=` 코드별 배너(콜백 실패 등), 실패 5회 Rate Limit 안내, 소셜 로그인 버튼(Google/Kakao ⏳ Phase2 — 버튼 자리만 예약) |
| 데이터 | `supabase.auth.signInWithPassword` → `profiles(role, approval_status)` 1회 조회 |
| 상태·규칙 | 성공 시 분기 순서 고정: ① `approval_status` 확인(pending→`/auth/pending-approval`, rejected→`/auth/rejected`) → ② `resolvePostLoginRoute(profile, redirectParam)` 호출(§4). 실패 시 에러 메시지 폼 상단 표면화 — **무한 스피너 금지**(§5.6). 이미 로그인 상태로 진입 시 즉시 resolvePostLoginRoute로 이탈 |

### 2.2 `/auth/signup` ✅
| 항목 | 내용 |
|---|---|
| 목적 | 3-Step 회원가입 |
| 기능 | Step1 계정(이메일/비밀번호/확인 — 중복·강도 실시간 검증) → Step2 기본정보(이름/연락처/생년월일/성별, 지점 선택) → Step3 약관(필수: 이용약관·개인정보 / 선택: 마케팅). 완료 시 **즉시 세션 발급 → `/auth/pending-approval` 이동**(이메일 검증 단계 없음 🔄) |
| 데이터 | `supabase.auth.signUp({ email, password, options.data: metadata })` → DB 트리거가 `profiles`(role='member', approval_status='pending') + `members` 행 생성(07-data-model `01_core.sql` auth 연동 트리거) |
| 상태·규칙 | 가입 직후 role은 항상 `member`(coach/admin 승격은 Admin에서만: `promote_to_coach`). Step 이탈 시 입력값 세션 보존. Supabase `Confirm email` OFF 전제 — `signUp` 응답에 세션이 즉시 포함되며, 미포함(설정 오적용) 시 에러 표면화(무한 대기 금지) |

### 2.3 ~~`/auth/email-verify`~~ 🔄 **폐지** (이메일 검증 제외 결정)
- as-is에는 존재하나 to-be에서 **라우트 자체를 만들지 않는다**. Supabase Auth `Confirm email` OFF(§1)로 검증 메일이 발송되지 않으므로 랜딩이 불필요.
- 구버전 인증 메일 링크로 유입될 경우: 미들웨어가 `/auth/login?error=verify_deprecated`로 리다이렉트(안내 배너).
- 가입 스팸·오타 이메일 리스크는 관리자 승인 게이트에서 흡수 — Admin 회원 승인 화면(02)에서 이메일 확인 후 승인/거부.

### 2.4 `/auth/pending-approval` ✅ (구 문서 누락분 — 정식 편입)
| 항목 | 내용 |
|---|---|
| 목적 | 관리자 승인 대기 상태 전용 랜딩. 승인 워크플로우의 사용자 측 대기실 |
| 기능 | 승인 대기 안내(가입 지점/신청 일시 표시), 상태 새로고침 버튼(refreshProfile → approved면 즉시 resolvePostLoginRoute 이동), 문의 연락처, 로그아웃 버튼 |
| 데이터 | `profiles.approval_status` 재조회(폴링 없음 — 수동 새로고침 + 페이지 재진입 시 확인) |
| 상태·규칙 | approved 사용자가 진입하면 즉시 앱으로 리다이렉트. 비로그인 진입 시 `/auth/login`. 🔄 to-be: 승인/거부 시 In-App 알림 발송(08-integrations 알림 규칙 연동) |

### 2.5 `/auth/rejected` ✅ (구 문서 누락분 — 정식 편입)
| 항목 | 내용 |
|---|---|
| 목적 | 가입 거부 상태 안내 |
| 기능 | 거부 사유 표시(Admin이 입력한 사유 — 없으면 일반 안내), 문의 연락처, 로그아웃. 재신청은 지점 문의 경로로만(자가 재신청 없음) |
| 데이터 | `profiles.approval_status='rejected'` (+🔄 to-be `profiles.rejection_reason`) |
| 상태·규칙 | rejected 사용자는 이 페이지와 `/auth/logout` 외 모든 보호 경로 차단(AuthGuard). approved/pending이 진입하면 각자 목적지로 리다이렉트 |

### 2.6 `/auth/reset-password` ✅
| 항목 | 내용 |
|---|---|
| 목적 | 비밀번호 재설정 3-Step |
| 기능 | Step1 이메일 입력·발송 → Step2 메일 링크 랜딩(토큰 검증) → Step3 새 비밀번호 설정(8자·3종). 링크 유효 1시간, 만료 시 재발송 유도 |
| 데이터 | `resetPasswordForEmail(email, { redirectTo: /auth/reset-password?step=3 })` → `updateUser({ password })` |
| 상태·규칙 | 🔄 현행은 redirectTo가 미존재 라우트 `/auth/update-password`를 가리킴(버그) — to-be에서 reset-password 단일 라우트의 step 파라미터로 통일. 완료 시 전 세션 무효화 후 재로그인 요구 |

### 2.7 `/auth/callback` 🟡 (라우트·처리 로직은 존재, 소셜 로그인 자체는 ⏳ Phase2)
| 항목 | 내용 |
|---|---|
| 목적 | OAuth/매직링크 인증 후 세션 확립 지점 |
| 기능 | ① PKCE `?code=` → `exchangeCodeForSession` ② Implicit `#access_token` → getSession 확인 ③ 팝업 컨텍스트(`window.opener`) 감지 시 세션 설정 후 `window.close()`만(부모의 onAuthStateChange가 SIGNED_IN 수신) ④ 일반 컨텍스트는 profile 조회 후 승인 상태 분기 → resolvePostLoginRoute |
| 데이터 | exchangeCodeForSession / getSession → profiles 조회. 신규 OAuth 유저는 트리거가 profiles(pending) 생성 |
| 상태·규칙 | 모든 실패는 `/auth/login?error=auth_callback_failed`로 표면화(무한 대기 금지). 팝업 실패 시에도 반드시 close — 좀비 팝업 금지 |

### 2.8 `/auth/logout` ✅
| 항목 | 내용 |
|---|---|
| 목적 | 명시적 로그아웃 처리 페이지 |
| 기능 | 진입 즉시 로컬 상태 초기화 → `supabase.auth.signOut()` → `/auth/login` 이동 |
| 데이터 | signOut(멀티탭은 storage 이벤트로 동기 로그아웃) |
| 상태·규칙 | **로컬 상태 초기화가 signOut 네트워크 호출보다 먼저**(현행 유지 패턴 — 서버 실패에도 UI는 즉시 로그아웃). signOut에 5초 타임아웃, 실패해도 login 이동 |

---

## 3. 승인 워크플로우 (가입 → pending → approved / rejected)

```
signUp ──▶ profiles.approval_status='pending'
                    │
        Admin: /admin/members (승인 대기 필터·뱃지)
                    │
        ┌───────────┴───────────┐
     [승인]                   [거부 + 사유 입력]
        │                        │
 approval_status='approved'   approval_status='rejected'
 (+ In-App 알림 발송 🔄)      (+ rejection_reason 저장 🔄)
        │                        │
 다음 로그인/새로고침 시       /auth/rejected 고정
 resolvePostLoginRoute 통과
```

- **판정 주체**: Admin만 승인/거부 가능 (`is_admin()` RLS + audit_logs 기록).
- **상태 전이 규칙**: `pending → approved | rejected` 단방향. `rejected → approved` 재승인은
  Admin 화면에서만 가능(오거부 복구). `approved → pending` 역전이는 금지.
- **게이트 적용 지점 3곳** (모두 §4 단일 함수 + §5.4 AuthGuard 경유, 로직 중복 금지):
  1. 로그인 직후 분기 (login 페이지)
  2. OAuth 콜백 분기 (callback 페이지)
  3. 보호 경로 상시 가드 (AuthGuard — 세션은 있으나 미승인인 사용자의 URL 직접 진입 차단)
- 미들웨어는 approval_status를 판정하지 않는다(§5.5) — DB 조회를 엣지에서 하지 않기 위함.
  승인 게이트는 클라이언트 AuthGuard + RLS(미승인자는 비즈니스 테이블 접근 불가)의 이중 방어.

---

## 4. 역할별 리다이렉트 — `resolvePostLoginRoute` 단일 함수

> 장애 이력 배경: 현행은 로그인 페이지/미들웨어/각 앱 AuthGuard 3곳에 리다이렉트 로직이
> 분산되어 수정 누락 시 상호 모순(무한 리다이렉트 루프)이 발생했다. to-be는 **1함수 1파일**로 강제.

```ts
// src/lib/auth/resolve-route.ts — 리다이렉트 결정의 유일한 소스
// 이 함수 외부에서 role/approval_status 기반 경로 분기를 작성하는 것 자체를 금지 (리뷰 반려 사유)

export interface RouteProfile {
  role: 'admin' | 'coach' | 'member';
  approval_status: 'pending' | 'approved' | 'rejected';
}

export function resolvePostLoginRoute(
  profile: RouteProfile | null,
  redirectParam?: string | null,
): string {
  if (!profile) return '/auth/login';                       // 프로필 로드 실패 → 재로그인
  if (profile.approval_status === 'pending')  return '/auth/pending-approval';
  if (profile.approval_status === 'rejected') return '/auth/rejected';

  // 승인 완료 — redirect 파라미터가 본인 역할 영역이면 우선 존중
  if (redirectParam && isAllowedForRole(redirectParam, profile.role)) return redirectParam;

  switch (profile.role) {
    case 'admin':  return '/admin/dashboard';
    case 'coach':  return '/coach/dashboard';
    case 'member': return '/apps/dashboard';
    default:       return '/auth/login';                    // 알 수 없는 role은 안전 실패
  }
}

// 역할별 접근 가능 prefix — AuthGuard도 이 표만 참조
export const ROLE_PREFIXES: Record<RouteProfile['role'], string[]> = {
  admin:  ['/admin', '/coach', '/apps', '/class', '/kiosk'], // admin은 전 영역 열람 가능
  coach:  ['/coach', '/class'],
  member: ['/apps'],
};

function isAllowedForRole(path: string, role: RouteProfile['role']): boolean {
  return ROLE_PREFIXES[role].some((p) => path.startsWith(p));
}
```

**규칙**
- 호출 지점: login 성공 후 / callback 처리 후 / pending-approval의 "상태 새로고침" /
  AuthGuard의 권한 밖 경로 감지 시 — 전부 이 함수만.
- `redirectParam`은 반드시 역할 허용 prefix 검증을 통과해야 사용(오픈 리다이렉트 방지 —
  외부 URL·타 역할 영역이면 무시하고 기본 대시보드).
- 단위 테스트 필수: role 3 × approval 3 + redirect 파라미터 조합 매트릭스(Vitest, §7 게이트 포함).

---

## 5. 【인증 안정성 설계】 — 최우선 요구

### 5.0 재발 방지 대상 장애 이력 3건 (nonfunctional-history 확정분)

| # | 장애 | 원인 | to-be 구조적 차단 |
|---|---|---|---|
| 1 | 로그인 후 5~10초 hang, 리다이렉트 지연 | `onAuthStateChange` 콜백 내 `await` supabase 쿼리 → 콜백이 navigator.locks의 auth lock을 잡은 채 실행되는데, 쿼리의 토큰 해석(getSession)이 같은 락을 대기 → **교착** | 금칙 패턴 F-1(§5.3) + AuthContext 표준 설계(§5.4): 콜백은 동기 상태 반영만, DB 조회는 락 해제 후(deferred) 실행 |
| 2 | 관리자 로그인 직후 /admin 진입 불가(로그인으로 되튕김) | 브라우저 클라이언트만 `storageKey='bcl-portal-auth'` 지정, 서버/미들웨어는 기본 쿠키명(`sb-<ref>-auth-token`)을 조회 → **쿠키명 불일치**로 서버가 항상 비인증 판정 | AUTH_STORAGE_KEY 상수 1곳(§5.1) + 팩토리 3종이 같은 상수를 공유(§5.2) — 수동 중복 정의 자체가 불가능한 구조 |
| 3 | 앱 전환(admin↔apps 등) 시 세션 끊김 | 미들웨어가 갱신된 Set-Cookie를 새 NextResponse 생성으로 유실 + 도메인/프록시 경계에서 쿠키 미전달(proxy 도입의 배경) | 미들웨어 표준 패턴 고정(§5.5: supabaseResponse 원본 반환 강제) + E2E 스모크에 "앱 전환" 단계 필수 포함(§7) |

### 5.1 세션 저장 규약 단일화 — 상수 1곳

```ts
// src/lib/supabase/constants.ts — 세션 저장소 이름의 유일한 정의처
export const AUTH_STORAGE_KEY = 'bcl-portal-auth';
```

- 문자열 리터럴 `'bcl-portal-auth'`가 이 파일 외 어디에도 등장하면 안 된다.
  CI에 grep 가드 추가: `grep -rn "bcl-portal-auth" src/ | grep -v constants.ts` 결과 0건.
- 브라우저 `auth.storageKey`, 미들웨어·서버 `cookieOptions.name` 이 셋 모두 이 상수만 import.

### 5.2 공용 클라이언트 팩토리 3종

파일 구조(현행 4파일 구조 유지 + constants 추가):

```
src/lib/supabase/
├── constants.ts    # AUTH_STORAGE_KEY + getSupabaseConfig() (env 결정 로직 — 현행 client.ts에서 이동)
├── client.ts       # ① createBrowserClient() — 브라우저 전용
├── middleware.ts   # ② updateSession(request) — 엣지 미들웨어 전용
├── server.ts       # ③ createServerSupabase() — RSC/Route Handler 전용
└── query.ts        # query()/rpc() 헬퍼 (도메인 규칙: 직접 from() 금지 — 현행 유지)
```

| 팩토리 | 실행 컨텍스트 | 세션 저장소 | 필수 설정 | 비고 |
|---|---|---|---|---|
| ① browser | 'use client' 컴포넌트 | localStorage + 쿠키(`AUTH_STORAGE_KEY`) | `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`, `storageKey: AUTH_STORAGE_KEY`, **모듈 레벨 싱글턴**(중복 onAuthStateChange 구독 방지 — 현행 유지) | `typeof window === 'undefined'` 방어 분기 유지 |
| ② middleware | Edge (middleware.ts) | request/response 쿠키 | `cookieOptions: { name: AUTH_STORAGE_KEY }`, getAll/setAll 핸들러, `getUser()` 우선 호출 | §5.5 패턴 고정 |
| ③ server | RSC / Route Handler / Server Action | `next/headers` cookies | `cookieOptions: { name: AUTH_STORAGE_KEY }`, setAll try-catch(RSC에서 set 불가 무시 — 미들웨어가 갱신 담당) | 요청마다 새 인스턴스(싱글턴 금지) |

- 세 팩토리 모두 `getSupabaseConfig()`(prod/dev env 스위치 + fallback)를 공유 — URL/키 결정 로직도 1곳.
- **금지**: 팩토리 밖에서 `createBrowserClient`/`createServerClient` 직접 호출,
  Service Role Key의 클라이언트 번들 유입(릴리즈 게이트: `.next/static`에 SRK 0건 — 09-nonfunctional).

### 5.3 금칙 패턴 목록 (코드 리뷰·CI 반려 기준)

| # | 금칙 | 이유(사례) | 대체 패턴 |
|---|---|---|---|
| F-1 | **`onAuthStateChange` 콜백 내 `await`** (특히 supabase 쿼리/RPC) | 장애 #1: auth lock 보유 중 같은 락을 기다리는 쿼리를 await → 교착, 로그인 5~10s hang | 콜백은 동기 setState만. 후속 DB 조회는 `setTimeout(0)` 등으로 락 해제 후 실행(§5.4 loadUserData) |
| F-2 | 쿠키명/storageKey 문자열 수동 정의 (상수 외 2번째 정의) | 장애 #2: 서버/클라 쿠키명 불일치 → 관리자 진입 불가 | `AUTH_STORAGE_KEY` import만 허용 + CI grep 가드 |
| F-3 | 미들웨어에서 새 `NextResponse` 생성 반환 (supabaseResponse 폐기) | 장애 #3: 갱신된 Set-Cookie 유실 → 브라우저-서버 세션 불일치, 앱 전환 시 끊김 | §5.5 표준 골격 밖 수정 금지 |
| F-4 | `getSession()`을 초기화 경로에서 직접 호출 | INITIAL_SESSION 이벤트와 이중 소스 → 레이스 | 초기 세션은 `onAuthStateChange`의 INITIAL_SESSION 단일 소스 |
| F-5 | 로딩 상태를 해제 경로 없이 시작 (무한 스피너) | UI 부채 이력: 인증 실패가 스피너 뒤에 숨어 사용자가 원인 파악 불가 | 모든 loading에 safety timeout + 에러 표면화(§5.6) |
| F-6 | role/approval 기반 경로 분기를 resolvePostLoginRoute 밖에서 작성 | 3곳 분산 → 상호 모순 리다이렉트 루프 | §4 단일 함수만 호출 |
| F-7 | 미들웨어에서 `getUser()` 이전에 다른 supabase 호출 삽입 | 토큰 갱신 순서 붕괴 → 만료 토큰으로 후속 호출 실패 | createServerClient → 즉시 getUser() 순서 고정 |
| F-8 | 비즈니스 쿼리에 `user.id`(auth uid) 직접 사용 | member_id 규칙 위반(도메인 규칙 6) | AuthContext의 `memberId` 사용, 서버는 `auth.uid()` → members 매핑 RPC |
| F-9 | onAuthStateChange 구독을 컴포넌트마다 생성 | 이벤트 중복 처리·상태 경합 | AuthProvider 1곳에서만 구독, 나머지는 useAuth() 소비 |
| F-10 | signOut 완료를 기다린 후 UI 초기화 | 네트워크 실패 시 로그아웃 불가 상태 고착 | 로컬 상태 선(先)초기화 → signOut은 best-effort(타임아웃 5s) |

### 5.4 AuthContext 설계 (락 회피 패턴 — 현행 검증 완료 구조 승계)

현행 `AuthContext.tsx`는 장애 #1을 이미 구조적으로 해소한 상태다. **아래 골격을 그대로 승계**하고,
"버릴 패턴"(§6)의 방어 코드만 걷어낸다.

```
AuthProvider (앱 루트 1회 마운트)
├─ 상태: user / session / profile / memberId / loading / (🔄 신규) authError
├─ 파생: isApproved / isPending / isRejected
├─ 초기화 (useEffect, deps=[]):
│   ├─ onAuthStateChange 단일 구독 — 초기 세션은 INITIAL_SESSION 이벤트로만 수신 (F-4)
│   ├─ 콜백은 100% 동기: setUser/setSession만 수행 (F-1)
│   ├─ loadUserData(uid): setTimeout(0)으로 락 해제 후 profile+memberId 병렬 fetch
│   │   └─ requestId 가드(마지막 요청만 반영 — stale response 차단), mountedRef 가드(StrictMode 안전)
│   ├─ 이벤트 처리: INITIAL_SESSION / SIGNED_IN → loadUserData(finishLoading)
│   │   SIGNED_OUT → 전체 초기화 · TOKEN_REFRESHED → 세션만 교체(프로필 재로드 안 함)
│   │   USER_UPDATED → loadUserData(프로필만 갱신)
│   └─ safety timeout 4s: INITIAL_SESSION 미도착 시 loading=false + authError 세팅 (F-5)
├─ 액션: signIn / signUp / signOut(로컬 선초기화, F-10) / resetPassword / refreshProfile
│   └─ signIn은 성공 시 { approvalStatus, role } 반환 → 페이지가 resolvePostLoginRoute 호출
└─ cleanup: subscription.unsubscribe() + mountedRef=false
```

🔄 **to-be 추가 — `authError` 표면화 상태**: 현행은 fetchProfile 실패를 console.warn으로 삼키고
profile=null로 남겨 화면이 "왜 안 되는지 모르는" 상태가 된다. to-be는
`authError: { code: 'PROFILE_LOAD_FAILED' | 'INIT_TIMEOUT' | 'SESSION_EXPIRED', message } | null`을
컨텍스트에 노출하고, AuthGuard가 이를 에러 화면(재시도 버튼 포함)으로 렌더한다(§5.6).

**AuthGuard 표준 (각 앱 layout 1곳)**
```
loading=true          → Skeleton (최대 4s — safety timeout이 보장)
authError             → 에러 카드(메시지 + 재시도 + 로그아웃 버튼)   ← 무한 스피너 금지
user 없음             → /auth/login?redirect={현재경로}
pending / rejected    → /auth/pending-approval | /auth/rejected
role이 현재 prefix 밖 → resolvePostLoginRoute(profile) 로 이동 (F-6: ROLE_PREFIXES 표만 참조)
정상                  → children 렌더 (+Coach 앱은 CoachStateGate 후속 — 04 문서)
```

### 5.5 미들웨어 설계

현행 `middleware.ts` 패턴은 Supabase SSR 공식 골격을 정확히 따르고 있어 **그대로 승계**한다.

```
updateSession(request):
  1. supabaseResponse = NextResponse.next({ request })            ← 먼저 생성
  2. createServerClient(url, anonKey, { cookieOptions: { name: AUTH_STORAGE_KEY }, cookies: {getAll, setAll} })
  3. await supabase.auth.getUser()                                 ← 즉시, 다른 호출 삽입 금지 (F-7)
     └─ 만료 access_token을 refresh_token으로 갱신 → setAll이 supabaseResponse에 Set-Cookie 기록
  4. 공개 경로면 supabaseResponse 그대로 반환 (쿠키 갱신만 수행)
  5. 보호 경로 + user 없음 → /auth/login?redirect={pathname} 리다이렉트
  6. 그 외 supabaseResponse 원본 반환 — 새 Response 생성 절대 금지 (F-3)
```

**경로 분류 (단일 상수 배열)**

| 분류 | 경로 | 미들웨어 동작 |
|---|---|---|
| 공개 | `/`, `/auth/*`, `/api/*`(자체 인증), `/kiosk/*`(공용 단말), `/class/*`(TV 공용/Display-Safe), `/_next/*` | 토큰 갱신만, 통과 |
| 보호 | `/admin/*`, `/coach/*`, `/apps/*` | 비인증 → login 리다이렉트. **역할·승인 판정은 하지 않음**(클라 AuthGuard + RLS 담당 — 엣지에서 DB 조회 금지) |

- 책임 분담 원칙: **미들웨어 = "세션 있음/없음" + 토큰 갱신만**, 역할 라우팅 = AuthGuard(§5.4),
  데이터 보호 = RLS. 세 층이 각자 독립적으로 안전해야 한다(한 층 우회가 침해로 직결되지 않게).
- 갱신 이중 체계: 브라우저 `autoRefreshToken`(만료 전 자동) + 미들웨어 getUser()(서버 내비게이션 시) —
  현행 유지.

### 5.6 세션 만료 · 갱신 · 재로그인 UX + 에러 표면화 규칙

| 시나리오 | 감지 | UX |
|---|---|---|
| 토큰 자동 갱신 성공 | TOKEN_REFRESHED 이벤트 | 무감지(UI 변화 없음) |
| refresh_token까지 만료(장기 미접속) | 미들웨어 getUser() null → login 리다이렉트 / 클라이언트 SIGNED_OUT | login 페이지에 "세션이 만료되었습니다. 다시 로그인해주세요." 배너 + `?redirect=` 유지 → 재로그인 시 원래 화면 복귀 |
| 사용 중 갱신 실패(네트워크 단절 등) | 쿼리 401 / SIGNED_OUT | 토스트 "연결이 만료되었습니다" → login 리다이렉트(작성 중 폼 데이터는 가능한 로컬 보존) |
| 멀티탭 로그아웃 | storage 이벤트 → SIGNED_OUT 전파 | 모든 탭 동시 login 이동 |
| 프로필 로드 실패(세션은 유효) | authError=PROFILE_LOAD_FAILED | 에러 카드: "프로필을 불러오지 못했습니다" + [다시 시도] [로그아웃] |
| 초기화 자체 실패 | authError=INIT_TIMEOUT (4s) | 동일 에러 카드 — **스피너 방치 금지** |

**에러 표면화 3원칙**
1. 모든 대기 상태는 유한하다 — 스피너/스켈레톤에는 반드시 타임아웃과 실패 전이가 있다.
2. 모든 인증 실패는 사용자 언어로 표면화한다 — console에만 남기는 실패 금지. 표준 에러 카드
   컴포넌트(12-design-system EmptyState 변형) 1종만 사용.
3. 모든 에러 화면에는 탈출구가 있다 — [다시 시도]와 [로그아웃] 중 최소 1개.

---

## 6. 현행 코드 승계/폐기 판정

| 대상 | 판정 | 근거 |
|---|---|---|
| onAuthStateChange 단일 소스 + INITIAL_SESSION 패턴 | ✅ 유지 | 장애 #1 해소 구조, 공식 권고 |
| 콜백 동기 처리 + setTimeout(0) deferred loadUserData | ✅ 유지 | 락 회피의 핵심 |
| requestId/mountedRef 가드, StrictMode cleanup | ✅ 유지 | 레이스·중복 구독 방어 |
| storageKey/cookieOptions 3종 일치 | ✅ 유지하되 🔄 상수화 | 현재는 문자열 3곳 복제 — F-2 위반 상태. constants.ts로 승격 |
| 미들웨어 supabaseResponse 골격, PUBLIC_PATHS | ✅ 유지 | 공식 패턴 정확 |
| signOut 로컬 선초기화 | ✅ 유지 | F-10 |
| client.ts 브라우저 싱글턴 + SSR 방어 분기 | ✅ 유지 | 중복 구독 방지 |
| `withTimeout` 래퍼 + signIn의 "session recovery" 재확인 로직 | 🗑 폐기(축소) | Web Lock hang의 **증상 완화용 워크어라운드**. 원인(F-1)이 구조적으로 제거된 to-be에서는 8s 타임아웃·500ms 딜레이·recovery 재조회가 복잡도만 남김. safety timeout(4s) 1개만 유지 |
| AuthContext 내 별도 `getSupabase()` 모듈 캐시 | 🗑 폐기 | client.ts 싱글턴과 이중 캐시 — 팩토리 직접 사용 |
| `(supabase as any).from(...)` any 캐스팅 | 🗑 폐기 | 타입 안전 상실 — Database 제네릭 + query() 헬퍼로 대체 |
| resetPassword의 `/auth/update-password` redirectTo | 🗑 폐기 | 미존재 라우트(버그) — §2.6 참조 |
| signInWithOAuth 팝업/모바일 분기 로직 | 🟡 보존(Phase2) | 소셜 로그인 ⏳과 함께 재검증 후 활성화. 팝업 폴백·타임아웃 설계는 재사용 가치 있음 |
| 리다이렉트 분기 3곳 분산(login 페이지/가드/콜백 각자 구현) | 🗑 폐기 | F-6 — resolvePostLoginRoute로 수렴 |
| fetchProfile 실패 시 무통보 null | 🗑 폐기 | §5.6 authError 표면화로 대체 |

---

## 7. Playwright 인증 E2E 스모크 + CI 게이트

### 7.1 시나리오 명세 (`e2e/auth-smoke.spec.ts`)

전 시나리오 공통 픽스처: 시드 계정 4종(admin/coach/member-approved/member-pending) —
`sql/` 시드 최소셋에 포함, 테스트 전용 Supabase 프로젝트(또는 로컬 스택) 대상.

| # | 시나리오 | 단계 | 통과 기준 |
|---|---|---|---|
| S1 | 역할별 로그인 진입 | login → admin/coach/member 각각 signIn | 각 role의 대시보드 URL 도달, **로그인 클릭→대시보드 렌더 5초 이내**(장애 #1 회귀 감지선) |
| S2 | 새로고침 세션 유지 | S1 후 대시보드에서 `page.reload()` | 재로그인 요구 없이 동일 화면 복원, 무한 스피너 없음(스켈레톤 4s 내 해소) |
| S3 | 앱 전환 세션 유지 | admin 계정: /admin/dashboard → /apps/dashboard → /coach/dashboard 직접 내비게이션 | 전 구간 세션 유지(장애 #3 회귀 감지선), 쿠키명 `bcl-portal-auth` 단일 확인 |
| S4 | 승인 게이트 | member-pending 로그인 → /apps/dashboard URL 직접 진입 시도 | /auth/pending-approval로 강제 이동, 보호 데이터 미노출 |
| S5 | 역할 경계 | member-approved로 /admin/dashboard 직접 진입 | /apps/dashboard로 리다이렉트(ROLE_PREFIXES 준수) |
| S6 | 비인증 보호경로 + redirect 복귀 | 로그아웃 상태로 /coach/schedule 진입 → coach 로그인 | login?redirect= 경유 후 /coach/schedule 복귀 |
| S7 | 로그아웃 | 로그인 → 로그아웃 → 뒤로가기/보호경로 재진입 | login으로 이동, 세션 잔존 없음(localStorage/쿠키 삭제 확인) |
| S8 | 로그인 실패 표면화 | 오입력 로그인 | 에러 메시지 렌더 확인, 스피너 3s 내 해소(F-5 회귀 감지) |

### 7.2 CI 게이트 편입 규칙

- `quality.yml`에 `auth-e2e` job 추가: `next build` → `next start` → Playwright(S1~S8, chromium).
- **차단 규칙**: auth-e2e 실패 = `deploy.yml` 실행 불가(quality가 deploy의 required check).
  인증 스모크는 flaky 허용 재시도 1회까지, 2회 실패는 무조건 배포 차단 — skip 라벨/우회 플래그 금지.
- resolvePostLoginRoute 단위 테스트(Vitest, §4 매트릭스)와 F-2 grep 가드도 동일 job에 편입.
- 로컬 실행 규약: `npm run test:e2e:auth` — 13-repo-structure의 verify 스킬에 등록.

---

## 8. 데이터 계약 요약 (07-data-model 참조 포인터)

- `profiles`: `id`(=auth.uid) / `role`(admin|coach|member) / `approval_status`(pending|approved|rejected) /
  (🔄 신규) `rejection_reason text` / `facility_id`. auth.users INSERT 트리거로 자동 생성.
- `members.user_id` nullable(미연결 회원 존재) — memberId 매핑은 AuthContext 1곳에서만 수행(F-8).
- 승인/거부 RPC 또는 Admin 화면 UPDATE는 `is_admin()` + audit_logs 기록 필수.
- RLS: 미승인(pending/rejected) 사용자는 자신의 profiles 행 외 비즈니스 테이블 SELECT 불가.
