# Database Seeding Guide

This document contains the initial seed data used to populate the BCL Portal database for development and testing purposes.

## Login Information (Auth)

Two default accounts have been created for testing.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Member** | `alice@test.com` | `3206#@KimCHO` |
| **Admin** | `admin@bcl.com` | `3206#@KimCHO` |

> [!NOTE]
> These users are created directly in the `auth.users` table with pre-hashed passwords using the `pgcrypto` extension.

## Core Tables & Mock Data

### 1. Facilities
Initial branch information.
```sql
INSERT INTO public.facilities (name, address, operating_hours) VALUES
('Central Branch', '123 Fitness Ave, Seoul', '06:00 AM - 11:00 PM'),
('West Side Lab', '456 Power Blvd, Seoul', '07:00 AM - 10:00 PM');
```

### 2. Coaches
Staff and instructors.
```sql
INSERT INTO public.coaches (name, email, specialty, status) VALUES
('Mark Wilson', 'mark@bcl.com', 'HIIT & Strength', 'Active'),
('Sarah Chen', 'sarah@bcl.com', 'Yoga & Mobility', 'Active'),
('David Park', 'david@bcl.com', 'Boxing', 'Active');
```

### 3. Notices
Initial announcements.
```sql
INSERT INTO public.notices (title, category, author, content) VALUES
('Welcome to BCL Portal', 'General', 'Admin', 'Welcome to our new digital ecosystem. Manage your fitness journey here.'),
('Lunar New Year Schedule', 'Operations', 'Admin', 'Please check the app for consolidated holiday class times.');
```

### 4. Sessions
Mock class schedule for the current period.
```sql
INSERT INTO public.sessions (title, coach_name, start_time, end_time, intensity, capacity, enrolled) VALUES
('HIIT Cardio Elite', 'Mark Wilson', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour', 'High', 20, 12),
('Morning Yoga Flow', 'Sarah Chen', NOW() + INTERVAL '1 day 2 hours', NOW() + INTERVAL '1 day 3 hours', 'Low', 15, 15),
('Strength Fundamentals', 'Mark Wilson', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 1 hour', 'Medium', 10, 5);
```

## How to Seed
To reset and re-seed your local or production database, you can execute the compiled SQL script via the Supabase Dashboard SQL Editor or using the MCP tool.

> [!IMPORTANT]
> Ensure that `auth.users` references are handled correctly if you link members to actual authentication accounts.
