<!-- Topbar -->
<nav class="sb-topnav navbar navbar-expand navbar-light bg-surface border-bottom border-border">
    <!-- Navbar Brand-->
    <a class="navbar-brand ps-3 text-primary fw-bold" href="<?= base_url('/admin/dashboard') ?>">
        <i class="fas fa-dumbbell me-2 rotate-n-15"></i>
        BCL Admin
    </a>
    <!-- Sidebar Toggle-->
    <button class="btn btn-link btn-sm order-1 order-lg-0 me-4 me-lg-0 text-fg" id="sidebarToggle" href="#!">
        <i class="fas fa-bars fs-4"></i>
    </button>

    <!-- Page Title (Desktop) -->
    <div class="d-none d-md-inline-block form-inline ms-2 me-auto">
        <h1 class="h5 mb-0 text-fg fw-bold"><?= esc($pageTitle ?? '') ?></h1>
    </div>

    <!-- Navbar-->
    <?php $user = auth()->user(); ?>
    <ul class="navbar-nav ms-auto ms-md-0 me-3 me-lg-4">
        <li class="nav-item dropdown">
            <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" id="navbarDropdown" href="#"
                role="button" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="d-none d-lg-inline text-muted small" id="navbarUserName">
                    <?= esc($user->username ?? '관리자') ?>
                </span>
                <div id="navbarUserAvatar"
                    class="rounded-circle overflow-hidden bg-primarySoft text-primary d-flex align-items-center justify-content-center shadow-sm"
                    style="width: 32px; height: 32px;">
                    <?php if ($user && $user->avatar): ?>
                        <img src="<?= base_url($user->avatar) ?>" alt="Avatar" class="w-100 h-100"
                            style="object-fit: cover;">
                    <?php else: ?>
                        <i class="fas fa-user-alt small"></i>
                    <?php endif; ?>
                </div>
            </a>
            <ul class="dropdown-menu dropdown-menu-end shadow border-border" aria-labelledby="navbarDropdown">
                <li><a class="dropdown-item text-fg" href="<?= base_url('admin/members/' . ($user->id ?? '')) ?>">
                        <i class="fas fa-user fa-sm fa-fw me-2 text-muted"></i>Profile
                    </a></li>
                <li><a class="dropdown-item text-fg" href="#!">
                        <i class="fas fa-cogs fa-sm fa-fw me-2 text-muted"></i>Settings
                    </a></li>
                <li>
                    <hr class="dropdown-divider border-border" />
                </li>
                <li><a class="dropdown-item text-fg" href="#" data-bs-toggle="modal" data-bs-target="#logoutModal">
                        <i class="fas fa-sign-out-alt fa-sm fa-fw me-2 text-muted"></i>Logout
                    </a></li>
            </ul>
        </li>
    </ul>
</nav>