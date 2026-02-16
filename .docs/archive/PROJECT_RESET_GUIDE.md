# 🔄 프로젝트 초기화 완료 가이드

> **초기화 완료 날짜**: 2026년 2월 16일 20:59

---

## ✅ 완료된 작업

### 1. 소스 코드 초기화 ✅
- ✅ `src/` 디렉토리 완전 초기화
- ✅ Next.js 기본 구조 재생성
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/globals.css`
- ✅ 기본 디렉토리 구조 생성
  - `src/components/`
  - `src/lib/`
  - `src/hooks/`
  - `src/contexts/`
  - `src/utils/`
- ✅ Supabase 클라이언트 설정
  - `src/lib/supabase/client.ts` (브라우저)
  - `src/lib/supabase/server.ts` (서버)

### 2. 보존된 항목 ✅
- ✅ `.docs/` - 모든 프로젝트 문서
- ✅ `.agent/` - Agent 스킬, 워크플로우, 규칙
- ✅ `.env` - 환경 변수
- ✅ `package.json`, `next.config.mjs` 등 설정 파일
- ✅ `public/` - 기본 SVG 파일들

### 3. 데이터베이스 초기화 스크립트 생성 ✅
- ✅ `000_reset_database.sql` - 모든 테이블 삭제
- ✅ `001_initial_schema.sql` - 초기 스키마 (이미 존재)

---

## 🚀 다음 단계 (필수)

### Step 1: Supabase 데이터베이스 초기화

#### 1-1. 기존 테이블 삭제
1. Supabase Dashboard 접속
   - URL: https://meklaisrcpecuwwwakhv.supabase.co
   
2. SQL Editor 열기
   - 왼쪽 메뉴 → SQL Editor

3. 초기화 스크립트 실행
   ```sql
   -- .docs/database/schema/000_reset_database.sql 내용 복사
   ```
   
4. **Execute** 클릭

#### 1-2. 초기 스키마 생성
1. 같은 SQL Editor에서 새 쿼리 작성

2. 초기 스키마 실행
   ```sql
   -- .docs/database/schema/001_initial_schema.sql 내용 복사
   ```

3. **Execute** 클릭

4. 결과 확인
   - 왼쪽 메뉴 → Database → Tables
   - 14개 테이블 생성 확인:
     - facilities
     - members
     - membership_plans
     - memberships
     - coaches
     - sessions
     - session_coaches
     - bookings
     - checkins
     - transactions
     - notices
     - notifications
     - support_tickets

#### 1-3. RLS 정책 확인
1. 각 테이블 클릭 → Policies 탭
2. RLS가 활성화되었는지 확인
3. 정책 추가 (필요시)
   - 참고: `.docs/database/rls-policies/README.md`

---

### Step 2: 개발 서버 실행 및 확인

```bash
# 1. 의존성 설치 (필요시)
npm install

# 2. 개발 서버 실행
npm run dev

