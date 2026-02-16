# BCL Portal API 명세서

> Version: 1.0.0  
> Last Updated: 2026-02-16

---

## 📋 목차
- [개요](#개요)
- [인증](#인증)
- [공통 응답 형식](#공통-응답-형식)
- [에러 코드](#에러-코드)
- [API 엔드포인트](#api-엔드포인트)

---

## 개요

### Base URL
- **개발:** `http://localhost:3000/api`
- **스테이징:** `https://staging.bcl-portal.com/api`
- **프로덕션:** `https://api.bcl-portal.com`

### 인증 방식
- **Type:** Bearer Token (Supabase JWT)
- **Header:** `Authorization: Bearer <token>`

### Content-Type
- **Request:** `application/json`
- **Response:** `application/json`

---

## 인증

### 로그인
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "member"
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 3600
    }
  }
}
```

### 로그아웃
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "로그아웃되었습니다."
}
```

---

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { ... },
  "message": "작업이 성공적으로 완료되었습니다."
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": 2001,
    "message": "수업 정원이 마감되었습니다.",
    "details": {
      "session_id": "uuid",
      "current_capacity": 15,
      "max_capacity": 15
    }
  }
}
```

### 페이지네이션
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## 에러 코드

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 1001 | 인증 실패 | 이메일 또는 비밀번호가 올바르지 않습니다 |
| 1002 | 세션 만료 | 세션이 만료되었습니다 |
| 1003 | 권한 없음 | 접근 권한이 없습니다 |
| 2001 | 정원 마감 | 수업 정원이 마감되었습니다 |
| 2002 | 중복 예약 | 이미 예약한 수업입니다 |
| 2003 | 잔여 횟수 부족 | 잔여 횟수가 부족합니다 |
| 3001 | 이용권 만료 | 이용권이 만료되었습니다 |
| 4001 | 결제 실패 | 결제에 실패했습니다 |
| 5001 | 유효성 검사 실패 | 입력값이 올바르지 않습니다 |
| 9001 | 내부 오류 | 일시적인 오류가 발생했습니다 |

---

## API 엔드포인트

### 회원 관리 (Members)

#### 회원 목록 조회
```http
GET /admin/members?page=1&limit=20&status=active&search=김철수
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 항목 수 (기본값: 20)
- `status` (optional): 회원 상태 (`active`, `inactive`, `pending`)
- `search` (optional): 검색어 (이름, 이메일, 전화번호)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "김철수",
      "email": "kim@example.com",
      "phone": "010-1234-5678",
      "status": "active",
      "membership": {
        "plan_name": "3개월 무제한",
        "start_date": "2026-01-01",
        "end_date": "2026-04-01",
        "remaining_credits": null
      },
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### 회원 상세 조회
```http
GET /admin/members/:id
Authorization: Bearer <admin_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "김철수",
    "email": "kim@example.com",
    "phone": "010-1234-5678",
    "birth_date": "1990-01-01",
    "gender": "male",
    "emergency_contact": "010-9876-5432",
    "medical_notes": "무릎 부상 이력",
    "status": "active",
    "memberships": [
      {
        "id": "uuid",
        "plan": {
          "name": "3개월 무제한",
          "type": "period"
        },
        "start_date": "2026-01-01",
        "end_date": "2026-04-01",
        "status": "active"
      }
    ],
    "booking_history": [
      {
        "session_id": "uuid",
        "session_title": "Morning CrossFit",
        "session_date": "2026-02-16",
        "status": "confirmed"
      }
    ],
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

#### 회원 생성
```http
POST /admin/members
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "김철수",
  "email": "kim@example.com",
  "phone": "010-1234-5678",
  "birth_date": "1990-01-01",
  "gender": "male",
  "emergency_contact": "010-9876-5432"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "김철수",
    "email": "kim@example.com"
  },
  "message": "회원이 생성되었습니다."
}
```

---

### 수업 관리 (Sessions)

#### 수업 목록 조회
```http
GET /sessions?date=2026-02-16&facility_id=uuid
Authorization: Bearer <token>
```

**Query Parameters:**
- `date` (required): 조회 날짜 (YYYY-MM-DD)
- `facility_id` (optional): 지점 ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Morning CrossFit",
      "description": "고강도 크로스핏",
      "session_date": "2026-02-16",
      "start_time": "09:00:00",
      "end_time": "10:00:00",
      "capacity": 15,
      "current_bookings": 12,
      "intensity_level": "advanced",
      "coaches": [
        {
          "id": "uuid",
          "name": "박코치",
          "role": "primary"
        }
      ],
      "status": "scheduled"
    }
  ]
}
```

