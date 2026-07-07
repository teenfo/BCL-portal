---
name: deploy
description: 운영 배포 절차와 게이트. main 병합 전 체크리스트 포함.
---

1. 사전 게이트: quality.yml 녹색(lint 0/typecheck/build/test) + auth.smoke E2E 통과
2. 릴리즈 게이트: `.next/static` 내 SRK 검색 0건 / 신규 테이블 RLS 확인 / env 변경분 서버 반영 여부
3. 표준 경로: main push → deploy.yml → SSH → deploy.sh (pull/build/up/prune). 포트: portal 3001, race 8001
   ※ main 직접 push는 권한상 거부됨 — PR 생성 → 병합으로 배포 (이 세션 표준 패턴)
4. 마이그레이션 동반 배포: DB 먼저(/db-migration 스킬) → 앱 배포 순서 고정
5. 확인: `/health` 200, 역할별 로그인 1회, 직전 릴리즈 노트와 대조
6. 롤백: docker compose 이전 이미지 태그로 `up -d` (docs/11-deployment-cutover §롤백 — 1분 롤백 구조)
7. 컷오버 관련 배포(신구 전환)는 docs/11-deployment-cutover.md M1~M9 절차를 따른다
