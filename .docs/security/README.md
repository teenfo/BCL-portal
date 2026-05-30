# BCL Portal Security Architecture

이 문서는 BCL Portal의 보안 통제를 **실제 저장소 구현 상태 기준**으로 정리합니다.
각 항목은 다음 3단계로 분류되어 있습니다.

- ✅ **적용 완료 (Implemented)**: 코드/설정에서 실제 동작이 확인되는 통제
- 🟡 **부분 적용 (Partial)**: 일부만 적용되어 있거나 운영 환경에 따라 효과가 달라지는 통제
- ⏳ **향후 계획 (Planned)**: 권장 사항이지만 현재 저장소에서는 구현되지 않은 통제

> **마지막 정렬일**: 2026-04-25
> **기준 감사**: `.docs/archive/audit/audit-pm-gap-analysis-20260419.md` §3.4

---

## 📋 목차
- [보안 통제 요약](#보안-통제-요약)
- [인증 시스템](#인증-시스템)
- [인가 및 권한 관리](#인가-및-권한-관리)
- [네트워크 / 트랜스포트 보안](#네트워크--트랜스포트-보안)
- [애플리케이션 보안](#애플리케이션-보안)
- [데이터 보안](#데이터-보안)
- [보안 사고 대응](#보안-사고-대응)
- [규정 준수](#규정-준수)

---

## 보안 통제 요약

| 영역 | 통제 | 상태 | 근거 / 책임 위치 |
|------|------|------|-----------------|
| 인증 | Supabase Auth (JWT) | ✅ | `src/contexts/AuthContext.tsx`, `src/lib/supabase/middleware.ts` |
| 인증 | 비공개 경로 강제 리다이렉트 | ✅ | `src/proxy.ts`, `src/lib/supabase/middleware.ts:60-66` |
| 인증 | 비밀번호 정책 (Supabase 기본 — 8자 이상) | ✅ | Supabase Auth 설정 |
| 인증 | MFA (TOTP/SMS) | ⏳ | 미구현 |
| 인가 | RLS (모든 테이블) | ✅ | `.docs/database/rls-policies/`, `supabase/migrations/*` |
| 인가 | RBAC (admin / coach / member) | ✅ | `src/contexts/AuthContext.tsx`, RLS 정책 |
| 인가 | Service Role Key 클라이언트 격리 | ✅ | Race Python 서버 / Supabase Edge Function 한정 |
| 트랜스포트 | HTTPS / TLS 1.3 | 🟡 | 운영 환경 nginx + Let's Encrypt 별도 발급 (`nginx-host.conf`는 80/3000) |
| 트랜스포트 | 보안 헤더 (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy) | ✅ | [nginx-host.conf:7-10](../../nginx-host.conf#L7-L10) |
| 트랜스포트 | HSTS (Strict-Transport-Security) | 🟡 | 권장 — HTTPS 종료 후 적용 필요 |
| 트랜스포트 | Permissions-Policy / Cross-Origin-* 헤더 | ⏳ | 미구현 |
| 트랜스포트 | Server 토큰 숨김 (`server_tokens off`) | ⏳ | 미구현 |
| 트랜스포트 | 업로드 크기 제한 (10MB) | ✅ | [nginx-host.conf:13](../../nginx-host.conf#L13) |
| 트랜스포트 | Rate Limiting (Nginx `limit_req_zone`) | ⏳ | 미구현 — 향후 nginx 설정 보강 필요 |
| 트랜스포트 | DDoS 방어 (Fail2ban) | ⏳ | 운영 서버 설정 별도 |
| 애플리케이션 | CSP (Content-Security-Policy) | ⏳ | 미구현 — Next.js `headers()` 또는 nginx에서 설정 가능 |
| 애플리케이션 | CSRF 방어 (커스텀 토큰) | ⏳ | App Router CSR + Supabase JWT 사용 — 명시적 CSRF 토큰 없음 |
| 애플리케이션 | 애플리케이션 레벨 Rate Limiting | ⏳ | 미구현 |
| 애플리케이션 | XSS 방어 (React 기본 + `dangerouslySetInnerHTML` 미사용) | ✅ | `grep dangerouslySetInnerHTML` 결과 0건 |
| 애플리케이션 | SQL Injection 방어 (Supabase SDK 파라미터화) | ✅ | `src/lib/supabase/query.ts` 헬퍼 사용 |
| 데이터 | DB 암호화 at rest (Supabase) | ✅ | Supabase 기본 |
| 데이터 | 결제 카드 정보 비저장 (PG 토큰만) | ✅ | `transactions` 테이블 스키마 |
| 데이터 | 백업/복구 절차 | 🟡 | Supabase 자동 백업 — 복구 리허설 미문서화 |
| 운영 | 의존성 자동 업데이트 (Dependabot 등) | ⏳ | 미구성 |
| 운영 | 보안 로그 모니터링 | ⏳ | 미구성 |

---

## 인증 시스템

### ✅ Supabase Auth 통합

BCL Portal은 Supabase Auth를 사용하여 모든 사용자 인증을 처리합니다.

#### 인증 흐름
```
1. 사용자 로그인 요청 (이메일/비밀번호 또는 OAuth)
2. Supabase Auth 서버 검증
3. JWT (Access Token + Refresh Token) 발급
4. 클라이언트 쿠키에 저장 (httpOnly via Supabase SSR)
5. 모든 API 요청에 JWT 자동 첨부
6. middleware (`src/proxy.ts`)가 요청마다 토큰 갱신 + 인증 검증
```

#### 비공개 경로 보호
- 구현: `src/lib/supabase/middleware.ts`
- 공개 경로: `/`, `/auth/*`, `/api/*`, `/kiosk/*`, `/class/*`
- 비공개 경로 비인증 접근 → `/auth/login?redirect=<원래경로>`로 리다이렉트

### ✅ 비밀번호 정책 (Supabase 기본)
- 최소 길이: 8자 (Supabase 프로젝트 설정)
- 저장: bcrypt 해시 (Supabase 기본 처리)
- 평문 저장 없음

### ⏳ 다중 인증 (MFA)
- 향후 계획: Supabase Auth의 MFA (TOTP) 활성화 가능
- 우선순위: 관리자 계정 우선 적용 권장

---

## 인가 및 권한 관리

### ✅ 역할 기반 접근 제어 (RBAC)

| 역할 | 권한 | 구현 위치 |
|------|------|-----------|
| Admin | 전체 데이터 접근/수정, 시스템 설정 | RLS 정책 + `AuthContext.role === 'admin'` |
| Coach | 자신의 수업 데이터, WOD 수정, 출석 체크 | RLS + 코치 전용 RPC |
| Member | 본인 프로필/예약/결제 | RLS (`auth.uid() = user_id`) |
| Guest | 공개 정보만 (지점, 요금제) | 미인증 anon 키 + RLS 공개 정책 |

### ✅ Row Level Security (RLS)
- 모든 테이블 RLS 활성화 (마이그레이션에서 강제)
- 클라이언트는 항상 `anon key` 사용
- 정책 상세: [.docs/database/rls-policies/](../database/rls-policies/)

#### 📌 P0 RLS 점검 결과 (2026-05-30, `20260530220000_p0_rls_hardening.sql`)
모든 admin/coach mutation 의 RLS 를 전수 점검했다. 결과 요약:

**적용된 하드닝 (2건)**
- `session_rotation_states` **쓰기**를 "배정 코치(`session_coaches`) 또는 관리자"로 제한.
  이전에는 임의 코치가 타인 세션의 로테이션 상태를 변경할 수 있었다. (P1-A `session_wods` 패턴 차용)
- `wod_templates` / `wod_template_movements` / `class_runbook_templates` 의 **DELETE 를 관리자 전용**으로 제한.
  코치의 SELECT/INSERT/UPDATE(WOD 저작)는 유지. 이전에는 코치가 모든 시설의 공유 벤치마크를 삭제 가능했다.

**의도된 설계로 확인되어 유지 (수정 금지)**
- `session_rotation_states` 의 **anon SELECT(`USING (true)`)** 는 버그가 아니다.
  `/class` 는 미인증 공용 경로이며, `class/rotation-hud` 가 로그인 없이 이 테이블을 직접 read + realtime 구독한다(체육관 TV HUD). RLS 는 realtime 에도 적용되므로 `TO authenticated` 로 바꾸면 HUD 가 동작 불능이 된다. → **SELECT 정책 변경 금지.**

**보류 (다중 시설 전환 시 재검토)**
- `race_live_state` / `race_recordings` / `race_teams` 의 coach 광범위 쓰기.
  앱(`coach/race/control`)이 이벤트를 facility/배정 필터 없이 전역 운영하고 `coaches.facility_id` 매핑이 부재하여, 스코핑 시 라이브 레이스가 깨진다. 단일 시설 배포에선 위협도 낮음. 다중 시설 도입 시 coach→facility 매핑 신설과 함께 진행.

**오탐으로 확인 (조치 불필요)**
- "admin_roles/admin_user_roles 권한상승", "pg_settings 결제키 브라우저 노출", "WITH CHECK 누락 = 쓰기 우회" 지적은 Postgres RLS 의미론상 안전하다. 역할 기반 대칭 정책에서 `WITH CHECK` 생략 시 `USING` 식이 INSERT/UPDATE 검증으로 자동 대체되며, 쓰기는 모두 `role='admin'`(또는 `is_admin()`)으로 막혀 있다. pg_settings 는 member-read 정책이 아예 없어 결제 시크릿을 멤버가 읽을 수 없다.

### ✅ Service Role Key 격리
- Service Role Key는 다음 두 곳에서만 사용:
  1. Race Python 서버 (`race/main.py` — Coach PC 내부 Docker)
  2. Supabase Edge Functions (`supabase/functions/*`)
- 브라우저 번들에 포함되지 않음 (Next.js 환경 변수 prefix `NEXT_PUBLIC_*` 미사용)

---

## 네트워크 / 트랜스포트 보안

### ✅ 적용된 보안 헤더 (Nginx)

`nginx-host.conf`에 다음 헤더가 설정되어 있습니다:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
client_max_body_size 10M;
```

### 🟡 HTTPS / TLS

- **현재 상태**: `nginx-host.conf`는 포트 80/3000만 listen. HTTPS 종료는 운영 환경의 별도 nginx 또는 Let's Encrypt 설정에 의존.
- **권장**: 운영 배포 시 443 포트 + Let's Encrypt 인증서 + HTTP→HTTPS 리다이렉트 설정.

### 🟡 HSTS (Strict-Transport-Security)
- HTTPS가 적용된 운영 환경에서 다음 헤더 추가 권장:
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  ```

### ⏳ 추가 권장 헤더 (미적용)

향후 적용 가능한 항목:

```nginx
# 권한 기능 제한 (카메라/마이크 등은 기능별 정책 필요)
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# 서버 정보 숨김
server_tokens off;

# Cross-Origin 격리 (필요 시 — Race WebSocket 영향 검토 필수)
# add_header Cross-Origin-Opener-Policy "same-origin" always;
# add_header Cross-Origin-Embedder-Policy "require-corp" always;
```

> ⚠️ **주의**: Race WebSocket과 Web Bluetooth는 Cross-Origin 헤더 영향을 받으므로 적용 전 통합 검증 필수.

### ⏳ Rate Limiting (Nginx)

- **현재 상태**: 미적용
- **권장 설정** (운영 적용 시):
  ```nginx
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
  limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;

  location /api/ {
      limit_req zone=api_limit burst=20 nodelay;
  }

  location /auth/ {
      limit_req zone=auth_limit burst=5 nodelay;
  }
  ```

### ⏳ Fail2ban (DDoS / Brute Force 방어)
- 운영 서버 OS 레벨 설정 — 본 저장소 범위 외

---

## 애플리케이션 보안

### ✅ XSS 방어
- React 기본 이스케이프 사용
- `dangerouslySetInnerHTML` 미사용 (저장소 grep 결과 0건)

### ✅ SQL Injection 방어
- Supabase SDK 파라미터화 쿼리 사용
- 신규 코드는 `src/lib/supabase/query.ts` 헬퍼를 통해 일관된 접근 강제

### ⏳ Content Security Policy (CSP)
- **현재 상태**: 미적용
- **이유**: Supabase Realtime, Web Bluetooth, 이미지 CDN 등 외부 origin이 많아 정책 설계 필요
- **권장 적용 방식**:
  - Next.js `next.config.mjs`의 `headers()` 또는 nginx `add_header Content-Security-Policy`
  - 점진적 적용: `Content-Security-Policy-Report-Only`로 우선 모니터링 후 강제 전환

### ⏳ CSRF 방어
- **현재 상태**: 명시적 CSRF 토큰 미구현
- **현재 보호 수단**: Supabase JWT를 Authorization 헤더로 사용 + SameSite 쿠키 기본값
- **권장 검토**: 향후 Server Action 도입 시 자동 CSRF 토큰 활용

### ⏳ 애플리케이션 레벨 Rate Limiting
- **현재 상태**: 미구현
- **권장**: 1차로 nginx 레벨에서 처리. App 레벨이 필요하면 Edge Function 또는 미들웨어에 별도 설계.

### ✅ Input Validation (모범 사례)
- 신규 폼 입력은 클라이언트 측 검증 후 Supabase RPC/RLS에서 2차 검증
- 권장: 복잡한 스키마는 Zod 사용 — 필요 시 도입

---

## 데이터 보안

### ✅ 암호화

| 구분 | 적용 |
|------|------|
| DB at rest | Supabase AES-256 (기본) |
| DB in transit | TLS (Supabase 연결) |
| Storage | Supabase Storage 암호화 |
| 백업 | Supabase 자동 백업 (암호화) |

### ✅ 결제 정보 비저장
- PG사 토큰만 `transactions.pg_transaction_id`에 저장
- 카드 번호, CVC 등 민감 결제 정보 저장 금지 (스키마에서 컬럼 자체가 없음)

### ✅ 비밀번호
- Supabase Auth가 bcrypt 해싱 처리
- 평문 저장 없음

### 🟡 백업 / 복구 리허설
- Supabase 자동 백업은 활성화되어 있으나, 복구 리허설 절차는 문서화되지 않음
- 향후 운영 체크리스트에 포함 권장

---

## 보안 사고 대응

### 의심 활동 탐지 (참고 쿼리)

```sql
-- 비정상 로그인 시도 확인 (Supabase Auth Audit Log)
SELECT user_id, COUNT(*) AS failed_attempts
FROM auth.audit_log_entries
WHERE action = 'login' AND result = 'failure'
  AND created_at > now() - interval '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 5;
```

### 침해 사고 발생 시 절차

1. **즉시 조치**
   - 해당 계정 비활성화 (Supabase Dashboard)
   - 세션 강제 종료 (`auth.refresh_tokens` 무효화)
   - 관련 로그 수집 (Supabase Audit + nginx access log)

2. **영향 범위 파악**
   - 접근한 데이터 식별 (RLS 정책 + 쿼리 로그)
   - 영향 받은 사용자 식별

3. **복구**
   - 패치 배포
   - 취약점 제거
   - 백업으로부터 복구 (필요 시)

4. **사후 조치**
   - 사용자 알림
   - 보안 정책 업데이트
   - 재발 방지 대책 수립 + 본 문서 갱신

---

## 규정 준수

### 한국 개인정보보호법
- ⏳ 개인정보 수집 동의 — 가입 화면에 명시적 동의 절차 필요 (검토 필요)
- ⏳ 제3자 제공 동의 (PG사 등) — 결제 흐름에서 명시 필요
- ⏳ 개인정보 보유 기간 명시 — 약관 문서 별도
- ⏳ 파기 절차 — RPC 함수 또는 운영 절차 정의 필요

### GDPR (해외 사용자 대상 시)
- ⏳ 사용자 동의 관리
- ⏳ 데이터 이동권 (Data Portability)
- ⏳ 삭제권 (Right to be Forgotten)
- ⏳ 데이터 최소화

> 본 항목들은 v1 출시 범위에서는 운영 정책 차원의 보강이 필요하며, 코드 통제와는 별개입니다.

---

## 보안 체크리스트 (출시 전)

### 코드 / 저장소 (✅ 자동 검증 가능)
- [x] 모든 테이블 RLS 활성화
- [x] Service Role Key 클라이언트 노출 없음
- [x] `dangerouslySetInnerHTML` 미사용
- [x] Supabase SDK 파라미터화 쿼리 사용
- [x] 환경 변수로 시크릿 관리

### 운영 환경 (🟡 배포 환경 의존)
- [ ] HTTPS 인증서 발급 + 강제 리다이렉트
- [ ] HSTS 헤더 적용
- [ ] Nginx Rate Limiting 설정
- [ ] `server_tokens off` 적용
- [ ] UFW 방화벽 설정
- [ ] Fail2ban 설정
- [ ] 백업 자동화 + 복구 리허설

### 정기 점검 (월/분기 단위)
- [ ] 의존성 보안 패치 (npm audit / Dependabot)
- [ ] Supabase Audit Log 검토
- [ ] 비정상 접근 패턴 검토
- [ ] 본 문서 ↔ 실제 구현 정합성 재검증

---

## 관련 문서

- [RLS 정책 가이드](../database/rls-policies/)
- [Nginx 설정 (host)](../../nginx-host.conf)
- [Supabase 미들웨어](../../src/lib/supabase/middleware.ts)
- [PM Gap Analysis (2026-04-19)](../archive/audit/audit-pm-gap-analysis-20260419.md)
- [Release Readiness 정비 기획서](../archive/planning/release-readiness-stabilization-task.md)

---

**문서 버전**: 2.0.0
**최종 업데이트**: 2026-04-25 (구현/계획 분리 정렬 — Priority 20 Phase 4)
**다음 검토일**: 2026-07-25 (분기 단위)