#### 수업 예약
```http
POST /sessions/:id/book
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "membership_id": "uuid"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "booking_id": "uuid",
    "session": {
      "id": "uuid",
      "title": "Morning CrossFit",
      "session_date": "2026-02-16",
      "start_time": "09:00:00"
    },
    "status": "confirmed"
  },
  "message": "예약이 완료되었습니다."
}
```

**Error Response (409 Conflict):**
```json
{
  "success": false,
  "error": {
    "code": 2001,
    "message": "수업 정원이 마감되었습니다.",
    "details": {
      "current_capacity": 15,
      "max_capacity": 15,
      "waitlist_available": true
    }
  }
}
```

#### 예약 취소
```http
DELETE /bookings/:id
Authorization: Bearer <member_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "예약이 취소되었습니다."
}
```

---

### 체크인 (Check-in)

#### QR 코드 생성
```http
GET /checkin/qr
Authorization: Bearer <member_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "qr_code": "data:image/png;base64,...",
    "token": "encrypted_token",
    "expires_at": "2026-02-16T10:03:00Z"
  }
}
```

#### 체크인 처리
```http
POST /checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "encrypted_token",
  "method": "qr"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "checkin_id": "uuid",
    "member": {
      "id": "uuid",
      "name": "김철수"
    },
    "session": {
      "id": "uuid",
      "title": "Morning CrossFit"
    },
    "checkin_time": "2026-02-16T09:00:00Z"
  },
  "message": "체크인이 완료되었습니다."
}
```

---

### 결제 (Payments)

#### 결제 생성
```http
POST /payments
Authorization: Bearer <member_token>
Content-Type: application/json

{
  "plan_id": "uuid",
  "payment_method": "card",
  "amount": 150000
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "pg_transaction_id": "toss_12345",
    "amount": 150000,
    "status": "pending",
    "payment_url": "https://payment-gateway.com/..."
  }
}
```

#### 결제 확인
```http
GET /payments/:transaction_id
Authorization: Bearer <member_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "transaction_id": "uuid",
    "amount": 150000,
    "status": "completed",
    "completed_at": "2026-02-16T09:00:00Z",
    "membership": {
      "id": "uuid",
      "plan_name": "3개월 무제한",
      "start_date": "2026-02-16",
      "end_date": "2026-05-16"
    }
  }
}
```

---

## Rate Limiting

- **Rate Limit:** 100 requests per minute per user
- **Header:**
  - `X-RateLimit-Limit: 100`
  - `X-RateLimit-Remaining: 95`
  - `X-RateLimit-Reset: 1676534400`

**Rate Limit Exceeded (429):**
```json
{
  "success": false,
  "error": {
    "code": 9002,
    "message": "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    "retry_after": 60
  }
}
```

---

## Webhooks

### 예약 생성 알림
```http
POST <webhook_url>
Content-Type: application/json

{
  "event": "booking.created",
  "timestamp": "2026-02-16T09:00:00Z",
  "data": {
    "booking_id": "uuid",
    "member_id": "uuid",
    "session_id": "uuid"
  }
}
```

### 결제 완료 알림
```http
POST <webhook_url>
Content-Type: application/json

{
  "event": "payment.completed",
  "timestamp": "2026-02-16T09:00:00Z",
  "data": {
    "transaction_id": "uuid",
    "amount": 150000,
    "member_id": "uuid"
  }
}
```

---

**API 문서 버전:** 1.0.0  
**최종 업데이트:** 2026년 2월 16일
