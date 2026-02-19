# BCL Portal – Known Issues 일괄 정비 기획서

> **Status**: Approved
> **Author**: Architect (Opus)
> **Created**: 2026-02-20
> **Last Updated**: 2026-02-20
> **Related**: `.docs/project-blueprint.md` § Known Issues

---

## 1. 개요 및 배경

### 1.1 목적
`project-blueprint.md`의 Known Issues에 등록된 **3개 활성 이슈**를 체계적으로 분석하고,
우선순위 기반의 수정 방안을 제시한다.

### 1.2 대상 이슈

| # | 등급 | 이슈 | 위험도 |
|---|------|------|--------|
| **KI-1** | 🔴 | `user_id` / `member_id` 혼용 | **높음** — 데이터 불일치 위험 |
| **KI-2** | ⚠️ | `@supabase/supabase-js` 타입 복잡도 (`as any` 32개 파일) | **중간** — 유지보수성 |
| **KI-3** | 🟡 | 코치 계정 미연결 (OPERATIONAL) | **낮음** — 운영 단계 수동 처리 |

### 1.3 핵심 제약 조건
| 항목 | 내용 |
|---|---|
| **플랫폼** | Next.js 16 CSR + Supabase |
| **DB 접근** | Client SDK + anon key + RLS |
| **불가 사항** | 테이블 구조 대규모 변경 (운영 데이터 영향) |

---

## 2. KI-1: user_id / member_id 혼용 (🔴 CRITICAL)

### 2.1 현황 분석 (As-Is)

#### 아키텍처 레이어
```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────────┐
│  auth.users      │     │   profiles    │     │      members          │
│  (Supabase Auth) │     │  id = user_id │     │  id = member_id (PK) │
│  id = user_id    │────▶│  role         │     │  user_id → auth.users │
└─────────────────┘     └──────────────┘     └──────────────────────┘
                                                       │
                                              ┌────────┴────────┐
                                              ▼                 ▼
                                     bookings.member_id   checkins.member_id
                                     memberships.member_id sessions(간접)
                                     transactions.member_id
                                     badge_awards.member_id
                                     race_records.member_id
                                     session_feedback.member_id
                                     support_tickets.member_id
                                     lockers.member_id
```

#### DB 테이블별 FK 현황

| 테이블 | FK 컬럼 | 참조 대상 | 비고 |
|--------|---------|-----------|------|
| `profiles` | `id` (PK) | `auth.users(id)` | id = user_id |
| `members` | `user_id` | `auth.users(id)` | **nullable** (비연결 회원 존재 가능) |
| `admin_user_roles` | `user_id` | `profiles(id)` | OK |
| `coaches` | `user_id` | `auth.users(id)` | **nullable** (KI-3 연관) |
| `notifications` | `user_id` | `auth.users(id)` | user 레이어 |
| `notifications` | `member_id` | `members(id)` | **양쪽 모두 존재** |
| `notification_logs` | `user_id` | 참조 없음 | FK 미설정 |
| `notification_preferences` | `user_id` | `auth.users(id)` | OK |
| `push_subscriptions` | `user_id` | `auth.users(id)` | OK |
| `audit_logs` | `user_id` | 참조 없음 | FK 미설정 |
| `bookings` | `member_id` | `members(id)` | ✅ 정상 |
| `checkins` | `member_id` | `members(id)` | ✅ 정상 |
| `memberships` | `member_id` | `members(id)` | ✅ 정상 |
| `transactions` | `member_id` | `members(id)` | ✅ 정상 |
| `badge_awards` | `member_id` | `members(id)` | ✅ 정상 |
| `race_records` | `member_id` | `members(id)` | ✅ 정상 |
| `session_feedback` | `member_id` | `members(id)` | ✅ 정상 |
| `support_tickets` | `member_id` | `members(id)` | ✅ 정상 |
| `lockers` | `member_id` | `members(id)` | ✅ 정상 |

#### 프론트엔드 코드 문제점

**치명적 패턴**: `auth.getUser().id`를 `member_id`로 직접 사용
```typescript
// ❌ 위험: user.id (auth UUID) ≠ members.id (별도 UUID)
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('checkins').select('*').eq('member_id', user.id);
//                                                    ^^^^^^^^
// members.member_id는 members 테이블의 PK인데,
// user.id는 auth.users의 PK이므로 서로 다를 수 있음
```

**영향 받는 파일 (8개)**:
| 파일 | 패턴 | 위험도 |
|------|------|--------|
| `apps/records/page.tsx` | `.eq('member_id', user.id)` 2회 | 🔴 |
| `apps/feedback/page.tsx` | `.eq('member_id', user.id)` 1회 | 🔴 |
| `apps/dashboard/page.tsx` | `.eq('member_id', user.id)` 2회 | 🔴 |
| `apps/profile/page.tsx` | `.eq('member_id', user.id)` 1회 | 🔴 |
| `apps/checkin/page.tsx` | `.eq('member_id', user.id)` 2회 | 🔴 |

