# Supabase Schema

## Tables
### Core
- users (supabase auth.users 확장)
- profiles (user profile)
- facilities (지점/시설)
- coaches (코치 프로필)

### Sessions / Booking
- sessions
- session_coaches
- bookings
- checkins

### Membership / Billing
- membership_plans
- memberships
- payments

### Content / Notification
- notices
- notifications
- support_tickets

## RLS Policy
> 모든 테이블은 **RLS 필수**, client는 anon key만 사용
