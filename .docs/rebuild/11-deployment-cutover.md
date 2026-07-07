# 11. 배포 계획 — 재구축 로드맵 · 인프라 · 데이터 이관 · Cutover · CI/CD

> 근거: `_source/nonfunctional-history.md`(배포 as-is/포트 불일치), `docker-compose.yml`, `nginx-host.conf`, `deploy.sh`, `.github/workflows/*`
> 전제: 스택 현행 유지(Next.js + Supabase + Ubuntu 24.04 Docker 자체 서버). **to-be는 신규 Supabase 프로젝트 + 신규 코드베이스를 병행 구축 후 전환**한다.

---

## 1. 재구축 실행 로드맵 (5단계)

각 Phase의 **완료 기준 = 해당 수용 시나리오 전건 통과**(검증 에이전트 실행, 14 문서). 이전 Phase 미완료 시 다음 Phase 착수 금지(단, 화면 스캐폴딩 등 비의존 작업은 선행 가능).

### Phase 0 — 설계 승인 · 기반 준비
- 산출: rebuild 문서 세트 승인, 신규 저장소 구조(13 문서)·CLAUDE.md·디자인 토큰(12 문서) 확정, 신규 Supabase **staging/prod 2프로젝트** 생성
- 완료 기준: [ ] 07 스키마·계약(contract.md) 동결 [ ] CI 3워크플로우 골격 생성(빈 테스트라도 green) [ ] staging 인프라 기동(§2)

### Phase 1 — Supabase 스키마 + Auth
- 산출: `sql/00~09` DDL 적용(RLS·RPC·트리거·cron 포함), Auth 파이프라인(로그인/가입/승인 워크플로우/역할 리다이렉트 — 01 문서 인증 계약)
- 완료 기준(수용 시나리오):
  - [ ] DDL 전체가 신규 프로젝트에 순서대로 무오류 적용, `supabase migration list` 원격=로컬 일치
  - [ ] 시드 3계정(admin/coach/member)으로 로그인→역할별 진입→새로고침 유지→로그아웃 (Playwright @auth-smoke green)
  - [ ] 가입→pending→관리자 승인→진입 / 거절→rejected 화면 수동 시나리오 통과
  - [ ] anon 키로 보호 테이블 SELECT 0건(RLS 스모크), advisor 경고 0건

### Phase 2 — Admin 코어 (회원 / 멤버십 / 세션)
- 산출: Admin 14화면 중 dashboard/members(멤버십 통합)/plans/schedule(예약·대기 통합)/attendance/settings 골격 — 02 문서
- 완료 기준:
  - [ ] 회원 등록→플랜 생성→멤버십 부여→크레딧 확인 전 과정 UI 완결
  - [ ] 세션 생성(반복 포함)→코치 배정→회원 예약 대행→취소·대기 승격 동작
  - [ ] 권한: coach 계정으로 admin 화면 진입 차단, `fn_my_permissions()` 기반 메뉴 노출 확인

### Phase 3 — User / Coach 앱
- 산출: User 하단탭 5(03 문서) + Coach 운영 OS(04 문서), 예약 크레딧 RPC 실사용
- 완료 기준:
  - [ ] E2E: 회원 예약→크레딧 차감→QR 생성→(수동)체크인→코치 세션 보드 출결 마킹→attendance_outcome 반영
  - [ ] 코치 4대 원칙 검증: 클라이언트 coach_id 전달 경로 0건(코드 grep), 회원 비노출 데이터(정산/플래그) member 계정 접근 차단
  - [ ] 대기열: 정원 초과 예약→waitlist→취소 발생→빈자리 알림 수신(인앱)

### Phase 4 — Class / Kiosk / Race
- 산출: Class 스크린 콘솔+race 3화면(05), Kiosk 3화면+QR 프로토콜(06), Race 시스템(15)
- 완료 기준:
  - [ ] Kiosk: QR 스캔→예약 자동감지 분기(±30분)→체크인, 5분 만료·중복 방지 동작
  - [ ] Class: WOD 발행→TV 표출(Display-Safe 필드 비노출 확인), rotation HUD anon 표출
  - [ ] Race L1(시뮬레이터): 20레인 setup→lobby→countdown→racing→finished, live_state 복원, 종료 후 race_records 멱등 적재, 2.5D 뷰 60fps
  - [ ] (L2~L4 실장비 검증은 cutover 후 운영 병행 — 15 문서 §8 체크리스트)

