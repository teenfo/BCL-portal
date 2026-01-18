<?= $this->extend('auth/layout') ?>

<?= $this->section('title') ?>
<?= lang('Auth.login') ?>
<?= $this->endSection() ?>

<?= $this->section('main') ?>

<div class="card bg-surface shadow-card p-4 p-md-5">
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 text-onPrimary">
            <i class="fas fa-lock fa-2x"></i>
        </div>
        <h2 class="text-2xl font-bold text-fg">
            <?= lang('Auth.login') ?>
        </h2>
        <p class="text-muted mt-2">BCL Portal 관리자 로그인</p>
    </div>

    <?php if (session('error') !== null): ?>
        <div class="alert alert-danger rounded-xl mb-4" role="alert">
            <?= session('error') ?>
        </div>
    <?php elseif (session('errors') !== null): ?>
        <div class="alert alert-danger rounded-xl mb-4" role="alert">
            <?php if (is_array(session('errors'))): ?>
                <?php foreach (session('errors') as $error): ?>
                    <?= $error ?>
                    <br>
                <?php endforeach ?>
            <?php else: ?>
                <?= session('errors') ?>
            <?php endif ?>
        </div>
    <?php endif ?>

    <?php if (session('message') !== null): ?>
        <div class="alert alert-success rounded-xl mb-4" role="alert">
            <?= session('message') ?>
        </div>
    <?php endif ?>

    <form action="<?= url_to('login') ?>" method="post">
        <?= csrf_field() ?>

        <!-- Email -->
        <div class="mb-4">
            <label for="floatingEmailInput" class="form-label text-fg font-medium mb-2">
                <?= lang('Auth.email') ?>
            </label>
            <input type="email" class="form-control" id="floatingEmailInput" name="email" inputmode="email"
                autocomplete="email" placeholder="<?= lang('Auth.email') ?>" value="<?= old('email') ?>" required>
        </div>

        <!-- Password -->
        <div class="mb-4">
            <label for="floatingPasswordInput" class="form-label text-fg font-medium mb-2">
                <?= lang('Auth.password') ?>
            </label>
            <input type="password" class="form-control" id="floatingPasswordInput" name="password" inputmode="text"
                autocomplete="current-password" placeholder="<?= lang('Auth.password') ?>" required>
        </div>

        <!-- Remember me -->
        <?php if (setting('Auth.sessionConfig')['allowRemembering']): ?>
            <div class="mb-4 form-check">
                <input type="checkbox" name="remember" class="form-check-input" id="rememberCheck" <?php if (old('remember')): ?> checked
                <?php endif ?>>
                <label class="form-check-label text-muted" for="rememberCheck">
                    <?= lang('Auth.rememberMe') ?>
                </label>
            </div>
        <?php endif; ?>

        <div class="d-grid gap-2 mt-8">
            <button type="submit" class="btn btn-primary btn-lg shadow-sm">
                <?= lang('Auth.login') ?>
            </button>
        </div>

        <?php if (setting('Auth.allowMagicLinkLogins')): ?>
            <p class="text-center mt-4 mb-0">
                <?= lang('Auth.forgotPassword') ?>
                <a href="<?= url_to('magic-link') ?>" class="text-primary font-bold text-decoration-none">
                    <?= lang('Auth.useMagicLink') ?>
                </a>
            </p>
        <?php endif ?>

        <?php if (setting('Auth.allowRegistration')): ?>
            <p class="text-center mt-3 mb-0">
                <?= lang('Auth.needAccount') ?>
                <a href="<?= url_to('register') ?>" class="text-primary font-bold text-decoration-none text-sm">
                    <?= lang('Auth.register') ?>
                </a>
            </p>
        <?php endif ?>

    </form>
</div>

<?= $this->endSection() ?>