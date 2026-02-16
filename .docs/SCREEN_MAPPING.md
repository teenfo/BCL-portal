# BCL Portal - Screen to Route Mapping

이 문서는 StitchMCP에서 생성된 모든 화면과 사이트맵 라우트를 매핑합니다.

---

## 📋 매핑 정보

각 화면은 다음 정보를 포함합니다:
- **Screen ID**: StitchMCP 고유 식별자
- **Screen Title**: 화면 제목
- **Route**: 사이트맵의 실제 라우트 경로
- **Component Path**: 구현될 컴포넌트 파일 경로
- **Screenshot**: 화면 이미지 URL (개발 참조용)
- **Stitch Project**: `BCL Portal` (ID: `432557053076320380`)

---

## 1️⃣ Authentication System (/auth/*)

### Login Screen
- **Screen ID**: `4c4c1bcb99ac41708d5c75102877a10a`
- **Title**: BCL Portal Login Screen
- **Route**: `/auth/login`
- **Component**: `src/app/auth/login/page.tsx`
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidUrdAeHlhAMKT-Zg_DhZSaSsgSTQ4Uio2aTdKH7e13NKEoMMJK1fItMb20cLSSC2vBSk42uIDX_zEgiVWGFUwicbKcqkRa2js_HtMGZOWSoqQh2zeUfZQjPeEsV6ysZv2-t00qt1DRrYFMEYcLS3K7M_Ulx0EO9QOjIcLx1QCOce9dt7lA82AeX4L9pW1D51knbI5H4O_laPYkmNRAI2bNxl90VpDl4N5f3jTVei2vxhF_JmvC8YO0Q)
- **Design Notes**: 
  - Large BCL logo with orange glow
  - Floating label inputs
  - Social login (Google, Kakao)
  - Remember Me checkbox
  - Glassmorphism background

### Signup Screen (Step 1/3)
- **Screen ID**: `6d5abb0ded48484083244a7221d3c2f5`
- **Title**: BCL Portal Sign Up Step 1
- **Route**: `/auth/signup` (Step 1)
- **Component**: `src/app/auth/signup/page.tsx`
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidU3qjlkHUACJNH_zte-zXxDIsVnoO2MRANOixkRJ30iuOVOkz55mHiE9x7gmCWwdOfZ_6rAPKFe2RvQmXTTSNtodFLFP0XWUcaDKYyS_FhMax0XZzRgH-2laQxzhZA83XX-bTYPQqIGjQWDQSwLwD_esOPS8e1w8GlvBnp_rQ-wyH45CDAlYje-JiMA7RBWgoNAb85pYJBtBLWqY8hD_GL79KAgsDevrrH11yFtxMEKCuOuDj6xvkiD8g)
- **Design Notes**:
  - Progress indicator (1/3)
  - Email & Password fields
  - "Next" CTA button
  - Multi-step form

### Password Reset Screen
- **Screen ID**: `07d3a84f6858440b9111e87789b6b623`
- **Title**: BCL Portal Password Reset
- **Route**: `/auth/reset-password`
- **Component**: `src/app/auth/reset-password/page.tsx`
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidXDZr_TGepUjoa39kXljXWagBuOyeeDNg-MQiH_GEEItPZ8xhZIR1lENDW-fj_7O7VQRsalB47vxfgzG5qSH3J4Vxz4t-_5Ltsh--VNCNDf_alBnflRHQ9dCrbFJ5g-7AGAzNg4FLywi-WjZX8nPEe4lvXCNSbIBOOpyGLfItI_yG9SpOtrtcdTV75MkuRz8tjncnwN0aA8qlDUyyMps3n3YyOMlHugD5oqIRMpb6pzNq5cK9_GvASS)
- **Design Notes**:
  - "We'll send you a reset link" description
  - Email input field
  - "Back to Login" link
  - Clean, simple layout

