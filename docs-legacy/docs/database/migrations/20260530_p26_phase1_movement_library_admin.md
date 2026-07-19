# DB Migration: Priority 26 Phase 1 – Movement Library Admin

**작성일**: 2026-05-30  
**migration_name**: `p26_phase1_movement_library_admin`  
**대상 프로젝트**: meklaisrcpecuwwwakhv

---

## 변경 내역

### 신규 테이블: `movement_categories`
- 기존 하드코딩 카테고리(8개)를 DB 테이블로 분리
- UI에서 카테고리 CRUD 가능

### 컬럼 추가: `movement_library`
- `thumbnail_url VARCHAR`: 운동 썸네일 이미지 URL
- `video_url VARCHAR`: 시범 영상 URL (YouTube / Storage)

### RLS 정책
- `movement_categories`: 인증된 사용자 조회 / admin+coach만 INSERT/UPDATE/DELETE
- `movement_library` 기존 정책 유지 + INSERT/UPDATE/DELETE 정책 추가 (admin+coach)

### RPC 함수: `fn_list_movement_library`
- 검색(slug/이름) + 카테고리 필터 + 상태 필터
- WOD 사용 수 집계 포함
- admin, coach role 모두 호출 가능

---

## SQL 검토 체크리스트

- [x] 모든 새 테이블에 ENABLE ROW LEVEL SECURITY
- [x] id UUID PRIMARY KEY DEFAULT gen_random_uuid()
- [x] created_at TIMESTAMPTZ 포함
- [x] 외래 키 ON DELETE 정책 명확 (movement_library.category는 varchar → FK 없음, 기존 유지)
- [x] 인덱스 선언 (category, is_active, slug)
- [x] RPC에 SET search_path = public
- [x] RPC에 REVOKE/GRANT 선언
- [x] 데이터 삭제/DROP 없음 → 사용자 확인 불필요
