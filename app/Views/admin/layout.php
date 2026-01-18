<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title><?= esc($title ?? 'BCL Admin') ?></title>

    <!-- Google Fonts: Lexend -->
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- SB Admin (BS5) CSS -->
    <link href="https://cdn.jsdelivr.net/npm/simple-datatables@7.1.2/dist/style.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/startbootstrap-sb-admin@7.0.7/dist/css/styles.css" rel="stylesheet" />

    <!-- Font Awesome -->
    <script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>

    <!-- Tailwind CDN (Optional for custom utility classes) -->
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

    <!-- BCL Portal Color System v2 -->
    <script src="<?= base_url('assets/theme/tailwind-config.js') ?>"></script>
    <link rel="stylesheet" href="<?= base_url('assets/theme/colors.css') ?>">

    <style>
        body {
            font-family: 'Lexend', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* SB Admin BS5 semantic tokens integration */
        :root {
            --bs-primary: rgb(var(--primary));
            --bs-primary-rgb: var(--primary);
        }

        .bg-primary {
            background-color: rgb(var(--primary)) !important;
        }

        .text-primary {
            color: rgb(var(--primary)) !important;
        }

        .bg-surface {
            background-color: rgb(var(--surface)) !important;
        }

        .bg-surface2 {
            background-color: rgb(var(--surface-2)) !important;
        }

        .sb-sidenav-light {
            background-color: rgb(var(--surface));
            color: rgb(var(--fg));
        }

        .sb-sidenav-light .sb-sidenav-footer {
            background-color: rgb(var(--surface-2));
        }

        /* Mobile Bottom Nav Fix */
        @media (max-width: 991.98px) {
            #layoutSidenav_content {
                padding-bottom: 70px;
            }
        }

        .bottom-nav {
            height: 70px;
            box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
            z-index: 1030;
        }

        /* Card stylings */
        .card {
            border: 1px solid rgb(var(--border));
            border-radius: 1rem;
            box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
        }

        .card-header {
            background-color: rgb(var(--surface-2));
            border-bottom: 1px solid rgb(var(--border));
            border-top-left-radius: 1rem !important;
            border-top-right-radius: 1rem !important;
        }

        /* Fix Tailwind conflict with Bootstrap collapse */
        .collapse {
            visibility: visible !important;
        }
    </style>

    <?= $this->renderSection('styles') ?>
</head>

<body class="sb-nav-fixed bg-bg text-fg">

    <?= $this->include('admin/partials/_topbar') ?>

    <div id="layoutSidenav">
        <div id="layoutSidenav_nav">
            <?= $this->include('admin/partials/_sidebar') ?>
        </div>
        <div id="layoutSidenav_content">
            <main>
                <div class="container-fluid px-4">
                    <h1 class="mt-4"><?= esc($pageTitle ?? '') ?></h1>
                    <?php if (isset($breadcrumb)): ?>
                        <ol class="breadcrumb mb-4">
                            <?php foreach ($breadcrumb as $label => $link): ?>
                                <li class="breadcrumb-item <?= empty($link) ? 'active' : '' ?>">
                                    <?php if (!empty($link)): ?>
                                        <a href="<?= base_url($link) ?>"><?= esc($label) ?></a>
                                    <?php else: ?>
                                        <?= esc($label) ?>
                                    <?php endif; ?>
                                </li>
                            <?php endforeach; ?>
                        </ol>
                    <?php endif; ?>

                    <?= $this->renderSection('content') ?>
                </div>
            </main>

            <?= $this->include('admin/partials/_footer') ?>
        </div>
    </div>

    <!-- Mobile Bottom Navigation -->
    <div
        class="bottom-nav fixed-bottom bg-surface border-top border-border d-flex d-lg-none justify-content-around align-items-center px-2">
        <a href="<?= base_url('/admin/dashboard') ?>"
            class="d-flex flex-column align-items-center text-decoration-none py-2 gap-1 <?= (uri_string() == 'admin/dashboard' || uri_string() == 'admin') ? 'text-primary' : 'text-muted' ?>">
            <i class="fas fa-home fs-5"></i>
            <span style="font-size: 10px; font-weight: 600;">HOME</span>
        </a>
        <a href="<?= base_url('/admin/members') ?>"
            class="d-flex flex-column align-items-center text-decoration-none py-2 gap-1 <?= str_contains(uri_string(), 'admin/members') ? 'text-primary' : 'text-muted' ?>">
            <i class="fas fa-users fs-5"></i>
            <span style="font-size: 10px; font-weight: 600;">MEMBERS</span>
        </a>
        <a href="<?= base_url('/admin/sessions/schedule') ?>"
            class="d-flex flex-column align-items-center text-decoration-none py-2 gap-1 <?= str_contains(uri_string(), 'admin/sessions/schedule') ? 'text-primary' : 'text-muted' ?>">
            <i class="fas fa-calendar-alt fs-5"></i>
            <span style="font-size: 10px; font-weight: 600;">SCHEDULE</span>
        </a>
        <a href="<?= base_url('/admin/settings/facility') ?>"
            class="d-flex flex-column align-items-center text-decoration-none py-2 gap-1 <?= str_contains(uri_string(), 'admin/settings') ? 'text-primary' : 'text-muted' ?>">
            <i class="fas fa-cog fs-5"></i>
            <span style="font-size: 10px; font-weight: 600;">SETTINGS</span>
        </a>
    </div>

    <!-- Logout Modal -->
    <div class="modal fade" id="logoutModal" tabindex="-1" aria-labelledby="logoutModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-surface border-border">
                <div class="modal-header border-border">
                    <h5 class="modal-title" id="logoutModalLabel">로그아웃 하시겠습니까?</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-muted">
                    세션을 종료하려면 아래 '로그아웃' 버튼을 클릭하세요.
                </div>
                <div class="modal-footer border-border">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">취소</button>
                    <a class="btn btn-primary" href="<?= base_url('/logout') ?>">로그아웃</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/startbootstrap-sb-admin@7.0.7/dist/js/scripts.js"></script>
    <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>

    <?= $this->renderSection('scripts') ?>

    <script>
        // Theme preference
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    </script>
</body>

</html>