### Email Verification Screen
- **Screen ID**: `5566548752d14a9180fad20e4f37d306`
- **Title**: BCL Portal Email Verified
- **Route**: `/auth/email-verify`
- **Component**: `src/app/auth/email-verify/page.tsx`
- **Screenshot**: [View](https://lh3.googleusercontent.com/aida/AOfcidWhsGMKGcw6S9pW5wFfLiEbs14__BP4BNd4Cmn1tgX166Xoo5f8i1_9abbEYh0yh2A3MKpJKgAWbW6yGHiJdGBJZlkFIsZ-yqRv0I_gC0yhjhmoP8lFXTV8QSTb7VrSKdwGMqbfRVzTB4tW3NJn7sxXb63PAzCBlfJvUpk5X3GB5XnQ4imvGXZamQeR3gydLGu4ZvPkIejcQcqvWL60aPufg1AfZjT4EioDryO3ugNPLu_6Tkruq7eK1A)
- **Design Notes**:
  - Large green checkmark with glow
  - Auto-redirect countdown (3s)
  - Success state animation
  - Celebratory design

---

## 2️⃣ User Application - Core Features (/apps/*)

_화면 생성 대기 중..._

**예정 화면 (8개)**:
1. Dashboard / Home
2. Profile
3. Schedule / Timetable
4. Check-in (QR)
5. Facilities
6. Purchase Membership
7. Feedback
8. Records

---

## 3️⃣ User Application - Extended Features (/apps/*)

_화면 생성 대기 중..._

**예정 화면 (3개)**:
1. Notifications
2. Settings
3. Support / FAQ

---

## 4️⃣ Coach Application (/coach/*)

_화면 생성 대기 중..._

**예정 화면 (5개)**:
1. Coach Dashboard
2. My Sessions
3. Session Detail (WOD Editor)
4. Member List
5. Attendance Management

---

## 5️⃣ Admin Portal - Core (/admin/*)

_화면 생성 대기 중..._

**예정 화면 (5개)**:
1. Admin Dashboard
2. Member Management
3. Reservation Management
4. Payment History
5. Session Scheduling

---

## 6️⃣ Admin Portal - CRM & Settings (/admin/*)

_화면 생성 대기 중..._

**예정 화면 (4개)**:
1. Notice Management
2. Support Tickets
3. Facility Settings
4. System Settings

---

## 7️⃣ Class Portal (/class/*)

_화면 생성 대기 중..._

**예정 화면 (4개)**:
1. WOD Board (Display)
2. Timer (Fullscreen)
3. Leaderboard
4. Settings

---

## 8️⃣ Kiosk Application (/kiosk/*)

_화면 생성 대기 중..._

**예정 화면 (4개)**:
1. Check-in Main
2. Face Recognition
3. QR Scan
4. Success Confirmation

---

## 📊 생성 현황

| Phase | 카테고리 | 완료 | 총 | 진행률 |
|:------|:---------|:----:|:--:|:------:|
| 1 | Authentication | 4 | 4 | ✅ 100% |
| 2 | User Core | 0 | 8 | ⏳ 0% |
| 3 | User Extended | 0 | 3 | ⏳ 0% |
| 4 | Coach | 0 | 5 | ⏳ 0% |
| 5 | Admin Core | 0 | 5 | ⏳ 0% |
| 6 | Admin CRM | 0 | 4 | ⏳ 0% |
| 7 | Class Portal | 0 | 4 | ⏳ 0% |
| 8 | Kiosk | 0 | 4 | ⏳ 0% |
| **총계** | **All** | **4** | **37** | **10.8%** |

---

## 🔗 Stitch MCP 정보

- **Project Name**: BCL Portal
- **Project ID**: `432557053076320380`
- **Project URL**: [View in Stitch](https://stitch.google.com)
- **Design Theme**: 
  - Dark Mode
  - Lexend Font
  - 8px Roundness
  - Primary Color: #ff6a00 (BCL Orange)
  - Glassmorphism Style

---

## 📝 사용 방법

### 개발 시 참조
1. Screen ID로 Stitch에서 디자인 확인
2. Screenshot 링크로 UI 참조
3. Component Path에 구현
4. Design Notes 참고하여 구현

### Screen ID로 Stitch 디자인 조회
```bash
# MCP Tool 사용
mcp_StitchMCP_get_screen(
  projectId = "432557053076320380",
  screenId = "4c4c1bcb99ac41708d5c75102877a10a"
)
```

---

**최종 업데이트**: 2026-02-17 01:32 KST  
**다음 업데이트**: User Core 화면 생성 후
