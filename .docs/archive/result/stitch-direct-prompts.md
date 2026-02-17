# BCL Portal - Stitch 직접 생성 프롬프트

이 문서는 Stitch 웹 UI에서 화면을 직접 생성할 때 사용할 프롬프트 모음입니다.

**프로젝트 ID**: `432557053076320380`

**사용 방법**:
1. Stitch 웹 UI에 로그인
2. BCL Portal 프로젝트 선택
3. 아래 프롬프트를 복사하여 화면 생성
4. 생성 완료 후 MCP로 Screen ID 읽어서 매핑

---

## 📋 템플릿 참조 (이미 생성됨)

### Design Systems
- **Dark Mode**: `b2ddc51f0287441e9b1fda66e40d038e`
- **Light Mode**: `4d1547c666494965bdac8b3a144e24a5`

### Layout Templates
- **Mobile App (Dark)**: `d97f6e555b434791906bb1203c9b48f6`
- **Mobile App (Light)**: `a524634378564466874b668ad75385a2`
- **Desktop Admin (Dark)**: `59fa62844a9449459c2678c734be4d1a`
- **Desktop Admin (Light)**: `1c7255e315ad4ee4a29e6b2113ca47f1`
- **Auth (Dark)**: `f135d9e6a7c346a69bb25aac647f67f8`
- **Auth (Light)**: `99ebe63934c34d8cb4973f9547bf8de7`
- **Fullscreen Display (Dark)**: `a5902b8e809644f08fcb79e62d4157e5`
- **Fullscreen Display (Light)**: `a51e1c4e97af41a6ad3aa664a9102d49`

---

## 🔐 1. Authentication Screens (Auth Template 기반)

### 1-1. Login (Dark)
```
Create a LOGIN screen for BCL Portal (DARK MODE).
Use the same layout structure as template screen ID f135d9e6a7c346a69bb25aac647f67f8.

- **Logo**: BCL with orange glow, "Bundang Crossfit Lounge" tagline
- **Card Title**: "Welcome Back"
- **Inputs**: 
  * Email (floating label)
  * Password (with show/hide toggle, floating label)
- **Remember Me** checkbox
- **Primary Button**: "Login" (BCL Orange gradient #FF6B00)
- **Links**: "Forgot Password?" | "Sign Up"
- **Footer**: "© 2026 BCL Portal. All rights reserved."

Theme: Dark (#1A1A1A background, #262626 glassmorphism card)
Device: Mobile (375x812)
```

### 1-2. Login (Light)
```
Create a LOGIN screen for BCL Portal (LIGHT MODE).
Same structure as dark login, different colors.

- **Logo**: BCL (dark with orange), "Bundang Crossfit Lounge"
- **Card Title**: "Welcome Back"
- **Inputs**: Email, Password (same as dark)
- **Remember Me** checkbox
- **Button**: "Login" (orange gradient)
- **Links**: "Forgot Password?" | "Sign Up"
- **Footer**: "© 2026 BCL Portal"

Theme: Light (#FAFAFA background, #FFFFFF card with shadow)
Device: Mobile
```

### 1-3. Sign Up Step 1 (Dark)
```
Create a SIGN UP (Step 1) screen for BCL Portal (DARK MODE).
Use auth template layout.

- **Logo & Tagline** (BCL)
- **Progress**: "Step 1 of 3" indicator
- **Card Title**: "Create Account"
- **Inputs**:
  * Full Name
  * Email
  * Phone Number
  * Password (with strength indicator)
  * Confirm Password
- **Primary Button**: "Continue" (orange gradient)
- **Link**: "Already have an account? Login"
- **Footer**: "© 2026 BCL Portal"

Theme: Dark, glassmorphism
Device: Mobile
```

### 1-4. Sign Up Step 1 (Light)
```
Same as 1-3 but LIGHT MODE.
Background: #FAFAFA, Card: #FFFFFF with shadow.
Device: Mobile
```

### 1-5. Password Reset (Dark)
```
Create a PASSWORD RESET screen for BCL Portal (DARK MODE).

- **Logo & Tagline** (BCL)
- **Card Title**: "Reset Password"
- **Description**: "Enter your email and we'll send you a reset link"
- **Input**: Email Address
- **Primary Button**: "Send Reset Link" (orange)
- **Links**: "Remember password? Login" | "Contact Support"
- **Footer**: "© 2026 BCL Portal"

Theme: Dark, glassmorphism
Device: Mobile
```

