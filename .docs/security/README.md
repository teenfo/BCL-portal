# BCL Portal Security Architecture

이 문서는 BCL Portal의 통합 보안 아키텍처를 정의합니다.

---

## 📋 목차
- [보안 개요](#보안-개요)
- [인증 시스템](#인증-시스템)
- [인가 및 권한 관리](#인가-및-권한-관리)
- [데이터 보안](#데이터-보안)
- [API 보안](#api-보안)
- [보안 체크리스트](#보안-체크리스트)

---

## 보안 개요

### 보안 원칙
1. **최소 권한 원칙** (Principle of Least Privilege)
2. **심층 방어** (Defense in Depth)
3. **안전한 기본값** (Secure by Default)
4. **투명성** (Transparency)

### 보안 계층
```
┌─────────────────────────────────────────┐
│  클라이언트 (Browser/Mobile)            │
│  - Input Validation                     │
│  - XSS 방지                              │
└─────────────────────────────────────────┘
           ↓ HTTPS (TLS 1.3)
┌─────────────────────────────────────────┐
│  Reverse Proxy (Nginx)                  │
│  - SSL/TLS 종료                          │
│  - Rate Limiting                         │
│  - DDoS 방어 (Fail2ban)                  │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Application (Next.js on Docker)        │
│  - 인증 검증 (JWT)                       │
│  - CSRF 토큰                             │
│  - Content Security Policy               │
│  - API Rate Limiting                     │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Database (Supabase PostgreSQL)         │
│  - Row Level Security (RLS)             │
│  - 암호화 (at rest, in transit)          │
│  - 백업 및 복구                           │
└─────────────────────────────────────────┘
```

---

## 인증 시스템

### Supabase Auth 통합
BCL Portal은 Supabase Auth를 사용하여 통합 인증을 관리합니다.

#### 인증 흐름
```
1. 사용자 로그인 요청
   ↓
2. Supabase Auth 서버 검증
   ↓
3. JWT (Access Token + Refresh Token) 발급
   ↓
4. 클라이언트에서 JWT를 쿠키/로컬 스토리지 저장
   ↓
5. API 요청 시 JWT 포함 (Authorization: Bearer <token>)
   ↓
6. 서버에서 JWT 검증 및 사용자 식별
```

#### JWT 구조
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "member",
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### 비밀번호 정책
- **최소 길이**: 8자 이상
- **복잡도**: 영문 대소문자, 숫자, 특수문자 중 3가지 이상 포함 권장
- **저장**: bcrypt 해시 (Supabase 기본)
- **만료**: 90일마다 변경 권장 (선택 사항)

### 다중 인증 (MFA) - 추후 구현
- TOTP (Time-based One-Time Password)
- SMS 인증
- 이메일 인증

---

## 인가 및 권한 관리

### 역할 기반 접근 제어 (RBAC)

#### 역할 정의
1. **Admin** (관리자)
   - 모든 데이터 접근 및 수정 가능
   - 회원 관리, 수업 관리, 결제 관리
   - 시스템 설정 변경

2. **Coach** (코치)
   - 자신의 수업 관련 데이터 접근
   - 수업 WOD 수정
   - 출석 체크
   - 회원 피드백 작성

3. **Member** (일반 회원)
   - 자신의 프로필 및 예약 데이터 접근
   - 수업 예약 및 취소
   - 결제 내역 조회
   - 공지사항 조회

4. **Guest** (비회원)
   - 제한적 공개 정보만 조회 (지점 정보, 요금제 등)

#### 권한 매트릭스

| 리소스 | Admin | Coach | Member | Guest |
|--------|-------|-------|--------|-------|
| 회원 목록 조회 | ✅ | 자신의 수업 회원만 | ❌ | ❌ |
| 회원 생성 | ✅ | ❌ | ❌ | ❌ |
| 회원 수정 | ✅ | ❌ | 본인만 | ❌ |
| 수업 목록 조회 | ✅ | ✅ | ✅ | ✅ |
| 수업 생성 | ✅ | ❌ | ❌ | ❌ |
| 수업 수정 | ✅ | WOD만 | ❌ | ❌ |
| 예약 생성 | ✅ | ❌ | ✅ | ❌ |
| 예약 취소 | ✅ | ❌ | 본인만 | ❌ |
| 거래 내역 조회 | ✅ | ❌ | 본인만 | ❌ |

---

## 데이터 보안

### 암호화

#### 저장 시 암호화 (Encryption at Rest)
- **데이터베이스**: Supabase의 AES-256 암호화
- **파일 저장소**: Supabase Storage의 암호화
- **백업**: 암호화된 백업

#### 전송 시 암호화 (Encryption in Transit)
- **HTTPS**: TLS 1.3 강제
- **WebSocket**: WSS (Secure WebSocket)
- **데이터베이스 연결**: SSL/TLS

### 민감 데이터 처리

#### 1. 개인정보
```typescript
// 개인정보는 RLS로 보호
const { data, error } = await supabase
  .from('members')
  .select('*')
  .eq('id', memberId); // RLS가 자동으로 권한 확인
```

#### 2. 결제 정보
```typescript
// PG사 토큰만 저장, 실제 카드 번호는 저장하지 않음
const transaction = {
  pg_transaction_id: 'toss_12345',  // ✅ 저장
  amount: 150000,                   // ✅ 저장
  // card_number: '1234-5678-9012-3456'  ❌ 절대 저장 금지
};
```

#### 3. 비밀번호
```typescript
// Supabase Auth가 자동으로 bcrypt 해싱
// 절대 평문으로 저장하지 않음
```

### Row Level Security (RLS)
- **모든 테이블 RLS 필수**: 클라이언트는 `anon key`만 사용
- **정책 적용**: 사용자 역할 기반 세밀한 접근 제어
- **자세한 내용**: [RLS 정책 가이드](../database/rls-policies/README.md)

---

## API 보안

### 인증
```typescript
// Authorization 헤더에 JWT 포함
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### CSRF 방어
```typescript
// Next.js 14의 Server Actions는 자동 CSRF 방어
// API Routes는 CSRF 토큰 검증 필요
```

### Rate Limiting

#### Nginx에서 설정
```nginx
# /etc/nginx/conf.d/rate-limit.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

server {
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
    }
}
```

#### 애플리케이션 레벨 (Next.js Middleware)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const rateLimit = new Map();

export function middleware(request: NextRequest) {
  const ip = request.ip ?? 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1분
  const maxRequests = 100;

  const requestLog = rateLimit.get(ip) || [];
  const recentRequests = requestLog.filter(
    (time: number) => now - time < windowMs
  );

  if (recentRequests.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  recentRequests.push(now);
  rateLimit.set(ip, recentRequests);

  return NextResponse.next();
}
```

### Input Validation
```typescript
// Zod를 이용한 입력 검증
import { z } from 'zod';

const memberSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^010-\d{4}-\d{4}$/),
  birth_date: z.string().date()
});

// 사용
const validated = memberSchema.parse(inputData);
```

### XSS 방어
```typescript
// React는 기본적으로 XSS 방어
// dangerouslySetInnerHTML 사용 금지

// ❌ 위험
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 안전
<div>{userInput}</div>
```

### SQL Injection 방어
```typescript
// Supabase SDK는 자동으로 파라미터화된 쿼리 사용
// ✅ 안전
const { data } = await supabase
  .from('members')
  .select('*')
  .eq('email', userEmail); // 자동 이스케이프

// ❌ Raw SQL은 주의 (사용 시 반드시 파라미터화)
```

---

## 보안 체크리스트

### 개발 단계
- [ ] 모든 테이블에 RLS 활성화
- [ ] RLS 정책 정의 및 테스트
- [ ] Input validation 구현
- [ ] HTTPS 강제 (개발 환경 제외)
- [ ] 환경 변수로 시크릿 관리 (`.env.local`)
- [ ] Service Role Key 클라이언트 노출 금지

### 배포 전
- [ ] 프로덕션 환경 변수 확인 (`.env.production`)
- [ ] HTTPS 인증서 확인 (Let's Encrypt)
- [ ] Nginx Rate Limiting 설정
- [ ] Nginx 보안 헤더 설정
- [ ] UFW 방화벽 설정
- [ ] Fail2ban 설정 (DDoS 방어)
- [ ] Docker 컨테이너 보안 설정
- [ ] 백업 자동화 설정
- [ ] 모니터링 및 알림 설정

### 운영 중
- [ ] 주기적 보안 감사 (월 1회)
- [ ] 로그 모니터링
- [ ] 비정상 접근 탐지
- [ ] 정기 백업 확인
- [ ] 의존성 업데이트 (보안 패치)

---

## 보안 사고 대응

### 1. 의심 활동 탐지
```sql
-- 비정상 로그인 시도 확인
SELECT user_id, COUNT(*) as failed_attempts
FROM auth.audit_log_entries
WHERE action = 'login' AND result = 'failure'
AND created_at > now() - interval '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 5;
```

### 2. 침해 사고 발생 시
1. **즉시 조치**
   - 해당 계정 비활성화
   - 세션 강제 종료
   - 관련 로그 수집

2. **영향 범위 파악**
   - 접근한 데이터 확인
   - 영향 받은 사용자 식별

3. **복구**
   - 패치 적용
   - 취약점 제거
   - 백업으로부터 복구 (필요시)

4. **사후 조치**
   - 사용자 알림
   - 보안 정책 업데이트
   - 재발 방지 대책 수립

---

## 규정 준수

### GDPR (유럽 개인정보보호법)
- [ ] 사용자 동의 관리
- [ ] 데이터 이동권 (Data Portability)
- [ ] 삭제권 (Right to be Forgotten)
- [ ] 데이터 최소화

### 한국 개인정보보호법
- [ ] 개인정보 수집 동의
- [ ] 제3자 제공 동의 (PG사 등)
- [ ] 개인정보 보유 기간 명시
- [ ] 파기 절차 수립

---

## 관련 문서
- [RLS 정책 가이드](../database/rls-policies/README.md)
- [인증 가이드](./authentication.md)
- [인가 가이드](./authorization.md)
- [데이터 보호](./data-protection.md)

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026년 2월 16일  
**다음 검토일**: 2026년 3월 16일
