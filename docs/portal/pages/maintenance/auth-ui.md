# Authentication (Shield) Documentation

## Overview
The authentication system is powered by **CodeIgniter Shield**. To maintain visual consistency with the **Iron Pulse** design system, we have overridden the default Shield views.

## Component Structure
### 1. Unified Auth Layout
- **File**: `portal/app/Views/auth/layout.php`
- **Purpose**: A simplified, centered layout for all authentication-related pages (Login, Register, Magic Link).
- **Features**:
  - Deep slate background with glow effect.
  - Centered surface card with `rounded-2xl` and `shadow-card`.
  - Integration with BCL semantic color tokens.
  - Lexend typography.

### 2. Overridden Views
All custom views are located in `portal/app/Views/auth/`:
- **Login**: `login.php`
- **Register**: `register.php`
- **Magic Link**: `magic_link_form.php`

## Configuration
The paths to these views are configured in `portal/app/Config/Auth.php`:

```php
public array $views = [
    'login'              => 'auth/login',
    'register'           => 'auth/register',
    'layout'             => 'auth/layout',
    'magic-link-login'   => 'auth/magic_link_form',
    'magic-link-message' => 'auth/magic_link_message',
    // ...
];
```

## UI Rules for Auth Pages
- **Root**: `bg-bg min-h-screen text-fg flex items-center justify-center`
- **Card**: `bg-surface border border-border rounded-2xl shadow-card p-8`
- **Inputs**: `bg-surface2 border border-border rounded-xl text-fg focus:border-primary`
- **Buttons**: `btn-primary btn-lg rounded-xl shadow-sm`
- **Accent**: Primary orange is used for header icons and prominent links.

## Access Control
- All pages under `/admin/*` are protected by Shield's `auth` filter.
- Default redirect after successful login is configured in `Auth.php` or `Auth::loginRedirect()`.