**정상 패턴**: user_id가 있는 테이블에 user.id 사용
```typescript
// ✅ 정상: user_id 컬럼이 있는 테이블에 대해 auth user.id 사용
await supabase.from('memberships').select('*').eq('user_id', user.id);
```

**단, 현재 `bookings` 테이블에는 `user_id` 컬럼이 없음** → `member_id`로만 접근해야 함

### 2.2 수정 방안 (To-Be)

#### 방안 A: 공통 `useMemberId()` 훅 도입 (✅ 추천)
```typescript
// hooks/useMemberId.ts
export function useMemberId() {
    const [memberId, setMemberId] = useState<string | null>(null);
    
    useEffect(() => {
        async function resolve() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            // auth user_id → members.id 변환
            const { data } = await supabase
                .from('members')
                .select('id')
                .eq('user_id', user.id)
                .single();
            
            if (data) setMemberId(data.id);
        }
        resolve();
    }, []);
    
    return memberId;
}
```

**장점**: 
- 기존 DB 스키마 변경 불필요
- 명확한 레이어 분리 (auth → member)
- 새 페이지에서도 안전하게 사용 가능

**단점**:
- 추가 쿼리 1회 발생 (캐싱으로 완화)
- 기존 코드 32+ 곳 수정 필요

#### 방안 B: AuthContext에 memberId 추가 (✅ 추천 — A와 조합)
```typescript
// contexts/AuthContext.tsx 확장
interface AuthState {
    user: User | null;
    memberId: string | null;  // members.id
    userId: string | null;    // auth.users.id
    role: string | null;
}
```

로그인 시 1회만 members 조회하고 Context에 캐싱.
모든 페이지에서 `const { memberId, userId } = useAuth()` 로 명확히 구분.

#### 방안 C: DB에 `user_id` 컬럼 추가 (⚠️ 보조)

`member_id`만 있는 테이블에 `user_id` 컬럼을 추가하여 양쪽 모두 접근 가능하게 함.
단, 스키마 변경이 광범위하여 **비추천**.

### 2.3 선택 방안: **A+B 조합**

1. `AuthContext`에 `memberId` 필드 추가 (로그인 시 1회 조회 후 캐싱)
2. 기존 `.eq('member_id', user.id)` 코드 → `.eq('member_id', memberId)` 로 교체
3. `useMemberId()` 훅은 AuthContext 밖에서 필요할 때 사용

---

## 3. KI-2: Supabase 타입 복잡도 (`as any` 32개 파일) (⚠️ MEDIUM)

### 3.1 현황 분석

- **원인**: Supabase의 자동 생성 DB 타입이 테이블 수에 비례하여 TypeScript 깊이 제한 초과 (TS2589)
- **현재 대응**: `src/lib/supabase/query.ts` 헬퍼 생성 완료 (`query()`, `rpc()`)
- **잔존 문제**: 기존 32개 파일에서 `createClient() as any` 패턴 사용

### 3.2 수정 방안

**단계적 마이그레이션**:
1. 모든 `createClient() as any` → `query('tableName')` 으로 교체
2. 모든 `(supabase as any).rpc()` → `rpc('fnName', args)` 으로 교체
3. `auth` 관련 호출은 `createClient()` 유지 (타입 문제 없음)

**일괄 교체 패턴**:
```typescript
// Before:
const supabase: any = createClient();
const { data } = await supabase.from('bookings').select('*');

// After:
import { query } from '@/lib/supabase/query';
const { data } = await query('bookings').select('*');
```

### 3.3 리스크

- 교체 자체는 기계적이나 **32개 파일** 대상 → 실수 발생 가능
- query 헬퍼가 `.auth` 메서드는 제공하지 않으므로 auth 호출은 별도 유지

---

## 4. KI-3: 코치 계정 미연결 (🟡 OPERATIONAL)

### 4.1 현황

- `coaches.user_id = NULL` 상태가 존재 가능
- Admin UI에서 코치 연결 기능 (`promote_to_coach` RPC) 이미 구현 완료
- **코드적 해결 완료** → 운영 단계에서 관리자가 수동 연결해야 함

### 4.2 수정 방안

**런타임 방어 코드 추가**:
- 코치 관련 페이지에서 `coaches.user_id IS NULL` 체크 시 경고 표시
- Admin 코치 목록에 "미연결" 배지 강조

**이 이슈는 코드 변경 최소화** → Phase에 포함하되 경미한 작업으로 분류

---

## 5. 구현 Phase 설계

### Phase 1: AuthContext 확장 + useMemberId 훅 (KI-1 기반)
> **담당**: 💻 **Developer (Sonnet)**
> **예상 작업량**: 중간

- [ ] `AuthContext`에 `memberId` 필드 추가
- [ ] 로그인 시 `members.id` 조회 후 Context에 저장
- [ ] `useMemberId()` 커스텀 훅 생성 (fallback용)
- [ ] 타입 정의 (`AuthState` 인터페이스 확장)

### Phase 2: 프론트엔드 member_id 혼용 수정 (KI-1 해결)
> **담당**: 💻 **Developer (Sonnet)**
> **예상 작업량**: 높음 (8+ 파일)

