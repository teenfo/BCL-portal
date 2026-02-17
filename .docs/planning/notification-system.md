# BCL Portal – 알림 시스템 종합 기획서

> **Status**: Draft (기획 검토 중)  
> **Author**: Agent  
> **Date**: 2026-02-17  
> **Related**: `.docs/sitemap/admin/04-crm.md` § 스마트 알림 센터

---

## 1. 개요 및 배경

### 1.1 목적
BCL Portal 회원에게 **수업 리마인더**, **빈자리 알림**, **프로모션/공지** 등을 
실시간으로 전달하는 통합 알림 시스템을 설계한다.

### 1.2 핵심 제약 조건
| 항목 | 내용 |
|---|---|
| **플랫폼** | 웹 애플리케이션 (네이티브 앱 아님) |
| **iOS 비율** | 높음 – iOS Web Push는 PWA 설치(홈 화면 추가) 필수 |
| **기술 스택** | Next.js CSR + Supabase (DB, Auth, Edge Functions, Realtime) |
| **자동 발송** | 조건 기반 자동 알림 규칙 필요 |

### 1.3 iOS 제약 요약
```
iOS Web Push = Safari 16.4+ && PWA로 홈 화면에 추가 필수
→ 일반 브라우저 탭에서는 Push 불가
→ 따라서 In-App 알림이 반드시 1차 채널이어야 함
```

---

## 2. 알림 채널 전략 (Priority Order)

iOS 비율이 높은 환경에서의 채널 우선순위:

```
┌─────────────────────────────────────────────────────┐
│  채널 1 (필수)  │  In-App 알림 + Supabase Realtime   │
│                 │  → 100% 도달 (앱 접속 시)           │
│                 │  → iOS/Android 모두 즉시 동작       │
├─────────────────────────────────────────────────────┤
│  채널 2 (권장)  │  Web Push (PWA)                     │
│                 │  → 백그라운드 알림 가능              │
│                 │  → iOS는 PWA 설치 유도 필요          │
│                 │  → Android는 브라우저에서도 동작     │
├─────────────────────────────────────────────────────┤
│  채널 3 (선택)  │  카카오 알림톡 / SMS                 │
│                 │  → 결제/멤버십 만료 등 중요 알림     │
│                 │  → 유료 (건당 과금)                  │
│                 │  → iOS 제약 없음                     │
└─────────────────────────────────────────────────────┘
```

---

## 3. 알림 유형 정의

### 3.1 수업 리마인더
| 속성 | 값 |
|---|---|
| **트리거** | 자동 (예약된 수업 N시간 전) |
| **대상** | 해당 수업 예약자 |
| **채널** | In-App + Web Push |
| **예시** | "오늘 18:00 CrossFit A 수업이 1시간 후 시작됩니다" |
| **자동 규칙** | `bookings.status = 'confirmed'` AND `sessions.start_time - NOW() = 1h` |

### 3.2 빈자리 알림 (Waitlist → 빈자리 발생)
| 속성 | 값 |
|---|---|
| **트리거** | 자동 (기존 예약자 취소 시) |
| **대상** | 대기열(waitlist) 등록자 |
| **채널** | In-App + Web Push (즉시성 중요) |
| **예시** | "2/18(화) 19:00 CrossFit B에 빈자리가 생겼습니다! 지금 예약하세요" |
| **자동 규칙** | `bookings.status` changed to `'cancelled'` AND `waitlist_count > 0` |
| **액션** | 알림 탭 → 예약 페이지로 딥링크 |

### 3.3 프로모션 / 이벤트
| 속성 | 값 |
|---|---|
| **트리거** | 수동 (Admin에서 발송) |
| **대상** | 전체 회원 / 필터링 그룹 |
| **채널** | In-App (+ 선택적으로 Push) |
| **예시** | "🎉 2월 한정! 3개월 등록 시 20% 할인" |

