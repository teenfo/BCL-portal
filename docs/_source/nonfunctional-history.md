# [원자료] 비기능 요구 · 기능 이력 · 부채 (as-is)

> blueprint(P6~26) + planning/audit/security/process/deployment 문서 정독 스냅샷 (2026-07-06).

## Priority 이력 (완료 vs 잔여)
- ✅ 완료: P6~13, 15~20, 24, 26 (배지 P13은 문서상 완료이나 **마이그레이션 실체 부재** — backend-inventory 참조)
- 🟡 잔여: **P14 알림 실가동 QA 전체**(pg_cron/트리거/Push 실수신/카카오·SMS — 외부채널 v1 제외), **P21 Phase4** Race 실장비 수용검증(L1~L4), **P22 Ph5/P23 Ph4/P25 §11.8** 수동 수용 테스트

## 시스템별 핵심 도메인 규칙 (재구축 유지)
1. **코치앱 4대 원칙**: 세션 중심 / 서버 권한(auth.uid, 클라이언트 coach_id 전달 금지) / 사실(checkins) vs 판정(attendance_outcome) 분리 / 코치 상태머신(unlinked→linked_unassigned→linked_active, on_leave). Admin=정산 실행, Coach=read-only. 예상정산 = base + payable×allowance(동일 Basis). Screen Display-Safe(부상/메모/위험/정산 비노출)
2. **Race**: 역할 3분할(Python=BLE만/Admin=기기/Portal=렌더), 3경로(Broadcast 0.3s/live_state 5s/JSONL 30일), 부정출발 완화(READY 무시), 모드락, 시리얼=주 식별자, 최대 20대(멀티 동글), 러버밴딩 없음
3. **결제 불변식**: 자동결제/재시도/빌링키/클라이언트 금액 신뢰 금지, 3단계 확인, Fail-to-NOT-charge, orderId UNIQUE+FOR UPDATE, 서버 금액=DB plans.price 비교, min(Admin설정,env) 이중장치, 환불=관리자 2단계+서버계산+audit
4. **알림**: In-app+Realtime(1차 100%) > Web Push(PWA) > 카카오/SMS(유료). 시간기반=pg_cron, 이벤트=트리거(빈자리 상위 3명)
5. **QR 체크인**: 페이로드 {mid,fid,ts,v}, 5분 만료, 예약 자동감지 분기(수업 ±30분), 5분 중복 방지
6. **데이터 규칙**: 비즈니스 테이블=member_id(auth user_id 금지), members/coaches.user_id nullable(미연결 존재), query()/rpc() 헬퍼 강제

## 비기능
### 보안 (v2.0.0 3분류)
- ✅: JWT/RLS 전면/RBAC/SRK 격리/nginx 헤더4/업로드10MB/XSS·SQLi 방어/bcrypt
- 🟡: HTTPS·HSTS(운영 nginx), 백업 복구 리허설
- ⏳: MFA, CSP(Report-Only 점진), CSRF 토큰, rate limit(nginx+앱), Fail2ban, Dependabot, 개인정보 파기 절차
- 릴리즈 게이트: SRK가 .next/static 0건, 신규 테이블 RLS, 신규 RPC=SECURITY DEFINER+권한검사

### 성능
- CSR 강제, Class/Race=rAF+DOM 직접(리렌더 우회, 20레인 60fps, LERP 300ms), 인덱스 20+, Realtime 60msg/s 여유, JSONL ~21MB/레이스

### 배포
- Ubuntu 24.04 → Host Nginx(80/443, WS, /health) → Docker Compose: portal(standalone, 3001:3000, NEXT_PUBLIC=빌드ARG) + race-service(8001, privileged BLE, SRK env)
- ⚠️ 포트 불일치: 가이드 8080 vs compose 3001 vs deploy.sh 문구 8080
- CI: quality.yml(lint 0/typecheck/build), deploy.yml(main push→SSH→deploy.sh: pull/build/up/prune)
- 릴리즈 체크리스트 10섹션, 마이그레이션 명명 YYYYMMDDHHMMSS_topic.sql

### 아키텍처 부채 (재구축 경계 패턴)
- **테스트 0**(러너/파일 없음 — Vitest/Playwright 계획만), 문서 드리프트 상습(버전/경로/미존재 마이그레이션 참조), 마이그레이션 원격-로컬 불일치 실사고(4건 백필), 보안 문서 과장 이력, DEPRECATED RPC/wods 잔존, blueprint 거대 단일문서
- **인증 장애 이력(중요)**: onAuthStateChange 내 await→락 교착(로그인 5~10s), 서버/클라 쿠키명 불일치(storageKey)→관리자 진입 불가, 앱 전환 세션 끊김(proxy 도입 배경). 재구축 시 구조적 차단 필수
- UI 부채 이력: 미정의 토큰(--app-accent-bg), UA button 기본배경(흰 패널), 오렌지 3종 혼용, 3중 테마(admin 다크 유틸/apps 라이트 토큰/race 브랜드), permissions JSONB 2형태→TypeError

## 디자인 시스템 (as-is)
- 다크 Glassmorphism 기준: #ff6a00 primary(그라디언트 →#ff8533), 배경 #1a1a1a 계열, Lexend, 4px grid, radius 8px, glass=rgba(38,38,38,.8)+blur(10px)
- 실제 3중 혼재: admin=다크+수동 유틸리티 클래스(globals.css 수제 tailwind 유사), apps/coach=라이트 .app-page 토큰(--app-accent=#D2691E ≠ 문서 #ff6a00!), race=FF6A00 브랜드
- admin 규칙: .admin-filter-btn/.admin-search-input/.admin-action-btn 글로벌 클래스 강제, 파괴적 행동 확인 단계
- 공통: Empty State 필수, Skeleton 권장, 표준 컴포넌트 src/components/apps/
