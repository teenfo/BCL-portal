# Database Schema Documentation

This document serves as the Single Source of Truth (SSOT) for the BCL Portal database schema.

---

## Tables

### 1. facility_settings
Stores physical branch info and global operating settings.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `int4` | - | No | PK (usually 1) |
| `name` | `text` | - | No | Branch name |
| `address` | `text` | - | Yes | Physical address |
| `phone` | `text` | - | Yes | Phone number |
| `open_time` | `time` | `'06:00'` | Yes | Opening hours |
| `close_time` | `time` | `'23:00'` | Yes | Closing hours |

### 2. members
Core user table for gym members.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `user_id` | `uuid` | - | Yes | FK -> `auth.users.id` |
| `name` | `text` | - | No | Full name |
| `email` | `text` | - | No | Contact email |
| `membership_type`| `text` | - | Yes | e.g. Iron Pulse Elite |
| `status` | `text` | `'Active'` | Yes | Active, Inactive, etc. |
| `end_date` | `date` | - | Yes | Membership expiry |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

### 3. membership_plans
Available membership products.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `name` | `text` | - | No | Plan name |
| `price` | `numeric` | - | No | Monthly price |
| `status` | `text` | `'Active'` | Yes | Active, Disabled |

### 4. sessions
Class schedules and booking slots.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `title` | `text` | - | No | Class title |
| `coach_name` | `text` | - | Yes | Instructor name |
| `start_time` | `timestamptz` | - | No | Start timestamp |
| `duration` | `int4` | `60` | Yes | Minutes |
| `capacity` | `int4` | `20` | Yes | Max participants |
| `enrolled` | `int4` | `0` | Yes | Current count |

### 5. reservations
Member class bookings.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `member_id` | `uuid` | - | No | FK -> `members.id` |
| `session_id` | `uuid` | - | No | FK -> `sessions.id` |
| `status` | `text` | `'Confirmed'`| Yes | Confirmed, Canceled |

### 6. checkins
Kiosk and app check-in records.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `member_id` | `uuid` | - | Yes | FK -> `members.id` |
| `checkin_time` | `timestamptz` | `now()` | Yes | Timestamp |

### 7. support_tickets
User inquiries and CS.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `title` | `text` | - | No | Subject |
| `status` | `text` | `'Open'` | Yes | Open, Resolved |

### 8. audit_logs
System action logs.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `action` | `text` | - | No | Action name |
| `admin_id` | `uuid` | - | Yes | Who did it |
| `created_at` | `timestamptz` | `now()` | Yes | Event time |

### 9. coaches
Staff and instructors.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `name` | `text` | - | No | Full name |
| `email` | `text` | - | No | Contact email |
| `specialty` | `text` | - | Yes | Area of expertise |
| `status` | `text` | `'Active'` | Yes | Employment status |

### 10. notices
Announcements and news.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `title` | `text` | - | No | Announcement title |
| `content` | `text` | - | Yes | Body content |
| `author` | `text` | - | Yes | Author name |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |
