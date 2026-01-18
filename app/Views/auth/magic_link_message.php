<?= $this->extend('auth/layout') ?>

<?= $this->section('title') ?>
<?= lang('Auth.useMagicLink') ?>
<?= $this->endSection() ?>

<?= $this->section('main') ?>

<div class="card bg-surface shadow-card p-4 p-md-5">
    <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 text-onPrimary">
            <i class="fas fa-paper-plane fa-2x"></i>
        </div>
        <h2 class="text-2xl font-bold text-fg">
            <?= lang('Auth.useMagicLink') ?>
        </h2>
        <p class="text-muted mt-2">
            <?= lang('Auth.checkEmail') ?>
        </p>
    </div>

    <div class="alert alert-success rounded-xl mb-8" role="alert">
        <?= lang('Auth.magicLinkDetails') ?>
    </div>

    <div class="text-center">
        <a href="<?= url_to('login') ?>" class="btn btn-primary btn-lg w-100 shadow-sm">
            <?= lang('Auth.backToLogin') ?>
        </a>
    </div>
</div>

<?= $this->endSection() ?>