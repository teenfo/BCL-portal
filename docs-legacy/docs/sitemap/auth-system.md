# Authentication System Design (`/auth/*`)

이 문서는 BCL Portal의 공통 인증 시스템 화면 구조와 기능을 정의합니다.

---

> [!NOTE]
> 전체 서비스 구조 및 공통 라우팅 규칙은 [**Global Sitemap Index**](./README.md)를 참고하십시오.

## 1. 🔐 인증 화면 구조

### 1) 로그인 (`/auth/login`)
- **입력 필드**: 이메일, 비밀번호
- **Remember Me**: 로그인 상태 유지 옵션
- **소셜 로그인**: Google, Kakao (Phase 2)
- **링크**: 비밀번호 찾기, 회원가입
- **역할별 리다이렉트**: 
  - Admin → `/admin/dashboard`
  - Coach → `/coach/dashboard`
  - Member → `/apps/dashboard`

### 2) 회원가입 (`/auth/signup`)
- **Step 1**: 이메일/비밀번호 입력
- **Step 2**: 기본 정보 (이름, 전화번호, 생년월일)
- **Step 3**: 약관 동의 (서비스 이용약관, 개인정보 처리방침)
- **이메일 인증**: 가입 후 인증 메일 발송
- **자동 로그인**: 가입 완료 후 자동 로그인

### 3) 비밀번호 재설정 (`/auth/reset-password`)
- **Step 1**: 이메일 입력
- **Step 2**: 이메일로 받은 인증 링크 클릭
- **Step 3**: 새 비밀번호 입력 및 확인
- **보안**: 링크 유효기간 1시간

### 4) 이메일 인증 (`/auth/email-verify`)
- **성공 화면**: 인증 완료 메시지 + 자동 로그인
- **실패 화면**: 인증 실패 메시지 + 재발송 버튼
- **만료 처리**: 링크 만료 시 재발송 안내

### 5) 로그아웃 (`/auth/logout`)
- **세션 종료**: JWT 토큰 삭제
- **리다이렉트**: `/auth/login`으로 자동 이동

---

## 2. 🛠️ 기술 아키텍처

### 인증 방식
- **Provider**: Supabase Auth
- **Token**: JWT (Access Token + Refresh Token)
- **Storage**: `httpOnly` Cookie (보안 강화)
- **Session**: 7일 (Remember Me 활성화 시 30일)

### 보안
- **비밀번호**:
  - 최소 8자
  - 영문 대소문자, 숫자, 특수문자 중 3가지 이상
  - bcrypt 해싱 (Supabase 기본)
- **CSRF 방어**: Next.js Server Actions 자동 방어
- **Rate Limiting**: 
  - 로그인 실패 5회 시 10분 차단
  - 회원가입 IP당 시간당 3회 제한

### RLS 정책 연동
- 로그인 성공 시 JWT에 `role` 클레임 포함
- RLS 정책에서 `auth.uid()` 및 `role` 검증

---

## 3. 🎨 UI/UX 설계

### 공통 디자인
- **스타일**: Glassmorphism, Dark Mode 기본
- **컬러**: BCL Orange (#FF6B00) Primary
- **폼**: Floating Label, Bottom Border
- **버튼**: Gradient, Shadow, Hover Effect

### 유효성 검증
- **실시간 검증**: 입력 중 즉시 피드백
- **에러 메시지**: 명확하고 친절한 안내
- **성공 피드백**: 체크 아이콘, 초록색 테두리

### 반응형
- **모바일**: 전체 화면 폼
- **데스크탑**: 중앙 정렬 카드 (max-width: 480px)

---

## 4. 🚨 에러 처리

### 일반 에러
- **1001**: 이메일 또는 비밀번호가 올바르지 않습니다
- **1002**: 이미 가입된 이메일입니다
- **1003**: 이메일 인증이 필요합니다
- **1004**: 계정이 비활성화되었습니다 (관리자 문의)

### 네트워크 에러
- **타임아웃**: "네트워크 연결을 확인해주세요"
- **서버 에러**: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요"

---

## 5. 📱 소셜 로그인 (Phase 2)

### 지원 Provider
- **Google**: OAuth 2.0
- **Kakao**: REST API

### 플로우
```
1. 소셜 로그인 버튼 클릭
2. Provider 인증 페이지로 리다이렉트
3. 사용자 동의 후 Callback
4. Supabase에서 계정 자동 생성
5. 역할별 대시보드로 이동
```

---

## 6. 🔄 세션 관리

### 자동 갱신
- Access Token 만료 10분 전 자동 갱신
- Refresh Token으로 무중단 갱신

### 로그아웃 트리거
- 사용자 직접 로그아웃
- Refresh Token 만료
- 보안 정책 위반 (다른 기기 로그인 등)

---

## 7. 📊 사용자 여정 (User Journey)

### 신규 회원
```
회원가입 → 이메일 인증 → 로그인 → 대시보드
```

### 기존 회원
```
로그인 → 대시보드
```

### 비밀번호 분실
```
비밀번호 재설정 → 이메일 확인 → 새 비밀번호 설정 → 로그인
```

---

## 관련 문서
- [Global Sitemap](./README.md)
- [Security Guide](../security/README.md)
- [API Specification](../API_SPECIFICATION.md)

---

**문서 버전**: 1.0  
**최종 업데이트**: 2026년 2월 16일
