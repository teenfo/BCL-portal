# BCL Portal Testing Strategy

이 문서는 BCL Portal의 통합 테스트 전략을 정의합니다.

---

## 📋 목차
- [테스트 전략 개요](#테스트-전략-개요)
- [테스트 피라미드](#테스트-피라미드)
- [테스트 환경](#테스트-환경)
- [테스트 도구](#테스트-도구)
- [CI/CD 통합](#cicd-통합)
- [테스트 커버리지 목표](#테스트-커버리지-목표)

---

## 테스트 전략 개요

### 목표
1. **품질 보증**: 버그 조기 발견 및 수정
2. **신뢰성**: 안정적인 배포 보장
3. **문서화**: 테스트가 코드의 문서 역할
4. **리팩토링 안전성**: 자신감 있는 코드 개선

### 원칙
- **자동화 우선**: 수동 테스트 최소화
- **빠른 피드백**: 테스트 실행 시간 최적화
- **격리**: 각 테스트는 독립적으로 실행 가능
- **명확성**: 테스트 케이스는 읽기 쉽고 이해하기 쉬워야 함

---

## 테스트 피라미드

```
        ╱╲
       ╱  ╲
      ╱ E2E╲         < 10% - 느리지만 실제 사용자 시나리오
     ╱──────╲
    ╱        ╲
   ╱ Integration╲    < 20% - API 및 데이터베이스 통합
  ╱──────────────╲
 ╱                ╲
╱   Unit Tests    ╲  < 70% - 빠르고 많은 단위 테스트
──────────────────────
```

### 1. Unit Tests (70%)
- **대상**: 개별 함수, 유틸리티, 커스텀 훅
- **도구**: Vitest, React Testing Library
- **실행 속도**: 매우 빠름 (< 1초)
- **예시**: 유효성 검증, 날짜 포맷팅, 계산 로직

### 2. Integration Tests (20%)
- **대상**: API 라우트, 데이터베이스 쿼리, 컴포넌트 통합
- **도구**: Vitest, Supertest, Supabase Test Helpers
- **실행 속도**: 보통 (< 10초)
- **예시**: API 엔드포인트, RLS 정책, 폼 제출

### 3. E2E Tests (10%)
- **대상**: 전체 사용자 플로우
- **도구**: Playwright, Cypress
- **실행 속도**: 느림 (< 5분)
- **예시**: 로그인 → 예약 → 결제 플로우

---

## 테스트 환경

### 환경 구성
```
.
├── Development (dev)      # 로컬 개발 환경
├── Testing (test)         # CI/CD 테스트 환경
├── Staging (staging)      # 프로덕션과 유사한 환경
└── Production (prod)      # 실제 서비스 환경
```

### 테스트 데이터베이스
```bash
# Supabase Local Development
supabase start

# 테스트 데이터 시딩
npm run db:seed:test
```

### 환경 변수
```bash
# .env.test
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-key
NODE_ENV=test
```

---

## 테스트 도구

### 프레임워크 및 라이브러리
```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "playwright": "^1.40.0",
    "msw": "^2.0.0"
  }
}
```

### Vitest 설정
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

---

## 테스트 케이스 예시

### Unit Test 예시
```typescript
// src/lib/utils/date.test.ts
import { describe, it, expect } from 'vitest';
import { formatSessionDate, isSessionUpcoming } from './date';

describe('formatSessionDate', () => {
  it('should format date correctly', () => {
    const date = '2026-02-16';
    const result = formatSessionDate(date);
    expect(result).toBe('2026년 2월 16일');
  });

  it('should handle invalid date', () => {
    const invalidDate = 'invalid';
    const result = formatSessionDate(invalidDate);
    expect(result).toBe('Invalid Date');
  });
});

describe('isSessionUpcoming', () => {
  it('should return true for future sessions', () => {
    const futureDate = '2026-12-31';
    expect(isSessionUpcoming(futureDate)).toBe(true);
  });

  it('should return false for past sessions', () => {
    const pastDate = '2020-01-01';
    expect(isSessionUpcoming(pastDate)).toBe(false);
  });
});
```

### Integration Test 예시
```typescript
// src/app/api/sessions/route.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';

describe('GET /api/sessions', () => {
  beforeEach(async () => {
    // 테스트 데이터 초기화
    const supabase = createClient();
    await supabase.from('sessions').delete().neq('id', '');
  });

  it('should return sessions for a specific date', async () => {
    const response = await fetch('http://localhost:3000/api/sessions?date=2026-02-16');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('should return 401 for unauthenticated users', async () => {
    const response = await fetch('http://localhost:3000/api/sessions', {
      headers: {
        // No Authorization header
      }
    });
    
    expect(response.status).toBe(401);
  });
});
```

### E2E Test 예시
```typescript
// tests/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Booking Flow', () => {
  test('should complete booking successfully', async ({ page }) => {
    // 1. 로그인
    await page.goto('/apps/auth/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 2. 대시보드 확인
    await expect(page).toHaveURL('/apps/dashboard');
    
    // 3. 수업 목록으로 이동
    await page.click('nav a[href="/apps/schedule"]');
    await expect(page).toHaveURL('/apps/schedule');
    
    // 4. 수업 선택
    await page.click('.session-card:first-child');
    
    // 5. 예약 버튼 클릭
    await page.click('button:has-text("예약하기")');
    
    // 6. 예약 확인 모달
    await expect(page.locator('.modal')).toBeVisible();
    await page.click('button:has-text("확인")');
    
    // 7. 성공 메시지 확인
    await expect(page.locator('.toast')).toContainText('예약이 완료되었습니다');
  });

  test('should show error for full session', async ({ page }) => {
    // 정원 마감된 수업 예약 시도
    await page.goto('/apps/schedule');
    await page.click('.session-card.full');
    await page.click('button:has-text("예약하기")');
    
    await expect(page.locator('.toast')).toContainText('수업 정원이 마감되었습니다');
  });
});
```

---

## CI/CD 통합

### GitHub Actions 워크플로우
```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/postgres
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 테스트 커버리지 목표

### 커버리지 목표
- **Overall**: 80% 이상
- **핵심 비즈니스 로직**: 90% 이상
- **유틸리티 함수**: 100%
- **UI 컴포넌트**: 70% 이상

### 커버리지 확인
```bash
# 전체 테스트 및 커버리지
npm run test:coverage

# 커버리지 리포트 확인
open coverage/index.html
```

---

## 테스트 실행

### 로컬 실행
```bash
# 모든 테스트 실행
npm run test

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration

# E2E 테스트만
npm run test:e2e

# Watch 모드
npm run test:watch

# 특정 파일
npm run test src/lib/utils/date.test.ts
```

### CI/CD 실행
```bash
# GitHub Actions에서 자동 실행
git push origin main
```

---

## 베스트 프랙티스

### 1. AAA 패턴 (Arrange, Act, Assert)
```typescript
it('should calculate total price', () => {
  // Arrange: 테스트 준비
  const items = [
    { price: 10000, quantity: 2 },
    { price: 5000, quantity: 1 }
  ];
  
  // Act: 실행
  const result = calculateTotal(items);
  
  // Assert: 검증
  expect(result).toBe(25000);
});
```

### 2. 명확한 테스트 이름
```typescript
// ❌ Bad
it('test 1', () => { ... });

// ✅ Good
it('should return error when email is invalid', () => { ... });
```

### 3. 독립적인 테스트
```typescript
// ❌ Bad: 다른 테스트에 의존
let user;
it('create user', () => {
  user = createUser();
});
it('update user', () => {
  updateUser(user); // 이전 테스트에 의존
});

// ✅ Good: 독립적
it('should update user', () => {
  const user = createUser();
  const result = updateUser(user);
  expect(result.success).toBe(true);
});
```

---

## 관련 문서
- [단위 테스트 가이드](./unit-testing.md)
- [통합 테스트 가이드](./integration-testing.md)
- [E2E 테스트 가이드](./e2e-testing.md)
- [CI/CD 파이프라인](./ci-cd-pipeline.md)

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 2월 16일
