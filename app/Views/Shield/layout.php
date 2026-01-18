<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <title>
        <?= esc($title ?? 'BCL Login') ?>
    </title>

    <!-- Google Fonts: Lexend -->
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- SB Admin (BS5) CSS -->
    <link href="https://cdn.jsdelivr.net/npm/startbootstrap-sb-admin@7.0.7/dist/css/styles.css" rel="stylesheet" />

    <!-- Font Awesome -->
    <script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>

    <!-- Tailwind CDN -->
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

        .card {
            border: 1px solid rgb(var(--border));
            border-radius: 1.5rem;
            box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.1);
        }

        .form-control {
            border-radius: 0.75rem;
            padding: 0.75rem 1rem;
            border-color: rgb(var(--border));
            background-color: rgb(var(--surface-2));
            color: rgb(var(--fg));
        }

        .form-control:focus {
            background-color: rgb(var(--surface-2));
            border-color: rgb(var(--primary));
            box-shadow: 0 0 0 0.25 multilayer rgba(var(--primary), 0.1);
            color: rgb(var(--fg));
        }

        .btn-primary {
            border-radius: 0.75rem;
            padding: 0.75rem 1rem;
            font-weight: 600;
        }
    </style>

    <?= $this->renderSection('styles') ?>
</head>

<body class="bg-bg text-fg min-h-screen flex items-center justify-center p-4">

    <div class="w-full max-w-md">
        <?= $this->renderSection('main') ?>

        <div class="text-center mt-6 text-muted text-sm">
            &copy;
            <?= date('Y') ?> BCL Portal. All rights reserved.
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
        crossorigin="anonymous"></script>

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