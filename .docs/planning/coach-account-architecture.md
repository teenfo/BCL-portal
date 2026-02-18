# BCL Portal – 코치 계정 아키텍처 강화 기획서

> **Status**: Approved (기획 승인 — 개발 대기)  
> **Author**: Agent (Architect)  
> **Date**: 2026-02-18  
> **Related**:
> - `.docs/sitemap/coach-app.md` (코치 앱 SSOT)
> - `.docs/database-reference.md` (DB 참조)
> - `src/app/admin/operations/coaches/page.tsx` (Admin 코치 관리)
> - `src/app/coach/**/*` (코치 앱 5개 화면)

---

## 1. 개요 및 배경

### 1.1 목적
현재 코치 등록 프로세스는 Admin이 `coaches` 테이블에 이름/이메일 등의 정보만 직접 입력하는 **콘텐츠 생성** 방식이다.
이 방식에서는 코치에게 Supabase Auth 계정이 부여되지 않아 **Coach App에 로그인할 수 없는** 구조적 결함이 존재한다.

이 기획서는 코치가 실제로 Coach App에 로그인하고 활동할 수 있도록 `coaches` 테이블과 `auth.users`/`profiles` 테이블 간의 **연결 아키텍처를 강화**하는 방안을 정의한다.

### 1.2 핵심 제약 조건
| 항목 | 내용 |
|---|---|
| **채택 방식** | 방안 B: 수동 연결 (기존 회원을 코치로 승격) |
| **기존 인프라 활용** | Supabase Auth, profiles.role, AuthGuard 등 기존 시스템 재사용 |
| **신규 인프라 불필요** | Edge Function, 초대 이메일 등 추가 인프라 없음 |
| **코치 관리 허브** | Admin 코치 관리 페이지가 코치 업무의 중심 (유지) |

---

## 2. 현재 문제 진단 (As-Is)

### 2.1 데이터 흐름 분석

```
┌─────────────────────────────────────────────────────────────────┐
│  현재 흐름 (문제)                                               │
│                                                                 │
│  Admin 코치 관리 → "신규 코치" 모달                              │
│       │                                                         │
│       ▼                                                         │
│  coaches 테이블 INSERT:                                         │
│    name = '김코치'                                              │
│    email = 'coach@bcl.com'                                      │
│    user_id = NULL  ← 🔴 Auth 연결 없음                          │
│       │                                                         │
│       ▼                                                         │
│  Coach App Dashboard:                                           │
│    SELECT * FROM coaches WHERE user_id = auth.uid()             │
│    → 결과: 0건 (user_id가 NULL이므로) ← 🔴 항상 실패            │
│                                                                 │
│  결과: 코치가 로그인해도 본인 수업/데이터를 볼 수 없음           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 문제점 요약

| # | 문제 | 영향 | 위치 |
|---|---|---|---|
| 1 | `coaches.user_id`가 Auth 계정 없이 `NULL`로 생성됨 | Coach App 데이터 조회 불가 | `admin/operations/coaches/page.tsx` L203~218 |
| 2 | 코치 등록 시 기존 회원 검색/선택 기능 없음 | Auth 계정 연결 불가 | 코치 등록 모달 |
| 3 | `profiles.role` 변경 메커니즘 없음 | 코치로 승격할 수 없음 | AuthGuard, AuthContext |
| 4 | Coach App이 `coaches.user_id`에 의존 | user_id NULL이면 전 화면 빈 데이터 | `coach/dashboard`, `schedule`, `profile` 등 |
| 5 | 코치 이름/이메일이 coaches/profiles에 이중으로 관리될 수 있음 | 데이터 불일치 | coaches + profiles 테이블 |

---

## 3. 개선 설계 (To-Be)

### 3.1 핵심 설계 원칙

> **"코치는 반드시 기존 가입 회원에서 선택한다."**
> - 모든 코치는 먼저 일반 회원으로 가입 (Supabase Auth 계정 보유)
> - Admin이 해당 회원을 코치로 "승격" → `profiles.role = 'coach'` + `coaches.user_id` 연결
> - Coach App은 `coaches.user_id == auth.uid()`로 데이터를 조회 → 정상 작동

### 3.2 개선된 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  개선 흐름 (To-Be)                                              │
│                                                                 │
│  [전제] 코치 후보자가 일반 회원가입 완료                          │
│         → auth.users에 계정 존재                                 │
│         → profiles.role = 'member'                               │
│         → profiles.approval_status = 'approved'                  │
│                                                                 │
│  [Step 1] Admin 코치 관리 → "신규 코치" 모달 오픈                 │
│                                                                 │
│  [Step 2] 회원 검색 (이름/이메일)                                │
│         → profiles 테이블에서 검색                                │
│         → 이미 코치인 회원은 제외                                 │
│                                                                 │
│  [Step 3] 회원 선택 → 코치 전문 정보 입력                        │
│         → specialties, bio, profile_image 등                     │
│                                                                 │
│  [Step 4] 저장 시 동시 처리:                                     │
│         → coaches INSERT (user_id = 선택된 회원 ID)              │
│         → profiles UPDATE (role = 'coach')                       │
│         → ✅ 즉시 Coach App 접근 가능                             │
│                                                                 │
│  [Coach App] Coach Dashboard:                                    │
│    SELECT * FROM coaches WHERE user_id = auth.uid()              │
│    → 결과: 1건 ← ✅ 정상 조회                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 역할 생명주기 (Role Lifecycle)

```
  회원가입          Admin 승격         Admin 비활성화      Admin 재활성화
     │                  │                   │                   │
     ▼                  ▼                   ▼                   ▼
  [member] ────────→ [coach] ──────────→ [member] ──────────→ [coach]
                        │                                       │
                   coaches 생성           coaches.status       coaches.status
                   user_id 연결           = 'inactive'          = 'active'
                   profiles.role          profiles.role         profiles.role
                   = 'coach'              = 'member'            = 'coach'
