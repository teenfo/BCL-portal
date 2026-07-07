# Release Checklist

> **목적**: 매 릴리즈마다 반복 가능한 출시 검증 절차를 정의한다.
> **적용 시점**: minor / major 릴리즈 전 (patch 릴리즈는 §1, §2만 수행)
> **PM 이슈 근거**: `.docs/archive/audit/audit-pm-gap-analysis-20260419.md` §5
> **마지막 갱신일**: 2026-04-25

---

## 0. 사용 방법

릴리즈 작업자는 본 체크리스트를 복사하여 PR 또는 릴리즈 이슈에 첨부하고, 항목별로 체크합니다.
모든 ✅ 필수 항목이 통과되어야 릴리즈를 승인할 수 있습니다.

```bash
# 릴리즈 브랜치 생성
git checkout -b release/v<VERSION>

# 본 체크리스트를 복사하여 작업
cp .docs/process/release-checklist.md /tmp/release-v<VERSION>.md
```

---

## 1. 코드 품질 게이트 (✅ 필수)

| # | 항목 | 명령 | 통과 기준 |
|---|------|------|----------|
| 1-1 | Lint | `npm run lint` | 0 errors (warnings 허용) |
| 1-2 | Type Check | `npm run typecheck` | 0 errors |
| 1-3 | Build | `npm run build` | 성공 + 라우트 수 변화 확인 |
| 1-4 | Test (도입 시) | `npm run test` | 0 failures |
| 1-5 | 의존성 보안 | `npm audit --omit=dev` | High/Critical 0건 |

> ※ 1-4 테스트는 도입 시점 이후 필수.

---

## 2. 문서 기준선 동기화 (✅ 필수)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 2-1 | `package.json` version 갱신 | `cat package.json \| grep version` |
| 2-2 | `src/lib/version.ts` BUILD_INFO version 일치 | 동일 버전 문자열 |
| 2-3 | `.docs/project-blueprint.md` Active Context 최신 상태 | Last Action에 이번 릴리즈 내용 반영 |
| 2-4 | README의 스택 버전 == `package.json` | Next.js, React, Supabase JS 버전 |
| 2-5 | README의 명령어가 실제 `package.json` scripts와 일치 | 누락/잉여 명령 없음 |
| 2-6 | DB 마이그레이션이 추가됐다면 `.docs/database-reference.md` 갱신 | 마이그레이션 파일명 일치 |
| 2-7 | 보안 통제가 변경됐다면 `.docs/security/README.md` 갱신 | 적용 완료 / 부분 / 계획 분류 정확 |
| 2-8 | 라우트가 추가됐다면 `.docs/sitemap/` 갱신 | 라우트 ↔ 문서 1:1 |

---

## 3. 운영 범위 명확화 (✅ 필수)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 3-1 | mock 상태 기능 명시 | README "운영 가능/미운영 기능" 표 갱신 확인 |
| 3-2 | 외부 의존(Kakao/SMS/PG 등) API 키 발급 상태 | blueprint 또는 deployment 가이드에 명시 |
| 3-3 | 운영 환경 의존 대기 항목 식별 | blueprint Priority 14 등 운영 의존 명시 |

---

## 4. 보안 검증 (✅ 필수)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 4-1 | Service Role Key가 클라이언트 번들에 없음 | `grep -r "SUPABASE_SERVICE" .next/static/` → 0건 |
| 4-2 | RLS 정책이 신규 테이블에 적용됨 | 마이그레이션 검토 |
| 4-3 | Nginx 보안 헤더 적용 상태 변동 없음 | `nginx-host.conf` diff 검토 |
| 4-4 | `.env.local`이 git에 추적되지 않음 | `git ls-files \| grep .env.local` → 0건 |
| 4-5 | 신규 클라이언트 컴포넌트에 `dangerouslySetInnerHTML` 없음 | grep 결과 0건 |

---

## 5. 데이터베이스 변경 (해당 시)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 5-1 | 마이그레이션 파일이 `supabase/migrations/`에 위치 | 파일 존재 확인 |
| 5-2 | 마이그레이션 명명 규칙 준수 (`YYYYMMDDHHMMSS_<topic>.sql`) | 파일명 패턴 |
| 5-3 | 신규 테이블에 RLS 정책 적용 | SQL 검토 |
| 5-4 | 신규 RPC 함수에 `SECURITY DEFINER` + 권한 검사 | SQL 검토 |
| 5-5 | 롤백 가능성 확인 (DROP TABLE / 컬럼 삭제) | 사전 백업 후 검증 |
| 5-6 | 운영 환경 적용 절차 문서화 | deployment 가이드 |

---

## 6. Race 시스템 변경 (해당 시)

Race 코드 변경이 있는 경우 [Race Acceptance Checklist](../testing/race-acceptance-checklist.md)의 영향 받은 섹션을 재검증:

- [ ] BLE 스캔 / 연결 (§1)
- [ ] 레이스 운영 상태 머신 (§2)
- [ ] 실시간 데이터 파이프라인 (§3)
- [ ] 레코딩 / 결과 적재 (§4)
- [ ] 종료 / 정리 (§5)

검증 결과는 §8 Run Log에 기록.

---

## 7. 알림 시스템 변경 (해당 시)

- [ ] 외부 채널(Kakao/SMS) 실 발송 여부 README에 명시
- [ ] Edge Function MOCK 상태 변동 시 코드 주석 + 문서 동시 갱신
- [ ] Web Push VAPID 키 변경 시 환경 변수 가이드 갱신

---

## 8. 배포 절차 (✅ 필수)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 8-1 | 릴리즈 브랜치에서 빌드 통과 | CI green |
| 8-2 | main에 머지 (squash 또는 fast-forward) | PR 머지 |
| 8-3 | 태그 생성 (`git tag v<VERSION>`) | 태그 푸시 |
| 8-4 | GitHub Actions 배포 워크플로우 성공 | `.github/workflows/deploy.yml` |
| 8-5 | 운영 환경 헬스체크 | `/health` 엔드포인트 200 |
| 8-6 | 핵심 흐름 smoke test | 로그인 → 예약 → 체크인 1회 수행 |

---

## 9. 사후 처리

- [ ] `.docs/archive/complete/project-complete-<YYYYMMDD>.md`에 완료 작업 기록
- [ ] 진행 중이던 planning 파일을 `.docs/archive/planning/`으로 이동 (해당 시)
- [ ] 릴리즈 노트 / CHANGELOG 갱신 (도입 시)
- [ ] 본 체크리스트의 부족한 항목을 발견했다면 본 문서 자체를 갱신

---

## 10. 릴리즈 승인

| 역할 | 이름 | 날짜 | 비고 |
|------|------|------|------|
| 작업자 | | | |
| Architect | | | 문서/버전 동기화 확인 |
| Release Owner | | | 최종 승인 |

---

## 관련 문서

- [Documentation Governance](./documentation-governance.md)
- [Race Acceptance Checklist](../testing/race-acceptance-checklist.md)
- [Security Architecture](../security/README.md)
- [Active Blueprint](../project-blueprint.md)