### 3.4 멤버십 만료 경고
| 속성 | 값 |
|---|---|
| **트리거** | 자동 (만료 D-7, D-3, D-1) |
| **대상** | 해당 회원 |
| **채널** | In-App + Web Push + (선택) 카카오 알림톡 |
| **예시** | "회원권이 3일 후 만료됩니다. 갱신하시겠습니까?" |
| **자동 규칙** | `memberships.end_date - CURRENT_DATE IN (7, 3, 1)` |

### 3.5 체크인 / 운동 기록 관련
| 속성 | 값 |
|---|---|
| **트리거** | 자동 (체크인 완료 후) |
| **대상** | 본인 |
| **채널** | In-App |
| **예시** | "오늘 체크인 완료! 이번 달 12회째 출석입니다 🔥" |

### 3.6 시스템 알림
| 속성 | 값 |
|---|---|
| **트리거** | 자동/수동 |
| **대상** | 전체 또는 개인 |
| **채널** | In-App |
| **예시** | "내일 시스템 점검으로 23:00~01:00 접속이 제한됩니다" |

---

## 4. 시스템 아키텍처

### 4.1 전체 플로우
```
 [Admin Portal]                    [자동 규칙 엔진]
      │                                  │
      │ 수동 알림 작성                    │ pg_cron / DB Trigger
      ▼                                  ▼
 ┌─────────────────────────────────────────────┐
 │          notifications 테이블 (INSERT)       │
 │          notification_rules 테이블 (설정)    │
 └──────────────────┬──────────────────────────┘
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
    [In-App]    [Push]    [외부 채널]
       │          │          │
       │ Supabase │ Edge     │ Edge Function
       │ Realtime │ Function │ (알림톡 API)
       │          │          │
       ▼          ▼          ▼
  ┌──────────────────────────────────┐
  │        사용자 디바이스            │
  │  - 앱 내 알림 센터 (UI)          │
  │  - Service Worker (Push)         │
  │  - 카카오톡/SMS (외부)           │
  └──────────────────────────────────┘
```

### 4.2 구성 요소 상세

| 구성 요소 | 기술 | 설명 |
|---|---|---|
| **알림 저장소** | Supabase `notifications` 테이블 | 모든 알림의 Single Source of Truth |
| **실시간 전달** | Supabase Realtime (Postgres Changes) | 앱 열려있는 동안 실시간 수신 |
| **백그라운드 Push** | Service Worker + VAPID + Edge Function | 앱 닫혀있어도 알림 수신 |
| **자동 규칙 실행** | Supabase pg_cron + DB Function | 스케줄 기반 자동 알림 생성 |
| **이벤트 트리거** | Supabase DB Trigger + Edge Function | 데이터 변경 시 즉시 알림 (빈자리 등) |
| **구독 관리** | `push_subscriptions` 테이블 | 디바이스별 Push 엔드포인트 저장 |
| **외부 채널** | Edge Function → 카카오 알림톡 API | 중요 알림 추가 채널 |

---

## 5. 데이터베이스 스키마 확장

### 5.1 현재 `notifications` 테이블
```sql
-- 현재 구조 (매우 단순)
notifications (
  id          UUID PK,
  user_id     UUID FK → auth.users,    -- null이면 의미 불명확
  title       VARCHAR(200) NOT NULL,
  content     TEXT,                      -- 'message' 아님 주의
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

### 5.2 확장 스키마 제안

#### A) `notifications` 테이블 확장
```sql
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  -- 알림 분류
  category VARCHAR(30) DEFAULT 'general'
    CHECK (category IN (
      'class_reminder',    -- 수업 리마인더
      'waitlist_vacancy',  -- 빈자리 알림
      'membership_expiry', -- 멤버십 만료
      'promotion',         -- 프로모션
      'checkin',           -- 체크인
      'system',            -- 시스템
      'general'            -- 일반
    ));

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  type VARCHAR(20) DEFAULT 'info'
    CHECK (type IN ('info', 'warning', 'success', 'error', 'promotion'));

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  channel VARCHAR(20) DEFAULT 'in_app'
    CHECK (channel IN ('in_app', 'push', 'sms', 'kakao', 'email'));

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  action_url TEXT;              -- 딥링크 (예: /apps/schedule?session=xxx)

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS  
  action_label VARCHAR(50);     -- CTA 텍스트 (예: "지금 예약하기")

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  metadata JSONB DEFAULT '{}';  -- 확장 데이터 (session_id, membership_id 등)

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  sent_via VARCHAR(20)[];       -- 실제 발송된 채널 배열

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  scheduled_at TIMESTAMPTZ;     -- 예약 발송 시각 (NULL = 즉시)

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  sent_at TIMESTAMPTZ;          -- 실제 발송 시각

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  expires_at TIMESTAMPTZ;       -- 만료 시각 (지나면 표시 안 함)

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  rule_id UUID;                 -- 자동 규칙으로 생성된 경우, 규칙 참조

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS
  member_id UUID REFERENCES public.members(id);  -- members 테이블 참조
