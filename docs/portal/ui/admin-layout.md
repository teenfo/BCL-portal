# Admin Layout & Topbar

## Overview
BCL Admin Portals's layout is designed to be responsive, consistent, and personalized. It uses a combination of **Bootstrap 5**, **Tailwind CSS**, and **Semantic Color Tokens**.

## Layout Components
The layout is split into several partials for maintainability:
- **Layout Shell**: `portal/app/Views/admin/layout.php`
- **Sidebar**: `portal/app/Views/admin/partials/_sidebar.php`
- **Topbar**: `portal/app/Views/admin/partials/_topbar.php`
- **Footer**: `portal/app/Views/admin/partials/_footer.php`

## Topbar Personalization
The Topbar (`_topbar.php`) provides essential navigation and displays the currently logged-in user's information.

### Features
1. **Username Display**: Dynamically displays `auth()->user()->username`.
2. **User Avatar**: 
   - Displays the user's avatar image if available (`auth()->user()->avatar`).
   - Falls back to a default `fas fa-user-alt` icon if no avatar is set.
   - Styled with `rounded-circle border-border overflow-hidden`.
3. **Personal Menu**:
   - **Profile**: Links to the user's specific member profile page (`/admin/members/{id}`).
   - **Settings**: Links to internal configuration settings.
   - **Logout**: Triggers the logout confirmation modal.

### Code Implementation
```php
<?php $user = auth()->user(); ?>
<span class="d-none d-lg-inline text-muted small">
    <?= esc($user->username ?? '관리자') ?>
</span>
<div class="rounded-circle overflow-hidden bg-primarySoft text-primary ...">
    <?php if ($user && $user->avatar): ?>
        <img src="<?= base_url($user->avatar) ?>" alt="Avatar" class="w-100 h-100" style="object-fit: cover;">
    <?php else: ?>
        <i class="fas fa-user-alt small"></i>
    <?php endif; ?>
</div>
```

## CSS Classes
- **Topbar Container**: `sb-topnav navbar bg-surface border-bottom border-border`
- **Navbar Brand**: `navbar-brand text-primary fw-bold`
- **User Dropdown**: `dropdown-menu dropdown-menu-end shadow border-border`
