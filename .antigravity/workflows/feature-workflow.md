# Feature Development Workflow (Updated with Stitch MCP)

새로운 기능 개발 시 Stitch MCP 디자인을 포함한 표준 워크플로우입니다.

---

## 📋 워크플로우 종류

### 1. Critical Feature (결제, 보안, 재무)
```
Architect (설계) → Stitch Design → Senior Dev (구현) → QA (테스트) → Architect (승인)
```

### 2. Standard Feature (일반 CRUD, UI)
```
Architect (가이드) → Stitch Design → Developer (구현) → QA (테스트) → Architect (리뷰)
```

### 3. Real-time Feature (클래스, 키오스크)
```
Architect (요구사항) → Stitch Design → Specialist (구현) → QA (벤치마크) → Architect (검증)
```

---

## 🎨 Stitch Design 단계 (공통)

모든 기능 개발에서 **구현 전 디자인 단계**는 필수입니다.

### 단계별 절차

1. **Sitemap 갱신** (Architect 주도)
   - `.docs/sitemap/README.md` 및 모듈별 파일 수정
   - 화면 경로, 기능, 데이터 요구사항 정의

2. **기존 프롬프트 참조** (담당 Developer)
   - `.docs/stitch-prompts/apps/` 또는 `admin/` 확인
   - 유사 화면의 디자인 패턴 파악

3. **Stitch 화면 생성** (담당 Developer)
   - `mcp_StitchMCP_generate_screen_from_text` 사용
   - 일관된 디자인 테마 적용

4. **Screen ID 매핑** (담당 Developer)
   - Sitemap에 생성된 Screen ID 기록
   - 추적성 확보

5. **프롬프트 저장** (담당 Developer)
   - `.docs/stitch-prompts/` 디렉토리에 저장
   - 향후 참조용 템플릿화

6. **디자인 검토** (Architect)
   - 일관성 확인
   - 필요시 수정 요청

---

## 📝 상세 워크플로우

### Critical Feature
```mermaid
graph TD
    A[Architect: 요구사항 분석] --> B[Architect: 아키텍처 설계]
    B --> C[Architect: Sitemap 갱신]
    C --> D[Senior Dev: 기존 프롬프트 참조]
    D --> E[Senior Dev: Stitch 화면 생성]
    E --> F[Senior Dev: Screen ID 매핑]
    F --> G[Senior Dev: 프롬프트 저장]
    G --> H[Architect: 디자인 검토]
    H --> I{승인?}
    I -->|No| D
    I -->|Yes| J[Senior Dev: 구현]
    J --> K[QA: 테스트]
    K --> L[Architect: 최종 승인]
```

### Standard Feature
```mermaid
graph TD
    A[Architect: 가이드 제공] --> B[Developer: Sitemap 갱신]
    B --> C[Developer: 기존 프롬프트 참조]
    C --> D[Developer: Stitch 화면 생성]
    D --> E[Developer: Screen ID 매핑]
    E --> F[Developer: 프롬프트 저장]
    F --> G[Architect: 디자인 검토]
    G --> H{승인?}
    H -->|No| C
    H -->|Yes| I[Developer: 구현]
    I --> J[QA: 테스트]
    J --> K[Architect: 리뷰]
```

### Real-time Feature
```mermaid
graph TD
    A[Architect: 요구사항 정의] --> B[Specialist: Sitemap 갱신]
    B --> C[Specialist: 기존 프롬프트 참조]
    C --> D[Specialist: Stitch 화면 생성]
    D --> E[Specialist: Screen ID 매핑]
    E --> F[Specialist: 프롬프트 저장]
    F --> G[Architect: 디자인 검토]
    G --> H{승인?}
    H -->|No| C
    H -->|Yes| I[Specialist: 구현 + 최적화]
    I --> J[QA: 벤치마크]
    J --> K[Architect: 검증]
```

---

## 🎯 역할별 책임

### Architect
- **설계 단계**: 요구사항 정의 및 아키텍처 설계
- **디자인 단계**: Stitch 디자인 검토 및 승인
- **구현 단계**: 최종 리뷰 및 승인

### Senior Developer / Developer / Specialist
- **설계 단계**: Sitemap 갱신 (필요시)
- **디자인 단계**: 
  - 기존 프롬프트 참조
  - Stitch 화면 생성
  - Screen ID 매핑
  - 프롬프트 저장
- **구현 단계**: 디자인 기반 코드 구현

### QA
- **디자인 단계**: 사용성 사전 검토 (선택적)
- **구현 단계**: 테스트 및 품질 검증
- **최종 단계**: 디자인 일관성 체크

---

## ⚠️ 필수 체크리스트

### Stitch Design 단계 (모든 Feature)
- [ ] Sitemap에 화면 정의됨
- [ ] 기존 프롬프트 참조함
- [ ] Stitch 화면 생성 성공
- [ ] Screen ID Sitemap에 매핑됨
- [ ] 생성 프롬프트 저장됨
- [ ] Architect 디자인 승인 받음

### 구현 단계 진입 조건
- [ ] 위 Stitch Design 체크리스트 100% 완료
- [ ] 디자인이 기존 화면과 일관성 유지
- [ ] 디자인 테마(Dark, Lexend, 8px, #ff6a00) 적용됨

---

## 🔗 관련 문서
- `.agent/workflows/design-screen.md` - Stitch 디자인 상세 워크플로우
- `.antigravity/config.json` - 에이전트 설정
- `.antigravity/README.md` - 멀티에이전트 시스템 개요