### Phase 5 — 알림 · 결제 실가동
- 산출: pg_cron 2종 정식 등록, 알림 트리거·EF 경로, Toss EF 4종(08 문서)
- 완료 기준:
  - [ ] `SELECT * FROM cron.job` 2건, 리마인더·만기 알림 실수신(스테이징 시간 조작 테스트)
  - [ ] Web Push 실기기 수신(Android/iOS PWA), 만료 구독 자동 비활성
  - [ ] 결제 시뮬레이션 전 플로우(구매→승인→멤버십 생성→환불 2단계→Webhook 보정) — 08 문서 §1.7 전건
  - [ ] 외부 채널은 mock 응답 검증까지(실연동은 운영 후 08 §2.4 절차)
  - [ ] **cutover 준비 완료 판정**: 09 문서 릴리즈 게이트 ①~⑩ 전건 + 이관 리허설 1회 성공(§3)

---

## 2. 인프라 설계 (현행 유지 + 정합 해소)

### 2.1 표준 토폴로지

```
인터넷 ── Host Nginx (Ubuntu 24.04 호스트)
           ├─ 80  : 301 → https                    (HSTS는 443 안정화 후)
           ├─ 443 : TLS 종료 ─ proxy_pass → 127.0.0.1:3001  (운영 portal)
           │        /health → 200 (컨테이너 무관 생존 확인)
           └─ 8443: TLS ─ proxy_pass → 127.0.0.1:3101       (staging portal, Basic Auth)
                     │
Docker Compose (운영: /opt/bcl-portal)
  portal        : bcl-portal:latest      호스트 3001 → 컨테이너 3000 (Next standalone)
  race-service  : bcl-race-server:latest 호스트 8001 → 컨테이너 8001 (FastAPI, privileged BLE)
Docker Compose (스테이징: /opt/bcl-portal-staging)
  portal        : 호스트 3101 → 컨테이너 3000
  race-service  : 호스트 8101 → 컨테이너 8001 (시뮬레이터 전용, privileged 불필요)
```

### 2.2 포트 표준 확정 (as-is 불일치 해소)

> ⚠️ as-is: 가이드 문서 8080 vs compose `3001:3000` vs deploy.sh 완료 문구 "port 8080" 3중 불일치.

| 구분 | 표준(유일 표기) | 비고 |
|------|------|------|
| portal 컨테이너 내부 | **3000** | Next.js standalone 기본 |
| portal 호스트 바인딩 | **3001** (운영) / **3101** (staging) | `127.0.0.1:3001:3000`으로 바인딩(외부 직접 노출 차단, nginx만 경유) 🔄 |
| race-service | **8001** (운영) / **8101** (staging) | portal→race는 Docker 네트워크 내부 호출 우선 |
| nginx | **80/443** (운영), **8443**(staging) | 3000 listen(as-is nginx-host.conf) 제거 🔄 |
| **8080** | **폐기** | 모든 문서·스크립트에서 삭제. deploy.sh 완료 메시지 수정 |

규칙: 포트 번호는 `docker-compose.yml`과 `nginx-host.conf` 2파일에서만 정의하고, 문서는 이 표를 참조로만 링크한다(드리프트 재발 차단).

### 2.3 staging 신설 (🔄 신규)

- 목적: E2E(CI)의 대상 환경 + cutover 리허설 무대. **운영과 물리 분리된 Supabase staging 프로젝트** 사용
- 구성: 동일 compose를 디렉토리·포트·env만 분리(`/opt/bcl-portal-staging`, `.env.staging`), `SUPABASE_ENV=dev` 고정 → **결제 시뮬레이션 강제(이중장치)**
- 배포: `develop` 브랜치 push → staging 자동 배포. 운영 배포는 main만
- 접근 제한: nginx Basic Auth + 필요 시 IP 제한

