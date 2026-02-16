# Archive - 참조용 문서 보관소

이 폴더는 **과거 분석 리포트, 가이드, 참조 문서**를 보관합니다.

## 📦 보관 원칙
- **Agent는 이 폴더를 자동 참조하지 않습니다**
- 필요 시 수동으로 명시적 요청하여 참조 가능
- 컨텍스트 최적화를 위해 비핵심 문서를 보관

---

## 📁 아카이브된 문서들

### 분석 및 계획서
- `BCL_PORTAL_IMPROVEMENT_PLAN.md` - 프로젝트 개선 계획 (2026-02)
- `PROJECT_ANALYSIS_REPORT.md` - 프로젝트 전체 분석 리포트
- `SITEMAP_ANALYSIS_REPORT.md` - Sitemap 분석 리포트
- `STITCH_SITEMAP_TEMP.md` - Stitch UI 생성 임시 파일

### 기술 가이드
- `API_SPECIFICATION.md` - REST API 명세서
- `ENVIRONMENT_VARIABLES_GUIDE.md` - 환경 변수 설정 가이드
- `deployment-guide.md` - 배포 가이드
- `MCP_SETUP_GUIDE.md` - MCP 설정 가이드
- `PROJECT_RESET_GUIDE.md` - 프로젝트 리셋 가이드

### RACE 시스템
- `RACE_UI_UX_SPECIFICATION.md` - RACE UI/UX 명세
- `technical/race/` - RACE 시스템 기술 문서
  - `ARCHITECTURE.md`
  - `PROJECT_SETUP_GUIDE.md`
  - `QUICK_REFERENCE.md`
  - `README_DOCUMENTATION.md`
  - `WORKFLOW.md`

---

## 🔍 문서 복원 가이드

### 필요한 경우
1. **API 개발**: `API_SPECIFICATION.md` 참조
2. **환경 설정 도움**: `ENVIRONMENT_VARIABLES_GUIDE.md` 참조
3. **RACE 시스템 작업**: `technical/race/` 폴더 참조
4. **배포 문제**: `deployment-guide.md` 참조

### 복원 방법
```bash
# 필요한 문서를 다시 .docs/ 루트로 이동
mv .docs/archive/DOCUMENT_NAME.md .docs/

# 또는 Agent에게 명시적으로 요청
"archive 폴더의 API_SPECIFICATION.md를 참조해서..."
```

---

**아카이브 생성일**: 2026-02-16  
**아카이빙 목적**: Agent 컨텍스트 최적화 (문서 컨텍스트 60% 감소)
