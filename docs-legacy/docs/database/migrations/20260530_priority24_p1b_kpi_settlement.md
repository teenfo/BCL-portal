# Priority 24 P1-B Phase 1: KPI/정산 Basis Layer 마이그레이션

**작성일**: 2026-05-30  
**담당**: Senior Dev  
**목적**: 코치 월간 KPI 집계 및 예상 정산 Basis Layer RPC 도입

---

## 신규 RPC 목록

| RPC | 설명 |
|-----|------|
| `fn_get_coach_monthly_settlement_basis` | 코치 월간 정산 기초 계층 집계 (예상 정산 원천) |
| `fn_get_coach_monthly_kpis` | 코치 자신의 월간 KPI 통합 조회 (Dashboard/Profile용) |
| `fn_get_coach_retention_panel` | 코치 담당 회원 리텐션/재등록 위험 패널 |

## 기존 RPC 수정

| RPC | 변경사항 |
|-----|---------|
| `fn_calculate_monthly_settlement` | Basis Layer 재사용으로 정합성 강화 (Admin 전용 유지) |

## 보안 원칙

- 모든 RPC는 `auth.uid()` 기반으로 자신의 코치 레코드만 조회
- `SECURITY DEFINER` + `SET search_path = public` 설정
- `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated`

## migration_name

`priority24_p1b_kpi_settlement_basis`