### 2.4 race-service 분리 배포 (🔄 정식화)

- portal과 **이미지·라이프사이클 분리**: race 코드 변경 시 race-service만 재빌드/재기동(`docker compose up -d --build race-service`) — 레이스 중 portal 배포가 BLE 세션을 끊지 않도록 상호 독립
- privileged+BLE는 운영 호스트만. compose `depends_on: race-service`는 제거 🔄(portal은 race 없이도 기동 가능해야 함 — 장애 격리)
- SRK는 race-service env로만 주입(09 문서 시크릿 규약), REST(8001)는 nginx 경유 시 `/race-api/` prefix로 프록시하고 그 외 직접 노출 금지

---

## 3. 데이터 이관 (기존 Supabase → to-be 스키마)

### 3.1 전략

1. **as-is→to-be 매핑표 기반 스크립트 이관**: 07 문서의 변경 대조표(네이밍/타입/통합)를 그대로 구현한 SQL/스크립트 세트 `migration-scripts/`(신규 저장소)로 관리 — 손 이관 금지, 전 과정 재실행 가능(멱등)
2. 실행 방식: as-is 프로젝트에서 `pg_dump --data-only`(또는 FDW/CSV) 추출 → 스테이징 영역 스키마(`legacy.*`)에 적재 → 변환 INSERT...SELECT → to-be 테이블
3. **리허설 최소 2회**(staging 대상): 1차=스크립트 완성, 2차=cutover 직전 최신 데이터로 소요 시간 측정(야간 창구 내 완료 확인)

### 3.2 핵심 매핑 규칙 (07 문서 대조표 발췌 — 스크립트 단위)

| # | as-is | to-be | 변환 |
|---|-------|-------|------|
| M1 | `check_ins` / `reservations` / `plans` | `checkins` / `bookings` / `membership_plans` | 리네임 적재 |
| M2 | `transactions.id` text | UUID | 신규 UUID 발급 + `legacy_id` 보존 컬럼, `refunds.transaction_id` FK 재연결 |
| M3 | `coaching_notes` + `member_notes` | `member_notes(author_role)` 단일 | UNION 적재, note_type 매핑 |
| M4 | `lockers`+`locker_assignments`+`members.locker_number` | `lockers` 단일 | 현재 유효 배정만 `assigned_member_id`로 승격, 이력은 legacy 보존 |
| M5 | `admin_roles.permissions` 2형태(배열/불리언맵) | JSONB `{group: string[]}` 1형태 | 정규화 함수로 변환, `'*'`→`{"*":["all"]}` |
| M6 | `wods` 레거시 | (폐기) | `session_wods` 미존재분만 스냅샷 변환 후 폐기 |
| M7 | auth.users | 신규 프로젝트 auth | Supabase Admin API로 사용자 export/import(동일 UUID 유지 필수 — profiles FK 보존). 비밀번호 해시 이관 불가 항목은 최초 로그인 시 재설정 플로우 안내 |
| M8 | Storage(아바타/시설 사진) | 신규 버킷 | 객체 복사 스크립트 + URL 재작성 |
| M9 | `race_recordings` JSONL | 파일 볼륨 그대로 | race-recordings 볼륨 rsync(30일 보존 정책 내 파일만) |

이관 제외: `race_live_state`(휘발), 만료 `qr_codes`, 읽은 지 90일 지난 `notifications`(정책 확정 후), widget 4테이블(설계만 존재 — `widget_settings` 신규 시작).

### 3.3 검증 대사 쿼리 (리허설·본이관 공통 — 전건 일치해야 통과)

