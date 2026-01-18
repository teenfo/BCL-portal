<?= $this->extend('auth/layout') ?>

<?= $this->section('title') ?>
<?= lang('Auth.register') ?>
<?= $this->endSection() ?>

<?= $this->section('main') ?>

<div class="card bg-surface shadow-card p-4 p-md-5">
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 text-onPrimary">
            <i class="fas fa-user-plus fa-2x"></i>
        </div>
        <h2 class="text-2xl font-bold text-fg">
            <?= lang('Auth.register') ?>
        </h2>
        <p class="text-muted mt-2">BCL Portal 관리자 계정 생성</p>
    </div>

    <?php if (session('error') !== null): ?>
        <div class="alert alert-danger rounded-xl mb-4" role="alert">
            <?= esc(session('error')) ?>
        </div>
    <?php elseif (session('errors') !== null): ?>
        <div class="alert alert-danger rounded-xl mb-4" role="alert">
            <?php if (is_array(session('errors'))): ?>
                <?php foreach (session('errors') as $error): ?>
                    <?= esc($error) ?>
                    <br>
                <?php endforeach ?>
            <?php else: ?>
                <?= esc(session('errors')) ?>
            <?php endif ?>
        </div>
    <?php endif ?>

    <form action="<?= url_to('register') ?>" method="post">
        <?= csrf_field() ?>

        <!-- Email -->
        <div class="mb-4">
            <label for="floatingEmailInput" class="form-label text-fg font-medium mb-2">
                <?= lang('Auth.email') ?>
            </label>
            <input type="email" class="form-control" id="floatingEmailInput" name="email" inputmode="email"
                autocomplete="email" placeholder="<?= lang('Auth.email') ?>" value="<?= old('email') ?>" required>
        </div>

        <!-- Username -->
        <div class="mb-4">
            <label for="floatingUsernameInput" class="form-label text-fg font-medium mb-2">
                <?= lang('Auth.username') ?>
            </label>
            <input type="text" class="form-control" id="floatingUsernameInput" name="username" inputmode="text"
                autocomplete="username" placeholder="<?= lang('Auth.username') ?>" value="<?= old('username') ?>"
                required>
        </div>

        <!-- Password -->
        <div class="mb-4">
            <label for="floatingPasswordInput" class="form-label text-fg font-medium mb-2">
                <?= lang('Auth.password') ?>
            </label>
            <input type="password" class="form-control" id="floatingPasswordInput" name="password" inputmode="text"
                autocomplete="new-password" placeholder="<?= lang('Auth.password') ?>" required>
        </div>

        <!-- Password (Again) -->
        <div class="mb-5">
            <label for="floatingPasswordConfirmInput" class="form-label text-fg font-medium mb-2">
                <?= lang('Auth.passwordConfirm') ?>
            </label>
            <input type="password" class="form-control" id="floatingPasswordConfirmInput" name="password_confirm"
                inputmode="text" autocomplete="new-password" placeholder="<?= lang('Auth.passwordConfirm') ?>" required>
        </div>

        <div class="d-grid gap-2 mt-8">
            <button type="submit" class="btn btn-primary btn-lg shadow-sm">
                <?= lang('Auth.register') ?>
            </button>
        </div>

        <p class="text-center mt-6 mb-0 text-sm">
            <?= lang('Auth.haveAccount') ?>
            <a href="<?= url_to('login') ?>" class="text-primary font-bold text-decoration-none">
                <?= lang('Auth.login') ?>
            </a>
        </p>

    </form>
</div>

<?= $this->endSection() ?>