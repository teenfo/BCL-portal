---
name: db-migration
description: Supabase 스키마 변경 절차. 원격-로컬 불일치 사고(4건 백필) 재발 방지 규약.
---

1. 파일명 `YYYYMMDDHHMMSS_topic.sql` — supabase/migrations/에 신규 파일로만 (기존 파일 수정 절대 금지)
2. 필수 포함: IF NOT EXISTS 멱등 / 신규 테이블 RLS 정책 동봉 / 신규 RPC는 SECURITY DEFINER+search_path
   + envelope `{success, data, error}` + 내부 auth.uid() 검증 (docs/07-data-model §7 계약 준수)
3. 로컬 적용: `npx supabase db reset` → 전체 마이그레이션 재생 성공 확인
4. 타입 재생성: `npx supabase gen types typescript --local > src/types/database.ts`
5. 문서 동기화: docs/07-data-model.md의 해당 테이블/RPC 절 갱신 (이 1개만)
6. 원격 push는 사용자 승인 후에만. push 후 `supabase migration list`로 원격-로컬 일치 확인
7. 금지: 데이터 파괴 DDL(DROP/TRUNCATE)은 백업 확인 절차 없이 불가
8. 초기 스키마의 원본은 `docs/sql/00~09` (PG16 검증 통과본) — 마이그레이션 생성 시 이를 기준으로 분할