```sql
-- V1. 건수 대사: 도메인별 행 수 (legacy vs to-be)
SELECT 'members' t, (SELECT count(*) FROM legacy.members) a, (SELECT count(*) FROM public.members) b
UNION ALL SELECT 'memberships', (SELECT count(*) FROM legacy.memberships), (SELECT count(*) FROM public.memberships)
UNION ALL SELECT 'bookings', (SELECT count(*) FROM legacy.reservations), (SELECT count(*) FROM public.bookings)
UNION ALL SELECT 'checkins', (SELECT count(*) FROM legacy.check_ins), (SELECT count(*) FROM public.checkins)
UNION ALL SELECT 'transactions', (SELECT count(*) FROM legacy.transactions), (SELECT count(*) FROM public.transactions)
UNION ALL SELECT 'race_records', (SELECT count(*) FROM legacy.race_records), (SELECT count(*) FROM public.race_records);
-- 통합 테이블은 합산 대사: member_notes = legacy.coaching_notes + legacy.member_notes

-- V2. 금액 합계 대사 (결제·환불 — 1원 불일치도 실패)
SELECT (SELECT coalesce(sum(amount),0) FROM legacy.transactions WHERE status='done')
     = (SELECT coalesce(sum(amount),0) FROM public.transactions WHERE status='done') AS tx_ok,
       (SELECT coalesce(sum(amount),0) FROM legacy.refunds)
     = (SELECT coalesce(sum(amount),0) FROM public.refunds) AS refund_ok;

-- V3. 잔여 크레딧 총합 + 활성 멤버십 수
SELECT sum(remaining_credits) FROM public.memberships WHERE status='active';  -- legacy 동일 쿼리와 대조

-- V4. 참조 무결성: 고아 레코드 0건
SELECT count(*) FROM public.bookings b LEFT JOIN public.members m ON m.id=b.member_id WHERE m.id IS NULL; -- =0
SELECT count(*) FROM public.refunds r LEFT JOIN public.transactions t ON t.id=r.transaction_id WHERE t.id IS NULL; -- =0

-- V5. auth 연결: profiles↔auth.users 1:1, 승인 회원의 user_id 매칭율 100%
SELECT count(*) FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=p.id); -- =0

-- V6. 샘플 대조(자동+수동): 최근 거래 20건·PR 기록 10건 필드 단위 diff 스크립트
```

결과는 이관 로그(`migration-scripts/logs/YYYYMMDD.md`)로 보존 — cutover 판정 근거.

---

## 4. 전환 (Cutover)

### 4.1 병행 운영 기간 (권장 1~2주)

- 신규 시스템을 staging URL로 실사용 검증(관리자+코치 선행 사용), 기존 운영은 무변경 유지
- 이 기간 기존 DB는 계속 흘러가므로 **본이관은 반드시 cutover 야간에 재실행**(리허설 스크립트 그대로)
- 동결 대상 사전 공지: cutover 야간 신규 가입/결제/예약 중지(점검 공지 배너)

### 4.2 야간 전환 절차 (예: 일요일 02:00~06:00, 수업 없는 창구)

| 단계 | 작업 | 실패 시 |
|------|------|---------|
| T-0 | 기존 앱 점검 모드(nginx 점검 페이지) + 기존 DB 백업(pg_dump 전체) | 중단·재공지 |
| T+10m | 최종 데이터 이관 실행(§3 스크립트) | 롤백 R1 |
| T+60m | 검증 대사 쿼리 V1~V6 전건 통과 확인 | 롤백 R1 |
| T+90m | 신규 portal 컨테이너 기동(운영 env, 신규 Supabase prod) + /health·스모크(로그인/예약 1건 dry-run) | 롤백 R1 |
| T+120m | **nginx 업스트림 스위치**: `proxy_pass 127.0.0.1:3001`을 신규 스택으로 교체(구버전은 3002로 재바인딩해 대기) → `nginx -s reload`(무중단) | 롤백 R2 |
| T+150m | 실계정 수동 스모크(관리자/코치/회원 각 1) + Playwright @auth-smoke 운영 대상 1회 | 롤백 R2 |
| T+180m | 점검 해제·공지, 집중 모니터링 개시(24h: nginx error log, Supabase logs, EF 오류) | — |

### 4.3 롤백 시나리오

