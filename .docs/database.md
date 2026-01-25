# Database Schema Documentation

This document serves as the Single Source of Truth (SSOT) for the BCL Portal database schema.

## Overview
- **Database**: PostgreSQL (via Supabase)
- **Schema**: `public`
- **Auth**: Managed by Supabase Auth (`auth.users`)

---

## Tables

### 1. facilities
Stores information about physical gym branches.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `name` | `text` | - | No | Branch name |
| `address` | `text` | - | Yes | Physical address |
| `operating_hours` | `text` | - | Yes | Business hours |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

### 2. members
Core user table for gym members, linked to Auth users.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `user_id` | `uuid` | - | Yes | FK -> `auth.users.id` |
| `name` | `text` | - | No | Full name |
| `email` | `text` | - | No | Contact email (Unique) |
| `phone` | `text` | - | Yes | Contact phone |
| `joined_date` | `date` | `CURRENT_DATE` | Yes | Membership start date |
| `status` | `text` | `'Active'` | Yes | Membership status |
| `plan` | `text` | `'Iron Pulse Lite'` | Yes | Current plan |
| `credits` | `int4` | `0` | Yes | Booking credits |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

### 3. coaches
Staff and instructors.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `name` | `text` | - | No | Full name |
| `email` | `text` | - | No | Contact email |
| `specialty` | `text` | - | Yes | Area of expertise |
| `status` | `text` | `'Active'` | Yes | Employment status |
| `joined_date` | `date` | `CURRENT_DATE` | Yes | Start date |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

### 4. sessions
Class schedules and booking slots.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `title` | `text` | - | No | Class title |
| `coach_name` | `text` | - | Yes | Instructor name |
| `start_time` | `timestamptz` | - | No | Start timestamp |
| `end_time` | `timestamptz` | - | No | End timestamp |
| `intensity` | `text` | - | Yes | Difficulty level |
| `capacity` | `int4` | `20` | Yes | Max participants |
| `enrolled` | `int4` | `0` | Yes | Current enrollment count |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

### 5. attendance
Check-in records for members.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `member_id` | `uuid` | - | Yes | FK -> `members.id` |
| `member_name` | `text` | - | Yes | Cached member name |
| `time` | `timestamptz` | `now()` | Yes | Check-in timestamp |
| `facility` | `text` | - | Yes | Branch name |
| `status` | `text` | `'Present'` | Yes | Attendance status |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

### 6. transactions
Payment and billing history.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` | - | No | Primary Key (External TX ID) |
| `member_id` | `uuid` | - | Yes | FK -> `members.id` |
| `member_email` | `text` | - | Yes | Cached email |
| `amount` | `numeric` | - | Yes | Transaction amount |
| `status` | `text` | `'completed'` | Yes | Payment status |
| `date` | `date` | `CURRENT_DATE` | Yes | Transaction date |
| `method` | `text` | - | Yes | Payment method (Card, etc) |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

### 7. notices
Announcements and news functionality.

| Column | Type | Default | Nullable | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | No | Primary Key |
| `title` | `text` | - | No | Announcement title |
| `category` | `text` | `'General'` | Yes | e.g. General, Operations |
| `date` | `date` | `CURRENT_DATE` | Yes | Publication date |
| `author` | `text` | - | Yes | Author name |
| `views` | `int4` | `0` | Yes | View count |
| `content` | `text` | - | Yes | Body content |
| `created_at` | `timestamptz` | `now()` | Yes | Creation timestamp |

---

## Enum Types & Constants

### Member Plans
- `Iron Pulse Lite`
- `Iron Pulse Elite`
- `Iron Pulse Pro`

### Member Status
- `Active`
- `Inactive`
- `Suspended`

### Transaction Status
- `completed`
- `pending`
- `failed`