```

#### B) `notification_rules` 테이블 (신규)
```sql
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(100) NOT NULL,        -- "수업 1시간 전 알림"
  description     TEXT,
  
  -- 트리거 조건
  trigger_type    VARCHAR(30) NOT NULL
    CHECK (trigger_type IN (
      'time_before_session',    -- 수업 N분 전
      'booking_cancelled',      -- 예약 취소 시 (빈자리)
      'membership_expiry_dday', -- 만료 D-N
      'checkin_completed',      -- 체크인 완료
      'cron_schedule'           -- 커스텀 크론
    )),
  
  trigger_config  JSONB NOT NULL DEFAULT '{}',
  -- 예시:
  -- time_before_session:    {"minutes_before": 60}
  -- membership_expiry_dday: {"days_before": [7, 3, 1]}
  -- cron_schedule:          {"cron": "0 9 * * MON"}
  
  -- 알림 템플릿
  title_template   VARCHAR(200) NOT NULL,  -- "{{session_title}} 수업이 {{minutes}}분 후 시작"
  message_template TEXT NOT NULL,
  category         VARCHAR(30) NOT NULL,
  
  -- 발송 채널
  channels         VARCHAR(20)[] NOT NULL DEFAULT ARRAY['in_app'],
  
  -- 활성화
  is_active        BOOLEAN DEFAULT true,
  facility_id      UUID REFERENCES public.facilities(id),  -- NULL = 전체 지점
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.notification_rules IS '자동 알림 규칙 테이블';
```

#### C) `push_subscriptions` 테이블 (신규 – Web Push용)
```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id    UUID REFERENCES public.members(id) ON DELETE CASCADE,
  
  -- Web Push 구독 정보
  endpoint     TEXT NOT NULL,       -- Push Service URL
  p256dh_key   TEXT NOT NULL,       -- Public encryption key
  auth_key     TEXT NOT NULL,       -- Authentication secret
  
  -- 디바이스 정보
  device_type  VARCHAR(20),         -- 'ios_pwa', 'android_chrome', 'desktop', etc.
  user_agent   TEXT,
  
  -- 활성 상태
  is_active    BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  
  -- 한 사용자의 같은 endpoint 중복 방지
  UNIQUE(user_id, endpoint)
);

COMMENT ON TABLE public.push_subscriptions IS 'Web Push 구독 정보 테이블';
CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id, is_active);
```

#### D) `notification_preferences` 테이블 (신규 – 사용자 설정)
```sql
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  member_id    UUID REFERENCES public.members(id) ON DELETE CASCADE,
  
  -- 카테고리별 수신 설정
  class_reminder    BOOLEAN DEFAULT true,
  waitlist_vacancy  BOOLEAN DEFAULT true,
  membership_expiry BOOLEAN DEFAULT true,
  promotion         BOOLEAN DEFAULT true,  -- 마케팅 수신 동의
  checkin           BOOLEAN DEFAULT true,
  system            BOOLEAN DEFAULT true,
  
  -- 채널별 허용
  push_enabled      BOOLEAN DEFAULT true,
  kakao_enabled     BOOLEAN DEFAULT false,
  sms_enabled       BOOLEAN DEFAULT false,
  email_enabled     BOOLEAN DEFAULT false,
  
  -- 방해 금지 시간
  quiet_hours_start TIME,    -- 예: 22:00
  quiet_hours_end   TIME,    -- 예: 07:00
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.notification_preferences IS '사용자 알림 수신 설정 테이블';
```

---

## 6. 자동 알림 규칙 엔진

### 6.1 시간 기반 자동 알림 (pg_cron)

```
┌─────────────────────────────────────────────┐
│  pg_cron (매 10분마다 실행)                  │
│                                              │
│  1. notification_rules에서 활성 규칙 조회    │
│  2. 트리거 조건에 해당하는 대상자 추출       │
│  3. notifications 테이블에 INSERT            │
│  4. 채널이 push/kakao면 Edge Function 호출   │
└─────────────────────────────────────────────┘
```

#### 수업 리마인더 크론 함수 예시
```sql
-- 예약된 수업 시작 1시간 전에 알림 생성
CREATE OR REPLACE FUNCTION public.fn_class_reminder_cron()
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT 
      b.member_id,
      m.user_id,
      s.title as session_title,
      s.session_date,
      s.start_time,
      s.id as session_id
    FROM public.bookings b
    JOIN public.members m ON m.id = b.member_id
    JOIN public.sessions s ON s.id = b.session_id
    WHERE b.status = 'confirmed'
      AND s.status = 'scheduled'
      AND (s.session_date + s.start_time) 
          BETWEEN NOW() + INTERVAL '55 minutes' 
              AND NOW() + INTERVAL '65 minutes'
      -- 이미 같은 세션에 대해 리마인더를 보냈는지 체크
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = m.user_id
          AND n.category = 'class_reminder'
          AND n.metadata->>'session_id' = s.id::text
      )
  LOOP
    INSERT INTO public.notifications (
      user_id, member_id, title, content, 
      category, type, action_url, metadata
    ) VALUES (
      r.user_id, r.member_id,
      r.session_title || ' 수업 알림',
      '오늘 ' || to_char(r.start_time, 'HH24:MI') || ' 수업이 곧 시작됩니다. 준비하세요!',
      'class_reminder', 'info',
      '/apps/schedule',
      jsonb_build_object('session_id', r.session_id)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 이벤트 기반 자동 알림 (DB Trigger)

#### 빈자리 알림 트리거
```sql
-- 예약 취소 시 → 대기열 회원에게 빈자리 알림
CREATE OR REPLACE FUNCTION public.fn_notify_waitlist_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
  waitlist_member RECORD;
  session_record RECORD;
BEGIN
  -- 예약 취소(confirmed → cancelled)인 경우만
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    
    SELECT * INTO session_record 
    FROM public.sessions WHERE id = NEW.session_id;
    
    -- 해당 수업의 대기열 회원들에게 알림
    FOR waitlist_member IN
      SELECT b.member_id, m.user_id
      FROM public.bookings b
      JOIN public.members m ON m.id = b.member_id
      WHERE b.session_id = NEW.session_id
        AND b.status = 'waitlist'
      ORDER BY b.created_at ASC
      LIMIT 3  -- 상위 3명에게만
    LOOP
      INSERT INTO public.notifications (
        user_id, member_id, title, content,
        category, type, action_url, action_label, metadata
      ) VALUES (
        waitlist_member.user_id, waitlist_member.member_id,
        '빈자리 발생! 🎉',
        session_record.title || ' (' || 
          to_char(session_record.session_date, 'MM/DD') || ' ' ||
          to_char(session_record.start_time, 'HH24:MI') || ')에 빈자리가 생겼습니다!',
        'waitlist_vacancy', 'success',
        '/apps/schedule?session=' || NEW.session_id,
        '지금 예약하기',
        jsonb_build_object('session_id', NEW.session_id)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_waitlist_on_cancel
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_waitlist_on_cancel();
```

---

## 7. 채널별 구현 상세

### 7.1 채널 1: In-App 알림 센터

#### 사용자 앱 UI 위치
- **User App Home** (`/apps/dashboard`): 헤더에 🔔 벨 아이콘 + 미읽음 배지
- **알림 센터** (`/apps/notifications`): 전체 알림 목록 (카테고리별 필터)
- **Supabase Realtime**: 앱이 열려있으면 새 알림 즉시 표시 (토스트)

#### Realtime 연동 코드 (개념)
```typescript
// hooks/useNotifications.ts
const channel = supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // 새 알림 도착 → 토스트 표시 + 배지 업데이트
    showToast(payload.new);
    incrementUnreadCount();
  })
  .subscribe();
```

### 7.2 채널 2: Web Push (PWA)

#### 전제 조건
1. HTTPS (production 환경)
2. `manifest.json` (PWA 매니페스트)
3. Service Worker (`sw.js`)
4. VAPID 키 쌍 생성
5. 사용자 알림 허가 요청

#### iOS PWA 설치 유도 전략
```
┌─────────────────────────────────────────────┐
│  iOS 사용자 감지 시:                         │
│                                              │
│  1. 앱 최초 접속 시 설치 가이드 배너 표시    │
│     "홈 화면에 추가하면 푸시 알림을 받을 수  │
│      있어요!"                                │
│  2. 프로필 > 설정에서 PWA 설치 안내          │
│  3. 설치 후 알림 권한 요청                   │
│                                              │
│  미설치 시에도 In-App 알림은 정상 동작       │
└─────────────────────────────────────────────┘
```

#### Edge Function: Push 발송
```typescript
// supabase/functions/send-push/index.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@bcl-portal.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

Deno.serve(async (req) => {
  const { notification_id } = await req.json();
  
  // 1. 알림 내용 조회
  const notification = await supabase
    .from('notifications')
    .select('*')
    .eq('id', notification_id)
    .single();
  
  // 2. 해당 사용자의 Push 구독 정보 조회  
  const subscriptions = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', notification.user_id)
    .eq('is_active', true);
  
  // 3. 각 디바이스에 Push 발송
  for (const sub of subscriptions) {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
      JSON.stringify({
        title: notification.title,
        body: notification.content,
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        data: { url: notification.action_url },
      })
    );
  }
});
```

### 7.3 채널 3: 카카오 알림톡 (Phase 3, 선택)

> 별도 사업자 인증 및 카카오 비즈메시지 계정 필요.
> 멤버십 만료 경고, 결제 관련 알림 등 **중요도 높은 알림**에만 사용.
> 건당 비용 발생 (약 15~20원/건).

---

## 8. 사용자 앱 화면 변경사항

### 8.1 신규 화면: 알림 센터 (`/apps/notifications`)
| 요소 | 설명 |
|---|---|
| 알림 목록 | 카테고리 아이콘 + 제목 + 시간 + 읽음 상태 |
| 카테고리 필터 | 전체 / 수업 / 멤버십 / 프로모션 / 시스템 |
| 딥링크 | 알림 탭 → action_url로 이동 |
| 전체 읽음 | "모두 읽음" 버튼 |
| 빈 상태 | "새로운 알림이 없습니다" 일러스트 |

### 8.2 기존 화면 변경
| 화면 | 변경사항 |
|---|---|
| **Home** (`/apps/dashboard`) | 헤더에 🔔 아이콘 + 미읽음 배지 카운트 |
| **Profile** (`/apps/profile`) | 알림 설정 (카테고리별 on/off, Push 허가) |
| **Schedule** (`/apps/schedule`) | 대기열 등록 시 "빈자리 알림 받기" 토글 |

### 8.3 전체 앱 레벨 변경
| 항목 | 설명 |
|---|---|
| **Service Worker** | `public/sw.js` 등록 (Push 수신 + 캐시) |
| **PWA manifest** | `public/manifest.json` (홈 화면 추가용) |
| **iOS 설치 배너** | standalone 미감지 시 안내 배너 표시 |
| **알림 토스트** | 앱 사용 중 새 알림 도착 시 상단 토스트 표시 |

---

## 9. Admin 화면 변경사항

### 9.1 스마트 알림 센터 확장 (`/admin/crm/notifications`)

현재 기본 CRUD만 있는 화면을 **탭 구조**로 확장:

| 탭 | 기능 |
|---|---|
| **발송 내역** | 기존 알림 목록 + 상태/읽음률 통계 |
| **알림 작성** | 수동 알림 작성 (대상 필터링 + 예약 발송) |
| **자동 규칙** | notification_rules 관리 (활성/비활성, 규칙 편집) |
| **Push 통계** | PWA 설치율, Push 구독률, 채널별 도달률 |

---

## 10. 구현 로드맵

### Phase 1: In-App 알림 인프라 (1~2주)
```
✅ notifications 테이블 스키마 확장
✅ notification_preferences 테이블 생성
✅ 사용자 앱 알림 센터 UI (/apps/notifications)
✅ Home 헤더에 벨 아이콘 + 배지
✅ Supabase Realtime 연동 (실시간 알림 수신)
✅ 알림 토스트 컴포넌트
✅ Profile > 알림 설정 화면
```

### Phase 2: 자동 규칙 엔진 (1~2주)
```
✅ notification_rules 테이블 생성
✅ pg_cron 수업 리마인더 함수
✅ 빈자리 알림 DB Trigger  
✅ 멤버십 만료 경고 크론
✅ Admin 자동 규칙 관리 UI
✅ Admin 알림 발송 대상 필터링 강화
```

### Phase 3: Web Push + PWA (1~2주)
```
✅ PWA manifest.json 설정
✅ Service Worker 등록
✅ VAPID 키 생성 및 환경변수 설정
✅ push_subscriptions 테이블 생성
✅ 알림 허가 요청 + 구독 저장 로직
✅ Edge Function: push 발송
✅ iOS PWA 설치 유도 배너
✅ Push 도달률 통계
```

### Phase 4: 외부 채널 연동 (추후)
```
☐ 카카오 알림톡 연동
☐ SMS 연동
☐ 이메일 알림 연동
```

---

## 11. 기술 결정 사항 (요 검토)

| 항목 | 옵션 A | 옵션 B | 추천 |
|---|---|---|---|
| **Push 라이브러리** | `web-push` (Node/Deno) | Firebase Cloud Messaging | **web-push** (직접 제어, 벤더 독립) |
| **자동 알림 실행** | pg_cron (DB 내부) | Edge Function cron (외부) | **pg_cron** (Supabase 내장, 인프라 단순) |
| **빈자리 알림** | DB Trigger (즉시) | 크론 (폴링) | **DB Trigger** (실시간성 중요) |
| **알림 템플릿** | DB에 저장 (동적) | 코드에 하드코딩 | **DB** (Admin에서 편집 가능) |
| **PWA 프레임워크** | next-pwa | 수동 설정 | **수동 설정** (Next.js 14+와 호환 확실) |

---

## 12. 보안 및 RLS 고려

```sql
-- notifications: 본인 알림만 조회 가능
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- notifications: 읽음 상태만 본인이 변경 가능  
CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- push_subscriptions: 본인 구독만 관리
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- notification_preferences: 본인 설정만 관리
CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- notification_rules: Admin만 관리
CREATE POLICY "Admins manage notification rules"
  ON public.notification_rules FOR ALL
  USING (public.is_admin(auth.uid()));
```

---

## 13. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|---|---|---|
| iOS 사용자 PWA 미설치 | Push 미도달 | In-App 알림 1차 채널 보장 + 설치 유도 UX |
| Push 허가 거부 | Push 미도달 | 앱 내 알림 센터는 항상 동작, 적절한 시점에 재요청 |
| pg_cron 실행 지연 | 리마인더 늦게 발송 | 10분 간격 + 여유 시간 포함 (55~65분 전 범위) |
| 대량 발송 시 Edge Function 제한 | 전송 실패 | 배치 처리 + 재시도 로직 + Rate Limiting |
| Push 구독 만료 | 전송 실패 | is_active 플래그 + 실패 시 비활성화 |
