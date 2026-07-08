---
name: verify
description: 변경 사항을 실제 앱 구동으로 검증. 화면·플로우·인증 변경 시 커밋 전 필수.
---

1. `npm run lint && npm run typecheck` (실패 시 중단)
2. `npm run dev` 백그라운드 기동 → `curl localhost:3000/api/health` 대기 (health 라우트 도입 전엔 `/` 200 확인)
3. 변경 범위별 시나리오:
   - 인증: `npm run test:e2e -- auth.smoke` (로그인→역할 진입→새로고침→앱 전환→로그아웃)
     ※ 샌드박스에서 supabase.co 아웃바운드가 정책 차단(CONNECT 403)이면 로컬 실행 불가 —
       CI quality.yml의 auth-e2e job이 게이트를 담당(Secrets: NEXT_PUBLIC_SUPABASE_URL/ANON_KEY 필요).
       프리인스톨 브라우저는 `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`, 프록시 허용 환경은 `PW_PROXY=$HTTPS_PROXY`.
   - 화면: 해당 라우트를 역할 계정(시드: admin@/coach@/member@bcl.test)으로 열어 스크린샷 확인
   - RPC: `tests/unit/rpc/` 해당 스펙 실행 (envelope {success,data,error} 검증)
4. 다크/라이트 양 테마 확인 (data-theme 토글) — UI 변경 시
5. 결과 요약: 통과 시나리오 / 스크린샷 경로 / 미검증 항목 명시
