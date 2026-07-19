# Admin Feature Improvement Task

이 문서는 2026-04-19 전체 프로젝트 감사에서 도출된 **Admin 영역의 개선(결함 수정 및 코드 품질 향상) 작업 명세서**입니다.
이 문서를 기반으로 `/develop` 워크플로우 또는 개별 스킬을 통해 코드를 수정합니다.

## 📌 목표
- [x] Admin 코치 성과 탭의 임시 평점 데이터를 실 데이터로 연동 ✅ (2026-04-19)
- [x] 대시보드 위젯 및 주요 Admin 페이지의 타입 안전성 확보 (`as any` 제거) ✅ (2026-04-19)
- [x] 데이터베이스 호출 규격 통일 (`createClient` 직접 호출 제거) ✅ (2026-04-19)

---

## 세부 작업 항목 (Tasks)

### 1️⃣ 코치 성과 탭 평점 실 데이터 연동 (Major) ✅ 완료
**대상 파일**: 
- `src/app/admin/operations/coaches/page.tsx`

**수정 내역**:
- `avgRating: Number((4 + Math.random()).toFixed(1))` → `c.avg_rating != null ? Number(Number(c.avg_rating).toFixed(1)) : 0` 교체 완료
- RPC 호출에서 불필요한 `p_start_date`, `p_end_date` 파라미터 제거 (`fn_get_coach_performance_stats()`는 인자 없는 함수)

### 2️⃣ 타입 검증 우회 (`as any`) 코드 제거 (Major) ✅ 완료
**대상 파일**:
- `src/hooks/useWidgetRegistry.ts` — `(supabase as any)` 2건 → `query()` 전환 완료
- `src/hooks/usePushSubscription.ts` — `(supabase as any)` 2건 + `supabase.from('members')` 1건 → `query()` 전환 완료
- `src/components/dashboard/WidgetSettingsManager.tsx` — `(supabase as any)` 4건 → `query()` 전환 완료

**수정 내역**:
- 모든 `(supabase as any).from(...)` 호출을 `query()` 헬퍼로 교체
- `createClient`는 `supabase.auth.getUser()` 등 인증 목적에서만 유지
- `subscription: subJson as any`, `device_info: {...} as any` 등 불필요한 `as any` 캐스팅 제거

### 3️⃣ Data Fetching 패턴 통일 (Minor) ✅ 완료
**대상 파일**:
- `src/app/admin/operations/coaches/page.tsx` (handleSettlementStatusChange)

**수정 내역**:
- `createClient()` → `supabase.from('coach_settlements').update(...)` 직접 호출을 `query('coach_settlements').update(...)` 헬퍼로 교체 완료

---

## 🚀 적용 가이드 (프롬프트 참고용)
아래 명령어를 사용하여 스킬을 트리거하거나 워크플로우를 통해 진행할 수 있습니다.
```text
/develop 명령어를 사용해 ".docs/planning/admin-improvements-task.md 파일을 참고해서 결함을 수정해줘" 라고 요청하세요.
```
또는 위 파일 정보를 바탕으로 개별적인 수정을 진행하시면 됩니다.