- [ ] `apps/dashboard/page.tsx` — `.eq('member_id', user.id)` 수정 (2곳)
- [ ] `apps/records/page.tsx` — `.eq('member_id', user.id)` 수정 (2곳)
- [ ] `apps/checkin/page.tsx` — `.eq('member_id', user.id)` 수정 (2곳)
- [ ] `apps/feedback/page.tsx` — `.eq('member_id', user.id)` 수정 (1곳)
- [ ] `apps/profile/page.tsx` — `.eq('member_id', user.id)` 수정 (1곳)
- [ ] 기타 user_id/member_id 혼용 코드 전수 검사 및 수정

### Phase 3: Supabase 타입 정리 (KI-2 해결)
> **담당**: 💻 **Developer (Sonnet)**
> **예상 작업량**: 높음 (32개 파일)

- [ ] `createClient() as any` → `query()` / `rpc()` 헬퍼 일괄 전환
- [ ] 각 파일의 auth 호출은 `createClient()` 유지
- [ ] `as unknown as Type` 캐스팅도 query 헬퍼로 대체

### Phase 4: 코치 미연결 방어 코드 + 문서 동기화 (KI-3 + 마무리)
> **담당**: 💻 **Developer (Sonnet)**
> **예상 작업량**: 낮음

- [ ] Admin 코치 목록에 `user_id = null` 경고 배지 강화
- [ ] 문서 동기화 (blueprint, sitemap)
- [ ] Known Issues 상태 갱신 (RESOLVED)
- [ ] 버전 갱신 (PATCH: 0.3.x)

---

## 6. 영향 범위

| 영역 | 영향 | 상세 |
|------|------|------|
| **DB 스키마** | 없음 | 기존 스키마 유지 |
| **AuthContext** | 확장 | `memberId` 필드 추가 |
| **User App 페이지** | 8+ 파일 수정 | member_id 조회 로직 수정 |
| **Admin 페이지** | 32개 파일 수정 | `as any` → `query()` 전환 |
| **RLS 정책** | 없음 | 기존 정책 유지 |
| **API Routes** | 없음 | 변경 없음 |

---

## 7. 보안 고려사항

- `member_id` 혼용 수정은 **RLS 정책에 영향 없음** (Policy는 `auth.uid()` 기반)
- `query()` 헬퍼 전환은 **동일한 anon key** 사용 → 보안 변경 없음
- `memberId`를 Context에 저장하는 것은 **클라이언트 사이드만** → 서버 보안은 RLS

---

## 8. 테스트 시나리오

### TC-1: member_id 정합성
| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | 로그인 후 대시보드 접속 | 본인 체크인/예약 통계 정상 표시 |
| 2 | 체크인 페이지에서 QR 표시 | memberId 기반 QR 생성 |
| 3 | 기록 페이지 접속 | 본인 운동 기록만 표시 |
| 4 | 피드백 작성 | member_id로 피드백 저장 |

### TC-2: query() 헬퍼 전환
| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| 1 | Admin 회원 목록 | 정상 로드 |
| 2 | Admin 예약 관리 | CRUD 정상 동작 |
| 3 | Admin 거래 내역 | 필터/검색 정상 |
| 4 | TypeScript 빌드 | `as any` 0개, TS2589 없음 |

---

## 9. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 32개 파일 일괄 수정 시 기능 회귀 | 높음 | Phase별 빌드 검증, 단계적 진행 |
| AuthContext 변경 시 전체 앱 영향 | 중간 | memberId 없으면 기존 로직 fallback |
| members 테이블에 user_id 미연결 회원 | 낮음 | nullable 처리, 빈 상태 UI 표시 |

---

## 10. 기술 결정 사항

| 항목 | 결정 | 근거 |
|------|------|------|
| member_id 해결 방식 | AuthContext 확장 | 1회 조회 후 캐싱, 모든 페이지에서 일관 |
| as any 제거 방식 | query() 헬퍼 전환 | 이미 구현 완료, 기계적 교체 가능 |
| DB 스키마 변경 | 없음 | 운영 영향 최소화 |
| 버전 증가 | PATCH (0.3.x) | 기능 추가 아닌 코드 품질 개선 |

---

## 11. 에이전트별 작업 배분

| Phase | 담당 | 작업 |
|-------|------|------|
| Phase 1 | 💻 Developer (Sonnet) | AuthContext 확장 + useMemberId 훅 |
| Phase 2 | 💻 Developer (Sonnet) | member_id 혼용 수정 (8+ 파일) |
| Phase 3 | 💻 Developer (Sonnet) | as any → query() 전환 (32 파일) |
| Phase 4 | 💻 Developer (Sonnet) | 코치 방어 코드 + 문서 동기화 |

> 모든 Phase가 **코드 리팩토링** 성격이므로 Developer 단독 수행.
> DB 스키마 변경 없으므로 Senior Dev(Opus) 불필요.

---

## 12. Planning Log

| 날짜 | 세션 | 작업 내용 |
|------|------|----------|
| 2026-02-20 00:10 | #1 | 전체 기획 완료 (DB 분석, 코드 분석, 4 Phase 설계). Status: Approved |