### 1-6. Password Reset (Light)
```
Same as 1-5 but LIGHT MODE.
Device: Mobile
```

### 1-7. Email Verified (Dark)
```
Create an EMAIL VERIFIED success screen for BCL Portal (DARK MODE).

- **Logo & Tagline** (BCL)
- **Success Icon**: Large green checkmark
- **Heading**: "Email Verified!"
- **Message**: "Your account has been successfully verified"
- **Account Info**:
  * Email: "john@example.com"
  * Member Since: "February 2026"
- **Primary Button**: "Continue to Dashboard" (orange)
- **Footer**: "© 2026 BCL Portal"

Theme: Dark
Device: Mobile
```

### 1-8. Email Verified (Light)
```
Same as 1-7 but LIGHT MODE.
Device: Mobile
```

---

## 📱 2. User App Screens (Mobile Template 기반)

### 2-1. Home Dashboard (Dark)
```
Create a HOME DASHBOARD for BCL Portal members (DARK MODE).
Use mobile app template structure (bottom nav).

- **Header**: "Welcome back, John" + circular profile photo
- **Today's Class Card** (glassmorphism):
  * "Next Class: CrossFit WOD"
  * Time: "6:00 PM - 7:00 PM"
  * Coach: "Sarah Kim"
  * Countdown: "Starting in 2h 15m"
  * "Check-in" button (orange)
- **Membership Card**:
  * "Unlimited Monthly"
  * "Expiring: D-24 days"
  * "12 sessions left"
- **Announcements** (3 items):
  * "New class schedule for March"
  * "Holiday closure: Feb 20-22"
  * "Nutrition workshop this Saturday"
- **Bottom Nav**: Home (active/orange), Schedule, Check-in, Facilities, Profile
- **FAB**: "Book Class" (orange)

Theme: Dark (#1A1A1A, glassmorphism #262626)
Device: Mobile
```

### 2-2. Home Dashboard (Light)
```
Same as 2-1 but LIGHT MODE.
Background: #FAFAFA, Cards: #FFFFFF with shadows.
Device: Mobile
```

### 2-3. Schedule & Booking (Dark)
```
Create a CLASS SCHEDULE screen for BCL Portal (DARK MODE).

- **Header**: "Class Schedule"
- **Week Calendar**: Mon-Sun horizontal, Today (Wed) highlighted orange
- **Filter Chips**: "All Coaches", "All Levels", "All Times"
- **Class Cards** (vertical list):
  * "CrossFit WOD" | 6:00 PM | Coach Sarah | Intermediate | 12/15 spots | "Book" (orange)
  * "Olympic Lifting" | 7:30 PM | Coach Mike | Advanced | 8/10 spots | "Book"
  * "Gymnastics" | 9:00 AM Tomorrow | Coach Lisa | Beginner | 15/15 FULL | "Waitlist" (gray)
- **Bottom Nav**: Schedule (active/orange)

Theme: Dark, glassmorphism
Device: Mobile
```

### 2-4. Schedule & Booking (Light)
```
Same as 2-3 but LIGHT MODE.
Device: Mobile
```

### 2-5. QR Check-in (Dark)
```
Create a QR CHECK-IN screen for BCL Portal (DARK MODE).

- **Header**: "Check-in"
- **Large QR Code** (center, animated)
- **Refresh Timer**: "Refreshes in 25s"
- **Member Info**:
  * "John Smith"
  * "Unlimited Member"
- **Monthly Attendance Grid** (mini calendar)
- **Stats Cards**:
  * "This Month": "12 workouts"
  * "Total": "248 workouts"
- **Instructions**: "Show this QR at entrance kiosk"
- **Bottom Nav**: Check-in (active/orange)

Theme: Dark
Device: Mobile
```

### 2-6. QR Check-in (Light)
```
Same as 2-5 but LIGHT MODE.
Device: Mobile
```