```

---

## 4. 데이터베이스 변경

### 4.1 coaches 테이블 확장

```sql
-- 마이그레이션: coach_account_linking

-- 1. user_id에 UNIQUE 제약 추가 (한 Auth 계정 = 하나의 코치 레코드)
ALTER TABLE public.coaches 
  ADD CONSTRAINT coaches_user_id_unique UNIQUE (user_id);

-- 2. 연결 시각 기록 컬럼
ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

-- 3. 연결한 Admin 기록
ALTER TABLE public.coaches 
  ADD COLUMN IF NOT EXISTS linked_by UUID;

-- 4. 인덱스 최적화
CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON public.coaches(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coaches_status ON public.coaches(status);
```

### 4.2 RLS 정책 보강

```sql
-- 코치 본인 데이터 조회 허용
CREATE POLICY "Coach can view own record"
  ON public.coaches FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin은 전체 조회/수정 가능
CREATE POLICY "Admin full access to coaches"
  ON public.coaches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 코치 본인 프로필 수정 (bio, profile_image_url 등 제한적)
CREATE POLICY "Coach can update own profile fields"
  ON public.coaches FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 4.3 profiles.role 변경을 위한 DB 함수

```sql
-- Admin이 회원을 코치로 승격하는 함수
-- (RLS를 우회하지 않으면서도 profiles.role을 안전하게 변경)
CREATE OR REPLACE FUNCTION public.promote_to_coach(
  target_user_id UUID,
  admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Admin 권한 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can promote users';
  END IF;

  -- profiles.role 변경
  UPDATE public.profiles 
  SET role = 'coach'
  WHERE id = target_user_id;

  -- audit_logs에 기록
  INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
  VALUES (
    admin_user_id,
    'PROMOTE_TO_COACH',
    'profiles',
    jsonb_build_object('target_user_id', target_user_id, 'new_role', 'coach')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin이 코치를 일반 회원으로 되돌리는 함수
CREATE OR REPLACE FUNCTION public.demote_from_coach(
  target_user_id UUID,
  admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Admin 권한 확인
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = admin_user_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only admins can demote coaches';
  END IF;

  -- profiles.role 복원
  UPDATE public.profiles 
  SET role = 'member'
  WHERE id = target_user_id;

  -- coaches.status 비활성화
  UPDATE public.coaches
  SET status = 'inactive'
  WHERE user_id = target_user_id;

  -- audit_logs에 기록
  INSERT INTO public.audit_logs (user_id, action, table_name, new_values)
  VALUES (
    admin_user_id,
    'DEMOTE_FROM_COACH',
    'profiles',
    jsonb_build_object('target_user_id', target_user_id, 'new_role', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Admin UI 변경 상세

### 5.1 코치 등록 모달 레이아웃 변경

**현재 모달 (As-Is)**:
```
┌──────────────────────────────────┐
│  새 코치 등록                     │
│                                  │
│  [프로필 이미지]                  │
│                                  │
│  이름*:     [직접 입력          ] │
│  이메일:    [직접 입력          ] │
│  전화번호:  [직접 입력          ] │
│  상태:      [활동중 ▾           ] │
│  전문분야:  [직접 입력          ] │
│  소개:      [직접 입력          ] │
│                                  │
│         [취소]  [저장]           │
└──────────────────────────────────┘
```

**개선 모달 (To-Be)**:
```
┌──────────────────────────────────────┐
│  새 코치 등록                         │
│                                      │
│  ── Step 1: 회원 계정 선택 (필수) ──  │
│  🔍 [이름 또는 이메일 검색       ]    │
│  ┌────────────────────────────────┐  │
│  │ 👤 김철수 (kim@bcl.com)   [선택]│  │
│  │ 👤 박영희 (park@bcl.com)  [선택]│  │
│  │ 👤 이민수 (lee@bcl.com)   [선택]│  │
│  └────────────────────────────────┘  │
│                                      │
│  ✅ 선택됨: 김철수 (kim@bcl.com)  [×] │
│  ⓘ 이 회원의 역할이 '코치'로         │
│    변경됩니다.                        │
│                                      │
│  ── Step 2: 코치 프로필 정보 ──      │
│  [프로필 이미지]                      │
│                                      │
│  전문분야:  [Olympic Lifting, ...   ] │
│  소개:      [코치 바이오 입력...     ] │
│  전화번호:  [010-xxxx-xxxx          ] │ ← profiles에 없는 추가 정보
│  상태:      [활동중 ▾               ] │
│                                      │
│          [취소]  [저장]              │
└──────────────────────────────────────┘
```

### 5.2 모달 변경 상세 명세

#### Step 1: 회원 검색/선택

| 요소 | 설명 |
|---|---|
| **검색 입력** | `profiles` 테이블에서 `full_name` 또는 연결된 `auth.users.email`로 검색 |
| **검색 필터** | `role = 'member'` AND `approval_status = 'approved'`만 표시 (이미 코치인 사람 제외) |
| **검색 결과** | 최대 5건 표시, 이름 + 이메일 + 아바타 |
| **선택 표시** | 선택된 회원은 상단에 칩(Chip) 형태로 표시 + 제거(×) 가능 |
| **필수 검증** | 회원 선택 없이 저장 불가 |

#### Step 2: 코치 전문 정보

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `profile_image_url` | 이미지 업로드 | 선택 | 기존 이미지 업로드 기능 유지 |
| `specialties` | 텍스트 (쉼표 구분) | 선택 | 전문 분야 태그 |
| `bio` | 텍스트 영역 | 선택 | 코치 소개 |
| `phone` | 텍스트 | 선택 | 코치 연락처 |
| `status` | 셀렉트박스 | 필수 | 활동중 / 비활성 / 휴직 |

#### 저장 시 수행 동작

```typescript
async function saveCoach() {
  // 1. coaches 테이블에 INSERT (신규) 또는 UPDATE (수정)
  const coachData = {
    user_id: selectedMember.id,           // ← 핵심: Auth 계정 연결
    name: selectedMember.full_name,       // ← profiles에서 가져옴
    email: selectedMember.email,          // ← auth.users에서 가져옴
    phone: form.phone,
    specialties: form.specialties.split(',').map(s => s.trim()),
    bio: form.bio,
    status: form.status,
    profile_image_url: uploadedImageUrl,
    linked_at: new Date().toISOString(),  // 연결 시각
    linked_by: currentAdminUser.id,       // 연결한 Admin
  };
  
  await supabase.from('coaches').insert(coachData);
  
  // 2. profiles.role = 'coach'로 변경
  await supabase.rpc('promote_to_coach', {
    target_user_id: selectedMember.id,
    admin_user_id: currentAdminUser.id,
  });
}
```

### 5.3 코치 카드 UI 변경

기존 코치 카드에 **계정 연결 상태** 배지 추가:

```
┌───────────────────────────────────┐
│  김코치                    [88px] │
│  coach@bcl.com            [이미지]│
│  ✅ 계정 연결됨                   │ ← 🆕 연결 상태 배지
│  ┌─────┐ ┌──────────┐            │
│  │활동중│ │📞 010-...│            │
│  └─────┘ └──────────┘            │
│  Olympic Lifting  Gymnastics      │
│                                   │
│  "10년 경력의 크로스핏 전문..."   │
│                                   │
│  ───────────────────────────      │
│  [✏️ 수정]         [🗑️ 삭제]      │
└───────────────────────────────────┘
```

연결 상태 표시:
| 상태 | 배지 | 색상 |
|---|---|---|
| 연결됨 | `✅ 계정 연결됨` | 녹색 |
| 미연결 | `⚠️ 계정 미연결` | 주황색 |
| 비활성(해제) | `🔒 비활성화` | 회색 |

### 5.4 코치 편집 모달

- **이미 연결된 코치**를 편집할 때는 Step 1(회원 선택)이 **읽기 전용**으로 표시
- 연결된 회원 정보 변경은 불가 (삭제 후 재등록 방식)
- Step 2(코치 전문 정보)만 수정 가능

### 5.5 코치 삭제/비활성화 시 처리

```typescript
async function deleteCoach(coachId: string) {
  const coach = coaches.find(c => c.id === coachId);
  
  // 1. coaches 레코드 삭제
  await supabase.from('coaches').delete().eq('id', coachId);
  
  // 2. profiles.role을 'member'로 복원
  if (coach?.user_id) {
    await supabase.rpc('demote_from_coach', {
      target_user_id: coach.user_id,
      admin_user_id: currentAdminUser.id,
    });
  }
}
```

---

## 6. Coach App 영향 분석

### 6.1 현재 영향받는 화면

Coach App의 5개 화면 모두 `coaches.user_id == auth.uid()` 패턴으로 데이터를 조회한다.
**개선 후에는 user_id가 정상 연결되므로 코드 변경 없이 정상 동작**해야 한다.

| 화면 | 파일 | 조회 패턴 | 변경 필요 |
|---|---|---|---|
| Dashboard | `src/app/coach/dashboard/page.tsx` L42~46 | `coaches.user_id == user.id` → `.single()` | ❌ 없음 |
| Schedule | `src/app/coach/schedule/page.tsx` L31~42 | `coaches.user_id == user.id` → session_coaches JOIN | ❌ 없음 |
| Members | `src/app/coach/members/page.tsx` | 코치 ID 기반 회원 조회 | ❌ 없음 |
| Race | `src/app/coach/race/page.tsx` | 코치 ID 기반 이벤트 조회 | ❌ 없음 |
| Profile | `src/app/coach/profile/page.tsx` L40~50 | `coaches.user_id == user.id` | ❌ 없음 |

### 6.2 예외 케이스 처리 (선택 개선)

Coach App에서 `coaches.user_id == user.id` 조회 결과가 없는 경우의 UX를 개선해야 한다:

```
현재: 빈 화면 (아무 메시지 없음)
개선: "코치 계정이 연결되지 않았습니다. 관리자에게 문의하세요." 안내 메시지
```

이 개선은 코치가 Coach App에 접근했지만 아직 Admin에서 계정 연결이 안 된 경우를 대비한다.

---

## 7. 보안 고려사항

### 7.1 권한 에스컬레이션 방지

| 위협 | 대응 |
|---|---|
| 사용자가 직접 `profiles.role`을 `'coach'`로 변경 | RLS: `profiles.role` UPDATE는 admin만 허용 |
| 사용자가 `coaches.user_id`를 자신의 ID로 설정 | RLS: `coaches` INSERT/UPDATE는 admin만 허용 |
| 비활성 코치가 계속 Coach App 접근 | AuthGuard에서 `coaches.status == 'active'` 추가 검증 (선택) |

### 7.2 감사(Audit) 추적

모든 역할 변경은 `audit_logs`에 기록된다:
- `PROMOTE_TO_COACH`: 누가 누구를 코치로 승격했는지
- `DEMOTE_FROM_COACH`: 누가 누구의 코치 권한을 해제했는지

---

## 8. 구현 단계 및 에이전트 배분

### Phase 1: DB 스키마 변경 (💎 Senior Dev)

| # | 작업 | 예상 소요 |
|---|---|---|
| 1-1 | `coaches` 테이블 확장 마이그레이션 (linked_at, linked_by, UNIQUE 제약) | 15분 |
| 1-2 | `promote_to_coach`, `demote_from_coach` DB 함수 생성 | 20분 |
| 1-3 | RLS 정책 보강 (코치 본인 조회, Admin CRUD) | 15분 |
| 1-4 | `.docs/database-reference.md` 업데이트 | 10분 |

### Phase 2: Admin 코치 관리 UI 변경 (🎨 UI Developer)

| # | 작업 | 예상 소요 |
|---|---|---|
| 2-1 | 회원 검색 컴포넌트 구현 (profiles 검색 + 결과 드롭다운) | 30분 |
| 2-2 | 코치 등록 모달 레이아웃 변경 (Step 1 + Step 2) | 40분 |
| 2-3 | 코치 카드에 계정 연결 상태 배지 추가 | 15분 |
| 2-4 | 코치 편집 모달 (연결된 회원 읽기 전용 표시) | 15분 |

### Phase 3: Admin 코치 저장/삭제 로직 변경 (💻 Developer)

| # | 작업 | 예상 소요 |
|---|---|---|
| 3-1 | `saveCoach()` 함수 리팩토링 (회원 선택 기반 + RPC 호출) | 20분 |
| 3-2 | `deleteCoach()` 함수 수정 (역할 복원 로직 추가) | 10분 |
| 3-3 | 기존 미연결 코치 데이터 처리 방안 (레거시 호환) | 15분 |

### Phase 4: Coach App 예외 처리 (💻 Developer)

| # | 작업 | 예상 소요 |
|---|---|---|
| 4-1 | Coach App 공통 레이아웃에 "미연결 코치" 안내 메시지 추가 | 15분 |
| 4-2 | Coach App 5개 화면 통합 테스트 (연결된 계정으로 데이터 조회 확인) | 20분 |

### Phase 5: 문서 동기화 (🏛️ Architect)

| # | 작업 | 예상 소요 |
|---|---|---|
| 5-1 | `.docs/sitemap/coach-app.md` 업데이트 (온보딩 흐름 추가) | 10분 |
| 5-2 | `.docs/sitemap/admin/03-operations.md` 업데이트 (코치 등록 흐름 반영) | 10분 |
| 5-3 | `.docs/project-blueprint.md` Next Steps에 작업 항목 추가 | 5분 |

---

## 9. 에이전트별 작업 요약 (블루프린트 반영용)

```
#### 🟠 Priority X: 코치 계정 아키텍처 강화 (NEW)
> 기획서: `.docs/planning/coach-account-architecture.md`

  - [ ] Phase 1: DB 스키마 변경 → 💎 **Senior Dev (Opus)**
    - [ ] coaches 테이블 확장 마이그레이션
    - [ ] promote/demote DB 함수 생성
    - [ ] RLS 정책 보강
    - [ ] database-reference.md 갱신

  - [ ] Phase 2: Admin 코치 관리 UI 변경 → 🎨 **UI Developer (Gemini)**
    - [ ] 회원 검색 컴포넌트 구현
    - [ ] 코치 등록 모달 레이아웃 변경
    - [ ] 코치 카드 연결 상태 배지 추가
    - [ ] 코치 편집 모달 수정

  - [ ] Phase 3: Admin 저장/삭제 로직 변경 → 💻 **Developer (Sonnet)**
    - [ ] saveCoach() 리팩토링
    - [ ] deleteCoach() 역할 복원 추가
    - [ ] 레거시 미연결 코치 호환 처리

  - [ ] Phase 4: Coach App 예외 처리 → 💻 **Developer (Sonnet)**
    - [ ] 미연결 코치 안내 메시지
    - [ ] 5개 화면 통합 테스트

  - [ ] Phase 5: 문서 동기화 → 🏛️ **Architect (Opus)**
    - [ ] sitemap 갱신
    - [ ] blueprint 반영
```

---

## 10. 레거시 데이터 호환 전략

현재 `coaches` 테이블에 이미 `user_id = NULL`인 레코드가 존재할 수 있다.

### 호환 방안
| 상황 | 처리 |
|---|---|
| 기존 `user_id = NULL` 코치 | "⚠️ 계정 미연결" 배지 표시, 수정 모달에서 회원 연결 유도 |
| 신규 코치 등록 | 반드시 회원 선택 필수 (`user_id` NOT NULL) |
| 기존 코치 편집 | 미연결 상태면 회원 연결 섹션 표시, 연결됨이면 읽기 전용 |

> **참고**: DB 레벨에서 `user_id NOT NULL` 제약을 즉시 추가하지 않는다.
> 기존 데이터 무결성 유지를 위해, **UI 레벨에서만 필수 검증**을 수행한다.
> 모든 기존 코치가 계정 연결 완료된 후, 향후 마이그레이션으로 NOT NULL 제약 추가를 고려한다.

---

## 11. 테스트 시나리오

### 11.1 정상 흐름

| # | 시나리오 | 기대 결과 |
|---|---|---|
| T1 | Admin이 기존 회원을 검색하여 코치로 등록 | coaches 레코드 생성 + profiles.role = 'coach' |
| T2 | 등록된 코치가 Coach App에 로그인 | Dashboard에 본인 수업 데이터 표시 |
| T3 | Admin이 코치를 삭제 | coaches 삭제 + profiles.role = 'member' 복원 |
| T4 | 삭제된 코치가 Coach App 접근 시도 | AuthGuard에서 '/apps/dashboard'로 리다이렉트 |

### 11.2 예외 흐름

| # | 시나리오 | 기대 결과 |
|---|---|---|
| T5 | 이미 코치인 회원을 다시 코치로 등록 시도 | 검색 결과에서 제외 (또는 에러 메시지) |
| T6 | 미연결 기존 코치의 편집 모달 | 회원 연결 섹션 표시 (연결 유도) |
| T7 | 연결된 코치의 회원 계정이 삭제된 경우 | coaches.user_id FK 에러 방지 (CASCADE 또는 SET NULL) |
| T8 | Admin이 아닌 사용자가 promote_to_coach RPC 호출 | 'Unauthorized' 에러 |

---

## 12. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|---|---|---|
| 기존 미연결 코치 데이터 손실 | 코치 전문 정보(specialties, bio) 유실 가능 | user_id NULL 허용 유지, UI에서만 필수 검증 |
| profiles.role 변경 실패 시 불일치 | coaches는 생성됐지만 role 미변경 | 트랜잭션 처리 (DB 함수 내에서 원자적 수행) |
| 동시 Admin 접근 시 충돌 | 같은 회원을 동시에 코치로 등록 | coaches.user_id UNIQUE 제약으로 방지 |
| Coach App에서 비활성 코치 접근 | 비활성 코치가 계속 데이터 접근 | AuthGuard 또는 Coach Layout에서 status 검증 추가 |

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 2월 18일  
**승인**: 아키텍트 검토 완료, 개발 대기 상태
