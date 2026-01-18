<?= $this->extend('auth/layout') ?>

<?= $this->section('title') ?>
<?= lang('Auth.useMagicLink') ?>
<?= $this->endSection() ?>

<?= $this->section('main') ?>

<div class="card bg-surface shadow-card p-4 p-md-5">
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 text-onPrimary">
            <i class="fas fa-magic fa-2x"></i>
        </div>
        <h2 class="text-2xl font-bold text-fg">
            <?= lang('Auth.useMagicLink') ?>
        </h2>
        <p class="text-muted mt-2">이메일로 로그인 링크를 보내드립니다.</p>
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

    <form action="<?= url_to('magic-link') ?>" method="post">
        <?= csrf_field() ?>

        <!-- Email -->
        <div class="mb-4">
            <label for="floatingEmailInput" class="form-label text-fg font-medium mb-2">
                <?= lang('Auth.email') ?>
            </label>
            <input type="email" class="form-control" id="floatingEmailInput" name="email" autocomplete="email"
                placeholder="<?= lang('Auth.email') ?>" value="<?= old('email', auth()->user()->email ?? null) ?>"
                required>
        </div>

        <div class="d-grid gap-2 mt-8">
            <button type="submit" class="btn btn-primary btn-lg shadow-sm">
                <?= lang('Auth.send') ?>
            </button>
        </div>

        <p class="text-center mt-6 mb-0 text-sm">
            <a href="<?= url_to('login') ?>" class="text-primary font-bold text-decoration-none">
                <?= lang('Auth.backToLogin') ?>
            </a>
        </p>

    </form>
</div>

<?= $this->endSection() ?>