### 2-7. Facilities Guide (Dark)
```
Create a FACILITIES GUIDE screen for BCL Portal (DARK MODE).

- **Header**: "Our Facilities"
- **Facility Cards** (vertical):
  * **Main Gym Area**:
    - Photo placeholder
    - "350㎡ Olympic lifting platforms"
    - "Available: 6AM - 10PM"
  * **Cardio Zone**:
    - Photo
    - "Rowing, Ski Erg, Bike - 25+ machines"
  * **Shower & Locker Rooms**:
    - Photo
    - "24-hour access for members"
  * **Recovery Room**:
    - Photo
    - "Foam rollers, massage guns, stretching area"
- **Operating Hours Card**
- **Bottom Nav**: Facilities (active/orange)

Theme: Dark, glassmorphism
Device: Mobile
```

### 2-8. Facilities Guide (Light)
```
Same as 2-7 but LIGHT MODE.
Device: Mobile
```

### 2-9. User Profile (Dark)
```
Create a USER PROFILE screen for BCL Portal (DARK MODE).

- **Header**: Circular avatar, "John Smith", "Edit Profile" button
- **Membership Card**:
  * "Unlimited Monthly"
  * "Expiry: March 24, 2026"
  * "Renew Now" button (orange)
- **Stats Grid**:
  * Total Workouts: 248
  * This Month: 12
  * Streak: 5 days
- **Menu List**:
  * My Bookings
  * Payment History
  * Settings
  * Support
  * Logout (red text)
- **Bottom Nav**: Profile (active/orange)

Theme: Dark
Device: Mobile
```

### 2-10. User Profile (Light)
```
Same as 2-9 but LIGHT MODE.
Device: Mobile
```

### 2-11. Workout Records (Dark)
```
Create a WORKOUT RECORDS screen for BCL Portal (DARK MODE).

- **Header**: "My Workout Records"
- **Filter Tabs**: "All", "This Month", "Personal Bests"
- **Monthly Summary**:
  * "12 workouts this month"
  * "3 personal records"
- **Workout Timeline** (vertical):
  * **Today 6:00 PM** - "CrossFit WOD"
    - Time: 4:45
    - Coach: Sarah
    - Note: "PR on thrusters!"
  * **Yesterday** - "Olympic Lifting"
    - Max snatch: 85kg
    - Coach: Mike
  * **Feb 14** - "Gymnastics"
    - Skill work: Muscle-ups
    - Coach: Lisa
- **Bottom Nav**: Home

Theme: Dark, glassmorphism
Device: Mobile
```

### 2-12. Workout Records (Light)
```
Same as 2-11 but LIGHT MODE.
Device: Mobile
```

### 2-13. Membership Purchase (Dark)
```
Create a MEMBERSHIP PURCHASE screen for BCL Portal (DARK MODE).

- **Header**: "Choose Your Plan"
- **Plan Cards** (vertical):
  * **Unlimited Monthly**:
    - ₩180,000/month
    - Unlimited classes
    - 1 guest pass/month
    - "Most Popular" badge (orange)
    - "Select" button
  * **10-Class Pack**:
    - ₩150,000
    - Valid for 2 months
    - "Select" button
  * **Single Drop-in**:
    - ₩20,000
    - 1 class
    - "Select" button
- **Benefits List**:
  * All facilities access
  * Free locker
  * Mobile app tracking
- **Bottom Nav**: Profile

Theme: Dark, glassmorphism
Device: Mobile
```

### 2-14. Membership Purchase (Light)
```
Same as 2-13 but LIGHT MODE.
Device: Mobile
```

### 2-15. Feedback Submission (Dark)
```
Create a FEEDBACK SUBMISSION screen for BCL Portal (DARK MODE).

- **Header**: "Submit Feedback"
- **Recent Class Card**:
  * "CrossFit WOD - Feb 16, 6PM"
  * Coach: Sarah Kim
- **Rating**: 5-star selector
- **Categories** (multi-select chips):
  * Coaching Quality
  * Facility Cleanliness
  * Equipment
  * Atmosphere
- **Comment Box**: "Share your experience..."
- **Photos Upload** (optional)
- **Submit Button** (orange)
- **Bottom Nav**: Home

Theme: Dark
Device: Mobile
```

### 2-16. Feedback Submission (Light)
```
Same as 2-15 but LIGHT MODE.
Device: Mobile
```

---

## 💼 3. Admin Portal Screens (Desktop Template 기반)