# 3. 브라우저에서 확인
# http://localhost:3000
```

**기대 결과**:
- "BCL Portal" 헤더
- "프로젝트 초기화 완료" 메시지 표시

---

### Step 3: 첫 번째 화면 개발 시작

#### 3-1. Sitemap 문서 작성
```bash
# 예시: Admin 대시보드 화면
vim .docs/sitemap/admin/dashboard.md
```

#### 3-2. `/add-page` 워크플로우 활용
```
/add-page
```

Agent가 다음을 자동으로 수행:
1. Sitemap 검증
2. 디렉토리 구조 생성
3. 기본 컴포넌트 생성
4. 라우팅 설정

---

## 📊 현재 프로젝트 구조

```
portal/
├── .docs/                          ✅ 보존됨 (모든 문서)
│   ├── sitemap/                   # 화면 설계 (SSOT)
│   ├── database/                  # DB 스키마 및 정책
│   │   └── schema/
│   │       ├── 000_reset_database.sql  🆕 초기화 스크립트
│   │       └── 001_initial_schema.sql  # 초기 스키마
│   ├── security/                  # 보안 가이드
│   ├── testing/                   # 테스트 전략
│   └── PROJECT_ANALYSIS_REPORT.md # 프로젝트 분석 보고서
│
├── .agent/                         ✅ 보존됨 (Agent 설정)
│   ├── skills/                    # commit-bot, db-migration, ui-gen 등
│   ├── workflows/                 # add-page, sync-docs 등
│   └── rules/                     # bcl-portal.rules.md, ui.rules.md
│
├── src/                            🆕 초기화됨
│   ├── app/
│   │   ├── layout.tsx            # Root Layout
│   │   ├── page.tsx              # Home Page
│   │   └── globals.css           # Tailwind CSS
│   ├── components/               # (비어있음)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts         # Supabase 클라이언트
│   │       └── server.ts         # Supabase 서버
│   ├── hooks/                    # (비어있음)
│   ├── contexts/                 # (비어있음)
│   └── utils/                    # (비어있음)
│
├── public/                         ✅ 보존됨 (기본 SVG)
├── .env                           ✅ 보존됨
├── package.json                   ✅ 보존됨
├── next.config.mjs                ✅ 보존됨
└── README.md                      🆕 업데이트됨
```

---

## ⚠️ 주의사항

### 1. 데이터베이스 초기화 전
- [ ] **모든 중요 데이터 백업 확인**
- [ ] 프로덕션 DB가 아닌 개발 DB인지 확인
- [ ] Supabase 프로젝트 ID 확인 (`meklaisrcpecuwwwakhv`)

### 2. 개발 시작 전
- [ ] `.env` 파일 환경 변수 확인
- [ ] Supabase 연결 테스트
- [ ] 문서 읽기 (특히 `.docs/project-blueprint.md`)

### 3. 개발 중
- [ ] 모든 화면은 Sitemap에 먼저 정의
- [ ] RLS 정책 반드시 설정
- [ ] 테스트 코드 작성
- [ ] 문서 동기화 (`/sync-docs`)

---

## 🎯 추천 개발 순서

### Week 1: 인증 및 기본 구조
1. Auth 시스템 구현
   - [ ] 로그인 페이지 (`/apps/auth/login`)
   - [ ] 로그아웃 기능
   - [ ] 세션 관리

2. 기본 레이아웃
   - [ ] Admin Sidebar
   - [ ] User Bottom Tab
   - [ ] 공통 컴포넌트

### Week 2: Admin Portal 기본 기능
1. 대시보드
   - [ ] KPI 카드
   - [ ] 주간 통계
   
2. 회원 관리
   - [ ] 회원 목록
   - [ ] 회원 상세

### Week 3: User App 기본 기능
1. 홈 화면
2. 수업 목록
3. 예약 기능

---

## 📚 참고 문서

### 필수 읽기
1. **[프로젝트 블루프린트](.docs/project-blueprint.md)**
2. **[Database Architecture](.docs/database/README.md)**
3. **[Security Guide](.docs/security/README.md)**
4. **[BCL Portal Rules](.agent/rules/bcl-portal.rules.md)**

### 개발 가이드
1. **[Testing Strategy](.docs/testing/README.md)**
2. **[API Specification](.docs/API_SPECIFICATION.md)**
3. **[RLS Policies](.docs/database/rls-policies/README.md)**

---

## ✅ 초기화 체크리스트

### 소스 코드 초기화
- [x] src/ 디렉토리 삭제
- [x] Next.js 기본 구조 재생성
- [x] Supabase 클라이언트 설정
- [x] README.md 업데이트

### 데이터베이스 초기화 (진행 필요)
- [ ] Supabase Dashboard 접속
- [ ] `000_reset_database.sql` 실행
- [ ] `001_initial_schema.sql` 실행
- [ ] RLS 정책 확인
- [ ] 테이블 생성 확인 (14개)

### 개발 환경 확인
- [ ] npm install 실행
- [ ] npm run dev 실행
- [ ] 브라우저에서 localhost:3000 확인
- [ ] Supabase 연결 테스트

### 문서 확인
- [ ] .docs/ 디렉토리 확인
- [ ] .agent/ 디렉토리 확인
- [ ] project-blueprint.md 읽기
- [ ] bcl-portal.rules.md 읽기

---

**초기화 완료 날짜**: 2026년 2월 16일  
**다음 작업**: Supabase 데이터베이스 초기화 및 개발 서버 실행