- **R1 (스위치 전)**: 신규 스택만 내리고 기존 점검 해제 — 사용자 영향 점검 시간뿐. 조건: 이관 실패/대사 불일치/스모크 실패
- **R2 (스위치 후)**: nginx proxy_pass를 구버전(3002 대기 중)으로 되돌려 reload — **1분 내 원복**. 조건(트리거 명시):
  - 인증 불가(로그인 실패율 급증) / 결제·크레딧 정합 오류 발견 / 5xx율 > 2% 지속 10분 / 체크인·세션 보드 등 핵심 플로우 불능
  - 주의: 스위치 후 신규 DB에 쌓인 델타(가입/예약)는 롤백 시 유실 — **cutover 후 24h 내 롤백 결정 시 델타 수동 재입력 목록을 audit_logs로 추출**하는 절차 포함
- **보존 정책**: 구버전 컨테이너·이미지·기존 Supabase 프로젝트는 **2주 보존**(read-only) 후 폐기. 백업 덤프는 90일 보관

---

## 5. CI/CD (3워크플로우)

### 5.1 워크플로우 구성

| 파일 | 트리거 | 잡 | 게이트 |
|------|--------|-----|--------|
| `quality.yml` (as-is 확장 🔄) | 전 브랜치 push / PR | npm ci → ESLint(0 error) → typecheck → **Vitest**(신설) → build → 시크릿 grep 스캔(`.next/static` service_role 0건) | PR 필수 체크 |
| `test.yml` ⏳ 신설 | PR→main, nightly cron | Playwright: PR=@auth-smoke+핵심 플로우(staging Supabase 대상) / nightly=전체 E2E+Race L1 시뮬레이터. 실패 트레이스 아티팩트 업로드 | **@auth-smoke = 배포 필수 체크(required)** |
| `deploy.yml` (as-is 확장 🔄) | main push(→운영), develop push(→staging), workflow_dispatch | `needs: [quality, test]` 성공 조건부 → appleboy/ssh-action → `/opt/bcl-portal{,-staging}/deploy.sh` → 배포 후 `/health` 200 확인 스텝 | 헬스체크 실패 시 잡 실패 알림 |

deploy.sh 개선 🔄: 완료 문구 포트 8080→표준 표기 수정, `docker compose`(v2) 통일, 직전 이미지 태그 백업(`bcl-portal:prev`) 후 빌드 — R2 롤백 시 즉시 사용.

### 5.2 시크릿·env 규약

| 위치 | 항목 | 규칙 |
|------|------|------|
| GitHub Secrets (운영) | `SSH_HOST/USERNAME/PRIVATE_KEY/PORT` | deploy 전용. 환경별 Environment(production/staging) 분리 + production은 protection rule(리뷰어 승인) |
| GitHub Secrets (빌드) | `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `STAGING_*` 동명 세트 | quality build·E2E용. NEXT_PUBLIC이라도 운영 값은 Secrets로만 주입 |
| 서버 `.env.local` | SRK, VAPID, env 식별자(`SUPABASE_ENV=prod|dev`) | git 미추적, 서버에서만 관리. 템플릿은 `.env.example`(placeholder만) |
| Supabase EF Secrets | VAPID private, KAKAO/SMS 키 | `supabase secrets set` — CI에서 미취급 |
| DB(pg_settings) | Toss 키 전종 | 08 문서 — env·CI 어디에도 두지 않음 |

명명 규칙: staging 접두 `STAGING_`, 운영은 무접두. **동일 키가 두 곳 이상에 정의되는 것 금지**(단일 출처), 신규 시크릿 추가 시 이 표 갱신이 PR 요건.

### 5.3 DB 마이그레이션 파이프라인

- 명명 `YYYYMMDDHHMMSS_topic.sql` 유지, **원격 직접 SQL 실행 금지**(as-is 원격-로컬 불일치 4건 백필 사고의 재발 차단) — 모든 스키마 변경은 마이그레이션 파일→`supabase db push`(staging 선적용→운영)
- 배포 게이트: `supabase migration list`로 원격=로컬 일치 확인(09 문서 게이트 ⑥)