### 3-1. Admin Dashboard (Dark)
```
Create an ADMIN DASHBOARD for BCL Portal (DARK MODE).
Use desktop admin template with sidebar.

- **Page Title**: "Dashboard Overview"
- **Stat Cards** (4-column grid):
  * "Today's Revenue": "₩1,250,000" (+12% vs yesterday)
  * "Active Members": "342" (+5 new this week)
  * "Today's Bookings": "45" (89% capacity)
  * "Current Attendance": "28" (live pulse indicator)
- **Revenue Chart**: Line graph (last 30 days trend, orange gradient)
- **Recent Activity Table**:
  * Columns: Time, Member, Action, Amount
  * 5 recent rows (bookings, payments, check-ins)
- **Quick Actions Panel**:
  * "Add New Member" button
  * "Create Class" button
  * "Send Announcement" button
- **Sidebar**: Dashboard (active/orange)

Theme: Dark (#1A1A1A, glassmorphism)
Device: Desktop (1440x900)
```

### 3-2. Admin Dashboard (Light)
```
Same as 3-1 but LIGHT MODE.
Background: #FAFAFA, Sidebar: #FFFFFF.
Device: Desktop
```

### 3-3. Members Management (Dark)
```
Create a MEMBERS MANAGEMENT screen for BCL Portal admin (DARK MODE).

- **Page Title**: "Members Management"
- **Search Bar**: "Search by name, email, phone..."
- **Filters**: Membership Status dropdown, Join Date picker
- **Action**: "Export CSV" button
- **Members Table**:
  * Columns: Photo, Name, Email, Phone, Membership, Expiry, Last Visit, Actions
  * Row example: Kim Minho | kim@example.com | 010-1234-5678 | Unlimited Monthly | D-24 | Today | [Edit/View]
  * 10-15 rows visible
- **Pagination**: "Page 1 of 14 (342 total members)"
- **Sidebar**: Finance > Members (active/orange)

Theme: Dark, glassmorphism table
Device: Desktop
```

### 3-4. Members Management (Light)
```
Same as 3-3 but LIGHT MODE.
Device: Desktop
```

### 3-5. Class Schedule Management (Dark)
```
Create a CLASS SCHEDULE MANAGEMENT screen for admin (DARK MODE).

- **Page Title**: "Class Schedule"
- **Week Selector**: Mon-Sun tabs
- **Time Grid**: 6AM - 10PM vertical slots
- **Class Blocks** (calendar view):
  * 6:00 AM: "CrossFit WOD" | Sarah | 12/15 booked (orange border)
  * 7:30 AM: "Olympic Lifting" | Mike | 8/10
  * (Multiple blocks throughout day)
- **Right Panel**: "Create New Class" form
  * Class Type dropdown
  * Coach selector
  * Time picker
  * Max capacity input
  * "Create" button (orange)
- **Quick Filters**: "All Coaches", "All Facilities"
- **Export**: "Export Schedule" button
- **Sidebar**: Operations > Schedule (active/orange)

Theme: Dark
Device: Desktop
```

### 3-6. Class Schedule Management (Light)
```
Same as 3-5 but LIGHT MODE.
Device: Desktop
```

### 3-7. Financial Reports (Dark)
```
Create a FINANCIAL REPORTS screen for BCL admin (DARK MODE).

- **Page Title**: "Financial Reports"
- **Date Range Picker**: "February 2026"
- **Revenue Cards** (4-column):
  * Total Revenue: "₩45,890,000"
  * New Members: "₩12,400,000"
  * Renewals: "₩28,600,000"
  * Other Income: "₩4,890,000"
- **Revenue Trend Chart**: Area graph (orange gradient, 30 days)
- **Payment Methods**: Pie chart (Card 65%, Transfer 25%, Cash 10%)
- **Recent Transactions Table**:
  * Columns: Date, Member, Type, Amount, Status
  * 10 rows with status badges (Completed/Pending)
- **Actions**: "Export Excel", "Generate PDF Report"
- **Sidebar**: Finance > Reports (active/orange)

Theme: Dark, professional charts
Device: Desktop
```

### 3-8. Financial Reports (Light)
```
Same as 3-7 but LIGHT MODE.
Device: Desktop
```

### 3-9. CRM & Announcements (Dark)
```
Create a CRM & ANNOUNCEMENTS screen for BCL admin (DARK MODE).

- **Page Title**: "CRM & Announcements"
- **Tabs**: Announcements (active), Messages, Auto-Email
- **Create Panel** (left):
  * Title input
  * Rich text editor
  * Target Audience: "All Members" / "Specific Groups" dropdown
  * Schedule: "Publish Now" / "Schedule for later"
  * "Publish" button (orange)
- **Recent Announcements List** (right):
  * "New class schedule - Mar 1" | Published | View stats
  * "Holiday closure: Feb 20-22" | Scheduled | Edit
  * "Nutrition workshop this Sat" | Draft | Continue editing
- **Member Targeting Stats**: "342 members will receive this"
- **Sidebar**: CRM > Notices (active/orange)

Theme: Dark
Device: Desktop
```

### 3-10. CRM & Announcements (Light)
```
Same as 3-9 but LIGHT MODE.
Device: Desktop
```

---

## 📺 4. TV/Kiosk Display Screens (Fullscreen Template 기반)

### 4-1. Kiosk Idle Screen (Dark)
```
Create a KIOSK IDLE welcome screen for BCL entrance (DARK MODE).
Optimized for large displays (1920x1080).

- **Background**: Pure black (#000000)
- **BCL Logo**: Large, centered top
- **Main Heading**: "Welcome to BCL" (massive bold Lexend)
- **Subheading**: "Scan Your QR Code to Check-in"
- **QR Scanner Area**: Large animated placeholder (glowing orange border)
- **Instructions**: 
  * "1. Open BCL app"
  * "2. Tap Check-in tab"
  * "3. Show QR code to camera"
- **Today's Stats** (bottom):
  * "Today's Check-ins: 142"
  * "Now Training: 28" (live pulse)
- **Clock**: Digital time & date (top right)

Theme: Pure black for TV
Device: Desktop (Fullscreen)
Font Size: Extra large for 3-5m viewing
```

### 4-2. Kiosk Idle Screen (Light)
```
Same as 4-1 but LIGHT MODE (for bright environments).
Background: Pure white (#FFFFFF).
Device: Desktop (Fullscreen)
```

### 4-3. Kiosk Check-in Success (Dark)
```
Create a CHECK-IN SUCCESS screen for kiosk (DARK MODE).

- **Background**: Pure black
- **Large Green Checkmark** (animated)
- **Member Name**: "John Smith" (huge text)
- **Success Message**: "You're Checked In!"
- **Today's Class Info**:
  * "CrossFit WOD - 6:00 PM"
  * "Coach: Sarah Kim"
  * "Arrive 10 min early for warmup"
- **Auto-return**: "Returning to home in 5... 4... 3..."
- **BCL Logo** (corner)

Theme: Pure black, high contrast
Device: Desktop (Fullscreen)
```

### 4-4. Kiosk Check-in Success (Light)
```
Same as 4-3 but LIGHT MODE.
Device: Desktop
```

### 4-5. TV Live Leaderboard (Dark)
```
Create a LIVE LEADERBOARD for gym TV display (DARK MODE).

- **Background**: Pure black (#000000)
- **Heading**: "Today's WOD Leaderboard"
- **WOD Details Card**:
  * "For Time: 21-15-9"
  * "Thrusters (95lbs) / Pull-ups"
- **Leaderboard Table** (extra large text):
  * Columns: Rank #, Name, Time, RX/Scaled
  * 1. Sarah Kim - 4:32 - RX (BCL Orange highlight)
  * 2. Mike Lee - 5:18 - RX
  * 3. John Smith - 6:05 - Scaled
  * ... (10 rows visible)
- **LIVE Indicator**: Red pulsing dot
- **BCL Logo** (top left)
- **Clock** (top right)

Theme: Pure black, extreme contrast
Device: Desktop (Fullscreen TV)
Font: Extra large Lexend Bold
```

### 4-6. TV Live Leaderboard (Light)
```
Same as 4-5 but LIGHT MODE.
Background: Pure white.
Device: Desktop
```

### 4-7. TV Live WOD Timer (Dark)
```
Create a LIVE WOD TIMER for gym TV (DARK MODE).

- **Background**: Pure black (#000000)
- **Heading**: "CrossFit WOD Timer"
- **WOD Description**:
  * "For Time: 21-15-9"
  * "Thrusters (95lbs) / Pull-ups"
- **MASSIVE Countdown Timer** (center):
  * "12:45" (glowing BCL Orange, huge font)
  * Start/Pause/Reset buttons (large, touch-friendly)
- **Round Indicator**: "Round 2 of 3"
- **Current Leader**: "Sarah Kim - 4:32 (Leader)"
- **BCL Logo** (corner)
- **Clock** (corner)

Theme: Pure black
Device: Desktop (Fullscreen TV)
Timer Font: 200px+
```

### 4-8. TV Live WOD Timer (Light)
```
Same as 4-7 but LIGHT MODE.
Device: Desktop
```

### 4-9. TV WOD Board (Dark)
```
Create a DAILY WOD BOARD for gym TV (DARK MODE).

- **Background**: Pure black
- **Date**: "Monday, February 17, 2026" (large)
- **Main WOD Card** (centered):
  * **Workout Type**: "Metcon"
  * **Title**: "Fran" (classic benchmark)
  * **Description**:
    - "21-15-9 reps for time:"
    - "Thrusters (95/65 lbs)"
    - "Pull-ups"
  * **Time Cap**: "15 minutes"
  * **Scaling Options**:
    - RX: As prescribed
    - Scaled: 75/55 lbs, Jumping pull-ups
    - Beginner: 45/35 lbs, Ring rows
- **Coach Notes**: "Focus on breathing during thrusters"
- **Warmup Section**: "10 min EMOM: 5 thrusters + 5 pull-ups"
- **BCL Logo** (corner)

Theme: Pure black, high contrast orange accents
Device: Desktop (Fullscreen)
```

### 4-10. TV WOD Board (Light)
```
Same as 4-9 but LIGHT MODE.
Device: Desktop
```

---

## 🏋️ 5. Coach App Screens (Mobile Template 기반)

### 5-1. Coach Dashboard (Dark)
```
Create a COACH DASHBOARD for BCL Portal (DARK MODE).
Mobile app with bottom nav.

- **Header**: "Coach Sarah Kim" + profile photo
- **Today's Schedule Card**:
  * "Next Class: CrossFit WOD"
  * Time: "6:00 PM - 7:00 PM"
  * Booked: "12/15 members"
  * "View Roster" button (orange)
- **Quick Stats**:
  * Classes Today: 3
  * Total Students: 45
  * Avg Rating: 4.8★
- **Recent Feedback** (2 items):
  * "Great coaching today!" - John S.
  * "Very motivating session" - Sarah K.
- **Bottom Nav**: Home (active/orange), Schedule, Members, Race, Profile

Theme: Dark, glassmorphism
Device: Mobile
```

### 5-2. Coach Class Roster (Dark)
```
Create a CLASS ROSTER screen for coaches (DARK MODE).

- **Header**: "CrossFit WOD - 6:00 PM"
- **Class Info**:
  * Time: "6:00 PM - 7:00 PM"
  * Capacity: "12/15 booked"
  * Status: "Check-in Open" (green badge)
- **Member List** (scrollable):
  * John Smith | Checked-in ✓ (green)
  * Sarah Lee | Booked (white)
  * Mike Park | Waitlist (gray)
  * ... (15 members)
- **Quick Actions**:
  * "Mark All Present"
  * "Send Class Reminder"
  * "Cancel Class"
- **Bottom Nav**: Schedule (active)

Theme: Dark
Device: Mobile
```

### 5-3. Coach Member Notes (Dark)
```
Create a MEMBER NOTES screen for coaches (DARK MODE).

- **Header**: "John Smith" + profile photo
- **Member Stats**:
  * Total Classes: 48
  * Attendance Rate: 92%
  * Recent PRs: 3
- **Coaching Notes** (timeline):
  * Feb 16: "Improved squat depth, watch for knee valgus"
  * Feb 10: "Back squat PR: 100kg!"
  * Feb 3: "Working on kipping pull-ups"
- **Add Note Section**:
  * Text input
  * "Save Private Note" button (orange)
- **Movement PRs Grid**:
  * Back Squat: 100kg
  * Deadlift: 120kg
  * Snatch: 60kg
- **Bottom Nav**: Members (active)

Theme: Dark
Device: Mobile
```

---

## 📝 사용 후 작업

생성 완료 후:
1. `mcp_StitchMCP_list_screens` 호출
2. Screen ID와 Title로 매핑 문서 업데이트
3. `.docs/stitch-screens-mapping.md` 완성

**예상 총 화면 수**: ~60개 (Dark/Light 쌍 포함)
